#!/usr/bin/env python3
"""
NEXUS - Plataforma de Investigación de Personas
Lanzar con: python3 app.py
"""

import os, sys, json, uuid, sqlite3, threading, webbrowser, logging, time, functools, subprocess, glob, atexit
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError
import requests as http_requests
from flask import Flask, request, jsonify, send_from_directory, send_file

BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR / "nexus-frontend" / "app" / "dist"
UPLOADS_DIR = BASE_DIR / "uploads"
DB_PATH = BASE_DIR / "nexus.db"
UPLOADS_DIR.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("nexus")
_master_password = ""

app = Flask(__name__, static_folder=str(FRONTEND_DIR))

# ─── RATE LIMITER ────────────────────────────────────────────────────────────────

class RateLimiter:
    def __init__(self, max_requests=20, window=60):
        self.max_requests = max_requests
        self.window = window
        self.requests = {}

    def is_allowed(self, key):
        now = time.time()
        self.requests.setdefault(key, [])
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window]
        if len(self.requests[key]) >= self.max_requests:
            return False
        self.requests[key].append(now)
        return True

ai_limiter = RateLimiter(max_requests=20, window=60)

# ─── ALLOWED VALUES ──────────────────────────────────────────────────────────────

ALLOWED_DELETE_TABLES = frozenset({
    "media", "events", "locations", "identifiers", "contacts", "notes", "ai_analyses", "case_subjects"
})
VALID_RISK_LEVELS = frozenset({"low", "medium", "high", "critical"})
VALID_STATUSES = frozenset({"active", "inactive", "suspect", "closed"})
VALID_EVENT_TYPES = frozenset({"activity", "meeting", "travel", "transaction",
                                "communication", "incident", "arrest", "other"})
VALID_IMPORTANCE = frozenset({"low", "normal", "high", "critical"})
VALID_LOCATION_TYPES = frozenset({"home", "work", "frequent", "temporary", "suspicious", "other"})
VALID_GENDERS = frozenset({"M", "F", "X", ""})
VALID_RELATION_TYPES = frozenset({"family", "partner", "friend", "colleague", "associate",
                                   "boss", "employee", "rival", "victim", "witness", "suspect", "other"})
VALID_RELATION_STRENGTHS = frozenset({"weak", "medium", "strong"})
VALID_NOTE_CATEGORIES = frozenset({"general", "intel", "surveillance", "financial", "legal", "personal", "hypothesis", "journal"})

# ─── VALIDATION HELPERS ──────────────────────────────────────────────────────────

def require_fields(*fields):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            data = request.json or {}
            missing = [field for field in fields if not data.get(field)]
            if missing:
                return jsonify({"error": f"Faltan campos requeridos: {', '.join(missing)}"}), 400
            return f(*args, **kwargs)
        return wrapper
    return decorator

def validate_opt(value, valid_set, field_name):
    if value and value not in valid_set:
        return jsonify({"error": f"Valor inválido para {field_name}: {value}"}), 400
    return None

# ─── DATABASE ──────────────────────────────────────────────────────────────────

DB_SCHEMA_VERSION = 3

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS _meta (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aliases TEXT DEFAULT '[]',
        dob TEXT,
        gender TEXT,
        nationality TEXT,
        status TEXT DEFAULT 'active',
        risk_level TEXT DEFAULT 'low',
        notes TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        type TEXT,
        filename TEXT,
        original_name TEXT,
        description TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        title TEXT,
        description TEXT,
        date TEXT,
        location TEXT,
        lat REAL,
        lng REAL,
        event_type TEXT DEFAULT 'activity',
        importance TEXT DEFAULT 'normal',
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        name TEXT,
        address TEXT,
        lat REAL,
        lng REAL,
        location_type TEXT DEFAULT 'frequent',
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS relations (
        id TEXT PRIMARY KEY,
        subject_a_id TEXT,
        subject_b_id TEXT,
        relation_type TEXT,
        strength TEXT DEFAULT 'medium',
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY(subject_a_id) REFERENCES subjects(id),
        FOREIGN KEY(subject_b_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS identifiers (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        id_type TEXT,
        value TEXT,
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        contact_type TEXT,
        value TEXT,
        label TEXT,
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        title TEXT,
        content TEXT,
        category TEXT DEFAULT 'general',
        is_pinned INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        analysis_type TEXT,
        content TEXT,
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_number TEXT UNIQUE,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'open',
        detective TEXT DEFAULT '',
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS case_subjects (
        case_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        PRIMARY KEY(case_id, subject_id),
        FOREIGN KEY(case_id) REFERENCES cases(id),
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        subject_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT DEFAULT '',
        user_name TEXT DEFAULT '',
        created_at TEXT,
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );
    """)

    version_row = c.execute("SELECT value FROM _meta WHERE key='schema_version'").fetchone()
    current_version = int(version_row["value"]) if version_row else 0

    if current_version < 2:
        log.info("Migrando esquema DB a v2...")

    if current_version < 3:
        log.info("Migrando esquema DB a v3 (casos + auditoría)...")
        pass

    c.execute("INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)",
              (str(DB_SCHEMA_VERSION),))
    conn.commit()
    conn.close()
    log.info("Base de datos inicializada (v%s)", DB_SCHEMA_VERSION)

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def now():
    return datetime.now().isoformat()

def uid():
    return str(uuid.uuid4())

def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

def parse_json_field(val):
    return json.loads(val) if val else []

def enrich_subject(d, conn):
    d["aliases"] = parse_json_field(d.get("aliases"))
    d["tags"] = parse_json_field(d.get("tags"))
    sid = d["id"]
    d["media_count"] = conn.execute("SELECT COUNT(*) FROM media WHERE subject_id=?", (sid,)).fetchone()[0]
    d["events_count"] = conn.execute("SELECT COUNT(*) FROM events WHERE subject_id=?", (sid,)).fetchone()[0]
    d["locations_count"] = conn.execute("SELECT COUNT(*) FROM locations WHERE subject_id=?", (sid,)).fetchone()[0]
    d["relations_count"] = conn.execute("SELECT COUNT(*) FROM relations WHERE subject_a_id=? OR subject_b_id=?", (sid, sid)).fetchone()[0]
    d["notes_count"] = conn.execute("SELECT COUNT(*) FROM notes WHERE subject_id=?", (sid,)).fetchone()[0]
    return d

def log_audit(subject_id, action, entity_type, entity_id="", details="", user_name=""):
    try:
        conn = get_db()
        conn.execute("INSERT INTO audit_log VALUES (?,?,?,?,?,?,?,?)",
                     (uid(), subject_id, action, entity_type, entity_id, details, user_name, now()))
        conn.commit()
        conn.close()
    except Exception as e:
        log.warning("Audit log error: %s", e)

def next_case_number():
    conn = get_db()
    row = conn.execute("SELECT COUNT(*) FROM cases").fetchone()
    conn.close()
    return f"NEXUS-{datetime.now().year}-{(row[0] or 0)+1:04d}"

# ─── ROUTES: SUBJECTS ─────────────────────────────────────────────────────────

@app.route("/api/subjects", methods=["GET"])
def list_subjects():
    conn = get_db()
    search = request.args.get("q", "")
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    limit = min(max(limit, 1), 200)

    if search:
        rows = conn.execute(
            "SELECT * FROM subjects WHERE name LIKE ? OR aliases LIKE ? OR tags LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?",
            (f"%{search}%", f"%{search}%", f"%{search}%", limit, offset)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM subjects ORDER BY updated_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["aliases"] = parse_json_field(d.get("aliases"))
        d["tags"] = parse_json_field(d.get("tags"))
        result.append(d)
    return jsonify(result)

@app.route("/api/subjects", methods=["POST"])
@require_fields("name")
def create_subject():
    data = request.json
    err = validate_opt(data.get("risk_level"), VALID_RISK_LEVELS, "risk_level")
    if err: return err
    err = validate_opt(data.get("status"), VALID_STATUSES, "status")
    if err: return err
    err = validate_opt(data.get("gender"), VALID_GENDERS, "gender")
    if err: return err

    sid = uid()
    t = now()
    conn = get_db()
    conn.execute(
        "INSERT INTO subjects VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (sid, data["name"], json.dumps(data.get("aliases", [])),
         data.get("dob"), data.get("gender"), data.get("nationality"),
         data.get("status", "active"), data.get("risk_level", "low"),
         data.get("notes", ""), json.dumps(data.get("tags", [])), t, t)
    )
    conn.commit()
    conn.close()
    log.info("Sujeto creado: %s (%s)", data["name"], sid)
    log_audit(sid, "create", "subject", sid, f"Creación: {data['name']}")
    return jsonify({"id": sid, "created_at": t})

@app.route("/api/subjects/<sid>", methods=["GET"])
def get_subject(sid):
    conn = get_db()
    row = conn.execute("SELECT * FROM subjects WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "No encontrado"}), 404
    d = enrich_subject(dict(row), conn)
    conn.close()
    return jsonify(d)

@app.route("/api/subjects/<sid>", methods=["PUT"])
@require_fields("name")
def update_subject(sid):
    data = request.json
    err = validate_opt(data.get("risk_level"), VALID_RISK_LEVELS, "risk_level")
    if err: return err
    err = validate_opt(data.get("status"), VALID_STATUSES, "status")
    if err: return err

    t = now()
    conn = get_db()
    conn.execute("""UPDATE subjects SET name=?, aliases=?, dob=?, gender=?, nationality=?,
        status=?, risk_level=?, notes=?, tags=?, updated_at=? WHERE id=?""",
        (data.get("name"), json.dumps(data.get("aliases", [])),
         data.get("dob"), data.get("gender"), data.get("nationality"),
         data.get("status", "active"), data.get("risk_level", "low"),
         data.get("notes", ""), json.dumps(data.get("tags", [])), t, sid))
    conn.commit()
    conn.close()
    log.info("Sujeto actualizado: %s", sid)
    return jsonify({"ok": True})

@app.route("/api/subjects/<sid>", methods=["DELETE"])
def delete_subject(sid):
    try:
        conn = get_db()
        conn.execute("DELETE FROM subjects WHERE id=?", (sid,))
        for table in ["media", "events", "locations", "identifiers", "contacts", "notes", "ai_analyses", "case_subjects"]:
            if table not in ALLOWED_DELETE_TABLES:
                continue
            conn.execute(f"DELETE FROM {table} WHERE subject_id=?", (sid,))
        conn.execute("DELETE FROM relations WHERE subject_a_id=? OR subject_b_id=?", (sid, sid))
        conn.commit()
        conn.close()
        log.info("Sujeto eliminado: %s", sid)
        log_audit(sid, "delete", "subject", sid, "Eliminación de sujeto")
        return jsonify({"ok": True})
    except Exception as e:
        log.error("Error eliminando sujeto %s: %s", sid, str(e), exc_info=True)
        return jsonify({"error": str(e)}), 500

# ─── MEDIA ────────────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/media", methods=["GET"])
def list_media(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM media WHERE subject_id=? ORDER BY is_primary DESC, created_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/media", methods=["POST"])
def upload_media(sid):
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No se envió archivo"}), 400
    if not file.filename:
        return jsonify({"error": "Nombre de archivo inválido"}), 400

    ext = Path(file.filename).suffix.lower()
    fid = uid()
    fname = f"{fid}{ext}"
    ftype = "image" if ext in [".jpg",".jpeg",".png",".gif",".webp",".bmp"] else \
            "video" if ext in [".mp4",".mov",".avi",".mkv",".webm"] else \
            "audio" if ext in [".mp3",".wav",".ogg",".m4a"] else "document"
    file.save(str(UPLOADS_DIR / fname))
    is_primary = int(request.form.get("is_primary", 0))
    if is_primary:
        conn = get_db()
        conn.execute("UPDATE media SET is_primary=0 WHERE subject_id=?", (sid,))
        conn.commit()
        conn.close()
    conn = get_db()
    conn.execute("INSERT INTO media VALUES (?,?,?,?,?,?,?,?)",
        (fid, sid, ftype, fname, file.filename, request.form.get("description",""), is_primary, now()))
    conn.commit()
    conn.close()
    log.info("Archivo subido: %s (%s) para sujeto %s", fname, ftype, sid)
    return jsonify({"id": fid, "filename": fname, "type": ftype})

@app.route("/api/media/<fid>", methods=["DELETE"])
def delete_media(fid):
    conn = get_db()
    row = conn.execute("SELECT filename FROM media WHERE id=?", (fid,)).fetchone()
    if row:
        fpath = UPLOADS_DIR / row["filename"]
        try:
            if fpath.exists():
                fpath.unlink()
        except Exception as e:
            log.warning("No se pudo borrar archivo %s: %s", row["filename"], e)
        conn.execute("DELETE FROM media WHERE id=?", (fid,))
        conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/media/<fid>/primary", methods=["POST"])
def set_primary(fid):
    conn = get_db()
    row = conn.execute("SELECT subject_id FROM media WHERE id=?", (fid,)).fetchone()
    if row:
        conn.execute("UPDATE media SET is_primary=0 WHERE subject_id=?", (row["subject_id"],))
        conn.execute("UPDATE media SET is_primary=1 WHERE id=?", (fid,))
        conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(str(UPLOADS_DIR), filename)

@app.route("/api/media/<fid>/exif", methods=["GET"])
def get_media_exif(fid):
    conn = get_db()
    row = conn.execute("SELECT filename FROM media WHERE id=?", (fid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "No encontrado"}), 404
    fpath = UPLOADS_DIR / row["filename"]
    if not fpath.exists():
        return jsonify({"error": "Archivo no encontrado"}), 404

    exif_data = {}
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        img = Image.open(fpath)
        exif = img._getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, str(tag_id))
                if isinstance(value, bytes):
                    try:
                        value = value.decode("utf-8", errors="replace")
                    except:
                        value = str(value)
                exif_data[tag] = str(value)
    except Exception:
        pass

    # GPS coordinates
    gps = {}
    if "GPSInfo" in exif_data:
        try:
            gps_raw = exif.get(34853, {})
            if gps_raw:
                def to_degrees(dms):
                    d, m, s = dms
                    return float(d) + float(m)/60 + float(s)/3600
                lat = to_degrees(gps_raw.get(2, [0,0,0]))
                lon = to_degrees(gps_raw.get(4, [0,0,0]))
                if gps_raw.get(1) == "S": lat = -lat
                if gps_raw.get(3) == "W": lon = -lon
                gps = {"lat": round(lat, 6), "lng": round(lon, 6)}
                exif_data["_gps"] = gps
        except:
            pass

    return jsonify({"exif": exif_data, "gps": gps})

@app.route("/api/subjects/<sid>/events", methods=["GET"])
def list_events(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM events WHERE subject_id=? ORDER BY date DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/events", methods=["POST"])
@require_fields("title")
def create_event(sid):
    d = request.json
    err = validate_opt(d.get("event_type"), VALID_EVENT_TYPES, "event_type")
    if err: return err
    err = validate_opt(d.get("importance"), VALID_IMPORTANCE, "importance")
    if err: return err

    eid = uid()
    conn = get_db()
    conn.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (eid, sid, d["title"], d.get("description",""), d.get("date"),
         d.get("location",""), d.get("lat"), d.get("lng"),
         d.get("event_type","activity"), d.get("importance","normal"), now()))
    conn.commit()
    conn.close()
    return jsonify({"id": eid})

@app.route("/api/events/<eid>", methods=["PUT"])
@require_fields("title")
def update_event(eid):
    d = request.json
    err = validate_opt(d.get("event_type"), VALID_EVENT_TYPES, "event_type")
    if err: return err
    err = validate_opt(d.get("importance"), VALID_IMPORTANCE, "importance")
    if err: return err

    conn = get_db()
    conn.execute("UPDATE events SET title=?,description=?,date=?,location=?,lat=?,lng=?,event_type=?,importance=? WHERE id=?",
        (d["title"],d.get("description",""),d.get("date"),d.get("location",""),
         d.get("lat"),d.get("lng"),d.get("event_type","activity"),d.get("importance","normal"),eid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/events/<eid>", methods=["DELETE"])
def delete_event(eid):
    conn = get_db()
    conn.execute("DELETE FROM events WHERE id=?", (eid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── LOCATIONS ────────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/locations", methods=["GET"])
def list_locations(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM locations WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/locations", methods=["POST"])
@require_fields("name")
def create_location(sid):
    d = request.json
    err = validate_opt(d.get("location_type"), VALID_LOCATION_TYPES, "location_type")
    if err: return err

    lid = uid()
    conn = get_db()
    conn.execute("INSERT INTO locations VALUES (?,?,?,?,?,?,?,?,?)",
        (lid, sid, d["name"], d.get("address",""), d.get("lat"), d.get("lng"),
         d.get("location_type","frequent"), d.get("notes",""), now()))
    conn.commit()
    conn.close()
    return jsonify({"id": lid})

@app.route("/api/locations/<lid>", methods=["DELETE"])
def delete_location(lid):
    conn = get_db()
    conn.execute("DELETE FROM locations WHERE id=?", (lid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── RELATIONS ────────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/relations", methods=["GET"])
def list_relations(sid):
    conn = get_db()
    rows = conn.execute("""
        SELECT r.*,
               a.name as name_a, b.name as name_b,
               a.risk_level as risk_a, b.risk_level as risk_b
        FROM relations r
        JOIN subjects a ON r.subject_a_id = a.id
        JOIN subjects b ON r.subject_b_id = b.id
        WHERE r.subject_a_id=? OR r.subject_b_id=?
        ORDER BY r.created_at DESC
    """, (sid, sid)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/relations", methods=["POST"])
@require_fields("subject_a_id", "subject_b_id", "relation_type")
def create_relation():
    d = request.json
    err = validate_opt(d.get("relation_type"), VALID_RELATION_TYPES, "relation_type")
    if err: return err
    err = validate_opt(d.get("strength"), VALID_RELATION_STRENGTHS, "strength")
    if err: return err

    rid = uid()
    conn = get_db()
    conn.execute("INSERT INTO relations VALUES (?,?,?,?,?,?,?)",
        (rid, d["subject_a_id"], d["subject_b_id"], d["relation_type"],
         d.get("strength","medium"), d.get("notes",""), now()))
    conn.commit()
    conn.close()
    return jsonify({"id": rid})

@app.route("/api/relations/<rid>", methods=["DELETE"])
def delete_relation(rid):
    conn = get_db()
    conn.execute("DELETE FROM relations WHERE id=?", (rid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── IDENTIFIERS ──────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/identifiers", methods=["GET"])
def list_identifiers(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM identifiers WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/identifiers", methods=["POST"])
@require_fields("id_type", "value")
def create_identifier(sid):
    d = request.json
    iid = uid()
    conn = get_db()
    conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)",
        (iid, sid, d["id_type"], d["value"], d.get("notes",""), now()))
    conn.commit()
    conn.close()
    return jsonify({"id": iid})

@app.route("/api/identifiers/<iid>", methods=["DELETE"])
def delete_identifier(iid):
    conn = get_db()
    conn.execute("DELETE FROM identifiers WHERE id=?", (iid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── CONTACTS ─────────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/contacts", methods=["GET"])
def list_contacts(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM contacts WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/contacts", methods=["POST"])
@require_fields("contact_type", "value")
def create_contact(sid):
    d = request.json
    cid = uid()
    conn = get_db()
    conn.execute("INSERT INTO contacts VALUES (?,?,?,?,?,?)",
        (cid, sid, d["contact_type"], d["value"], d.get("label",""), now()))
    conn.commit()
    conn.close()
    return jsonify({"id": cid})

@app.route("/api/contacts/<cid>", methods=["DELETE"])
def delete_contact(cid):
    conn = get_db()
    conn.execute("DELETE FROM contacts WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── NOTES ────────────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/notes", methods=["GET"])
def list_notes(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM notes WHERE subject_id=? ORDER BY is_pinned DESC, updated_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/notes", methods=["POST"])
@require_fields("title", "content")
def create_note(sid):
    d = request.json
    err = validate_opt(d.get("category"), VALID_NOTE_CATEGORIES, "category")
    if err: return err

    nid = uid()
    t = now()
    conn = get_db()
    conn.execute("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?)",
        (nid, sid, d["title"], d["content"], d.get("category","general"), 0, t, t))
    conn.commit()
    conn.close()
    return jsonify({"id": nid})

@app.route("/api/notes/<nid>", methods=["PUT"])
@require_fields("title", "content")
def update_note(nid):
    d = request.json
    err = validate_opt(d.get("category"), VALID_NOTE_CATEGORIES, "category")
    if err: return err

    t = now()
    conn = get_db()
    conn.execute("UPDATE notes SET title=?,content=?,category=?,is_pinned=?,updated_at=? WHERE id=?",
        (d["title"],d["content"],d.get("category","general"),int(d.get("is_pinned",0)),t,nid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/notes/<nid>", methods=["DELETE"])
def delete_note(nid):
    conn = get_db()
    conn.execute("DELETE FROM notes WHERE id=?", (nid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── AI ANALYSIS ──────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/ai-analyses", methods=["GET"])
def list_analyses(sid):
    conn = get_db()
    rows = conn.execute("SELECT * FROM ai_analyses WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.route("/api/subjects/<sid>/ai-analyses", methods=["POST"])
def save_analysis(sid):
    d = request.json
    aid = uid()
    conn = get_db()
    conn.execute("INSERT INTO ai_analyses VALUES (?,?,?,?,?)",
        (aid, sid, d["analysis_type"], d["content"], now()))
    conn.commit()
    conn.close()
    return jsonify({"id": aid})

@app.route("/api/ai-analyses/<aid>", methods=["DELETE"])
def delete_analysis(aid):
    conn = get_db()
    conn.execute("DELETE FROM ai_analyses WHERE id=?", (aid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/ai/analyze", methods=["POST"])
def ai_analyze():
    client_ip = request.remote_addr or "unknown"
    if not ai_limiter.is_allowed(client_ip):
        log.warning("Rate limit excedido para %s", client_ip)
        return jsonify({"error": "Límite de solicitudes IA alcanzado (20/min). Espera un momento."}), 429

    data = request.json
    api_key = data.get("api_key", "").strip()
    api_endpoint = data.get("api_endpoint", "https://api.anthropic.com/v1/messages").strip()
    model = data.get("model", "claude-sonnet-4-20250514")
    max_tokens = data.get("max_tokens", 8192)
    system_prompt = data.get("system", "")
    messages = data.get("messages", [])

    if not api_key:
        return jsonify({"error": "API key requerida"}), 400
    if not messages:
        return jsonify({"error": "Mensajes requeridos"}), 400
    if not isinstance(max_tokens, int) or max_tokens < 1:
        max_tokens = 8192
    max_tokens = min(max_tokens, 64000)

    is_anthropic = "anthropic.com" in api_endpoint.lower()

    # Normalizar endpoint OpenAI-compatible correctamente
    if not is_anthropic:
        clean = api_endpoint.rstrip("/")
        if clean.endswith("/chat/completions"):
            api_endpoint = clean
        elif clean.endswith("/v1"):
            api_endpoint = clean + "/chat/completions"
        else:
            api_endpoint = clean + "/v1/chat/completions"

    if is_anthropic:
        body = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system_prompt:
            body["system"] = system_prompt
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
    else:
        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})
        body = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": msgs,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

    try:
        req = Request(
            api_endpoint,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
        )
        resp = urlopen(req, timeout=120)
        result = json.loads(resp.read())
        log.info("IA análisis completado para %s (%s)", client_ip, model)
        return jsonify(result)
    except URLError as e:
        status = getattr(e, "code", 502)
        body = b""
        if hasattr(e, "read"):
            try:
                body = e.read()
            except Exception:
                pass
        detail = str(e.reason) if hasattr(e, "reason") else str(e)
        log.error("Error IA proxy: %s", detail)
        return jsonify({"error": detail, "body": body.decode("utf-8", errors="replace")}), status
    except Exception as e:
        log.error("Error inesperado IA proxy: %s", str(e))
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

# ─── OSINT (SHERLOCK) ───────────────────────────────────────────────────────────

SHERLOCK_PATH = BASE_DIR / "script investigacion" / "sherlock_ultimate.py"
if not SHERLOCK_PATH.exists():
    SHERLOCK_PATH = BASE_DIR / "sherlock_ultimate.py"
SHERLOCK_ROOT = SHERLOCK_PATH.parent
SHERLOCK_REPORTS_DIR = SHERLOCK_ROOT / "profiles_data" / "reports"

OSINT_DEPS = ["requests", "Pillow", "rich", "numpy", "beautifulsoup4",
               "imagehash", "phonenumbers", "geopy", "scipy", "scikit-learn",
               "networkx", "exifread", "opencv-python"]
_osint_installing = False

@app.route("/api/subjects/<sid>/osint/install-deps", methods=["POST"])
def osint_install_deps(sid):
    global _osint_installing
    if _osint_installing:
        return jsonify({"ok": False, "error": "Ya hay una instalación en curso"}), 429

    pip_cmds = [
        [sys.executable, "-m", "pip", "install", "--break-system-packages", "-q"],
        [sys.executable, "-m", "pip", "install", "--user", "-q"],
        [sys.executable, "-m", "pip", "install", "-q"],
    ]

    def _install():
        global _osint_installing
        _osint_installing = True
        try:
            for pkg in OSINT_DEPS:
                for cmd in pip_cmds:
                    try:
                        r = subprocess.run(cmd + [pkg], capture_output=True, timeout=120)
                        if r.returncode == 0:
                            break
                    except Exception:
                        continue
        finally:
            _osint_installing = False

    threading.Thread(target=_install, daemon=True).start()
    return jsonify({"ok": True, "message": "Instalación iniciada en segundo plano"})

@app.route("/api/subjects/<sid>/osint/install-status", methods=["GET"])
def osint_install_status(sid):
    return jsonify({"installing": _osint_installing})

@app.route("/api/subjects/<sid>/osint/status", methods=["GET"])
def osint_status(sid):
    deps_status = {}
    for module in ["requests", "PIL", "rich", "numpy", "bs4", "imagehash", "phonenumbers", "geopy"]:
        try:
            __import__(module)
            deps_status[module] = True
        except ImportError:
            deps_status[module] = False
    return jsonify({
        "ready": all(deps_status.values()),
        "dependencies": deps_status,
        "script_exists": SHERLOCK_PATH.exists(),
    })

@app.route("/api/subjects/<sid>/osint/run", methods=["POST"])
def osint_run(sid):
    data = request.json
    target = data.get("target", "").strip()
    if not target and not data.get("name") and not data.get("phone") and not data.get("email"):
        return jsonify({"error": "Proporciona al menos un dato (target, name, phone o email)"}), 400

    if not SHERLOCK_PATH.exists():
        return jsonify({"error": "sherlock_ultimate.py no encontrado"}), 500

    full_scan = data.get("full_scan", False)
    timeout_sec = data.get("timeout", 1800)

    env = os.environ.copy()
    env["PYTHONWARNINGS"] = "ignore"
    sherlock_cwd = str(SHERLOCK_PATH.parent)

    args = [sys.executable, str(SHERLOCK_PATH)]
    if target:
        args.append(target)
    name_val = data.get("name", "").strip()
    phone_val = data.get("phone", "").strip()
    email_val = data.get("email", "").strip()
    if name_val:
        args.extend(["--name", name_val])
    if phone_val:
        args.extend(["--phone", phone_val])
    if email_val:
        args.extend(["--email", email_val])

    args.append("--export")
    args.append("json")
    if not full_scan:
        args.append("--quick")
    else:
        args.append("--multi-profile")
        args.append("--forensic")

    insta_session = data.get("insta_session", "").strip()
    if insta_session:
        args.extend(["--instagram-session", insta_session])

    platforms = data.get("platforms")
    if platforms and isinstance(platforms, list) and len(platforms) > 0:
        args.extend(["--platforms", ",".join(platforms)])

    if data.get("spiderfoot"):
        args.append("--spiderfoot")

    try:
        proc = subprocess.run(
            args, cwd=sherlock_cwd,
            capture_output=True, text=True,
            timeout=min(timeout_sec, 3600),
            env=env,
        )

        if proc.returncode != 0:
            err = proc.stderr[:1000] or proc.stdout[:1000]
            return jsonify({"error": err}), 500

        # Try to parse JSON from stdout
        stdout = proc.stdout.strip()
        # Find JSON in stdout (after progress output)
        json_start = stdout.find('{')
        json_end = stdout.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            report = json.loads(stdout[json_start:json_end])
            log.info("OSINT OK target=%s perfiles=%d", target, report.get("profiles_found", 0))
            return jsonify(report)

        # Fallback: try reading from JSON file
        reports = sorted(
            glob.glob(str(SHERLOCK_REPORTS_DIR / "*.json")),
            key=os.path.getmtime, reverse=True
        )
        if reports:
            with open(reports[0]) as f:
                return jsonify(json.load(f))

        return jsonify({"error": "No se pudo leer el reporte"}), 500

    except subprocess.TimeoutExpired:
        return jsonify({"error": f"Timeout: la investigación tardó más de {min(timeout_sec, 3600)}s. Intenta con modo rápido."}), 504
    except Exception as e:
        log.error("Error OSINT: %s", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/subjects/<sid>/osint/progress", methods=["GET"])
def osint_progress(sid):
    progress_file = SHERLOCK_REPORTS_DIR.parent / ".progress"
    if progress_file.exists():
        try:
            return jsonify(json.loads(progress_file.read_text(encoding="utf-8")))
        except Exception:
            pass
    return jsonify({"current": 0, "total": 0, "phase": "idle", "message": "", "found": 0})

@app.route("/api/subjects/<sid>/osint/log", methods=["GET"])
def osint_log(sid):
    log_file = SHERLOCK_REPORTS_DIR.parent / ".log"
    if log_file.exists():
        try:
            lines = log_file.read_text(encoding="utf-8").splitlines()
            return jsonify({"log": lines[-50:]})
        except Exception:
            pass
    return jsonify({"log": []})

@app.route("/api/subjects/<sid>/osint/import", methods=["POST"])
def osint_import(sid):
    data = request.json
    report = data.get("report", {})

    if not report:
        return jsonify({"error": "Reporte requerido"}), 400

    conn = get_db()
    t = now()
    imported = {"emails": 0, "phones": 0, "profiles": 0,
                "names": 0, "locations": 0, "alternatives": 0,
                "photos": 0, "contacts": 0}

    extracted = report.get("extracted_data", {})

    # ── Emails → Contacts ──
    for email in extracted.get("emails", []) or report.get("emails", []):
        conn.execute("INSERT INTO contacts VALUES (?,?,?,?,?,?)",
                     (uid(), sid, "email", email, "OSINT", t))
        imported["emails"] += 1
        imported["contacts"] += 1

    # ── Phones → Contacts ──
    for phone in extracted.get("phones", []) or report.get("phones", []):
        conn.execute("INSERT INTO contacts VALUES (?,?,?,?,?,?)",
                     (uid(), sid, "phone", phone, "OSINT", t))
        imported["phones"] += 1
        imported["contacts"] += 1

    # ── Names → Identifiers ──
    for name in extracted.get("names", []):
        conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)",
                     (uid(), sid, "name", name, "OSINT - nombre encontrado", t))
        imported["names"] += 1

    # ── Locations → Locations ──
    for loc in extracted.get("locations", []):
        conn.execute("INSERT INTO locations VALUES (?,?,?,?,?,?,?,?,?)",
                     (uid(), sid, loc, loc, None, None, "frequent", "OSINT", t))
        imported["locations"] += 1

    # ── Workplaces → Identifiers / Notes ──
    for w in extracted.get("workplaces", []):
        conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)",
                     (uid(), sid, "work", w, "OSINT - trabajo", t))

    # ── Education → Identifiers ──
    for e in extracted.get("education", []):
        conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)",
                     (uid(), sid, "education", e, "OSINT - educación", t))

    # ── Social profiles → Contacts ──
    for profile in report.get("profiles", []):
        url = profile.get("url", "")
        platform = profile.get("platform", "Desconocida")
        ct_type = "other"
        plat_lower = platform.lower()
        if any(x in plat_lower for x in ["instagram"]): ct_type = "instagram"
        elif any(x in plat_lower for x in ["twitter", "x"]): ct_type = "twitter"
        elif any(x in plat_lower for x in ["facebook"]): ct_type = "facebook"
        elif any(x in plat_lower for x in ["tiktok"]): ct_type = "tiktok"
        elif any(x in plat_lower for x in ["telegram"]): ct_type = "telegram"
        elif any(x in plat_lower for x in ["whatsapp"]): ct_type = "whatsapp"
        conn.execute("INSERT INTO contacts VALUES (?,?,?,?,?,?)",
                     (uid(), sid, ct_type, url, platform, t))
        imported["profiles"] += 1
        imported["contacts"] += 1

        # ── Profile photos → Multimedia ──
        photo_url = profile.get("photo_url")
        if photo_url:
            try:
                img_resp = http_requests.get(photo_url, timeout=15)
                if img_resp.status_code == 200 and img_resp.headers.get("content-type", "").startswith("image/"):
                    ext = ".jpg"
                    ct = img_resp.headers["content-type"]
                    if "png" in ct: ext = ".png"
                    elif "gif" in ct: ext = ".gif"
                    elif "webp" in ct: ext = ".webp"
                    fid = uid()
                    fname = f"{fid}{ext}"
                    (UPLOADS_DIR / fname).write_bytes(img_resp.content)
                    conn.execute("INSERT INTO media VALUES (?,?,?,?,?,?,?,?)",
                                 (fid, sid, "image", fname, f"OSINT_{platform}.jpg",
                                  f"Foto de perfil OSINT - {platform}", 0, t))
                    imported["photos"] += 1
            except Exception as e:
                log.warning("No se pudo descargar foto de %s: %s", platform, e)

    # ── Alternative accounts → Contacts ──
    alt_accounts = report.get("alternative_accounts", {})
    if isinstance(alt_accounts, dict):
        for platform, alts in alt_accounts.items():
            for alt in (alts or []):
                alt_name = alt.get("username", "desconocido")
                alt_url = alt.get("url", "")
                alt_conf = alt.get("confidence", 0)
                conn.execute("INSERT INTO contacts VALUES (?,?,?,?,?,?)",
                             (uid(), sid, "other", alt_url,
                              f"OSINT - alternativa {platform} ({alt_name}) confianza {alt_conf:.0%}", t))
                imported["alternatives"] += 1
                imported["contacts"] += 1

    # ── Insights + Recommendations → Note ──
    insights = report.get("insights", [])
    recommendations = report.get("recommendations", [])
    if insights or recommendations:
        content = "## OSINT - Insights y Recomendaciones\n\n"
        if insights:
            content += "### 💡 Insights\n" + "\n".join(f"- {i}" for i in insights) + "\n\n"
        if recommendations:
            content += "### ✅ Recomendaciones\n" + "\n".join(f"- {r}" for r in recommendations)
        conn.execute("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?)",
                     (uid(), sid, "OSINT - Insights", content, "intel", 1, t, t))

    # ── Full report → AI Analysis ──
    conn.execute("INSERT INTO ai_analyses VALUES (?,?,?,?,?)",
                 (uid(), sid, "osint", json.dumps(report, indent=2, ensure_ascii=False), t))

    conn.commit()
    conn.close()
    log.info("OSINT importado para sujeto %s: %s", sid, imported)
    return jsonify({"ok": True, "imported": imported})

# ─── BOARD (PIZARRÓN) ──────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/board", methods=["GET"])
def get_board(sid):
    conn = get_db()
    row = conn.execute("SELECT * FROM subjects WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "No encontrado"}), 404

    subject = enrich_subject(dict(row), conn)

    media = rows_to_list(conn.execute(
        "SELECT * FROM media WHERE subject_id=? ORDER BY is_primary DESC", (sid,)).fetchall())
    contacts = rows_to_list(conn.execute(
        "SELECT * FROM contacts WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall())
    locations = rows_to_list(conn.execute(
        "SELECT * FROM locations WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall())
    events = rows_to_list(conn.execute(
        "SELECT * FROM events WHERE subject_id=? ORDER BY date DESC", (sid,)).fetchall())
    notes = rows_to_list(conn.execute(
        "SELECT * FROM notes WHERE subject_id=? ORDER BY is_pinned DESC, updated_at DESC", (sid,)).fetchall())
    identifiers = rows_to_list(conn.execute(
        "SELECT * FROM identifiers WHERE subject_id=? ORDER BY created_at DESC", (sid,)).fetchall())
    relations = rows_to_list(conn.execute(
        "SELECT r.*, a.name as name_a, b.name as name_b FROM relations r "
        "JOIN subjects a ON r.subject_a_id=a.id JOIN subjects b ON r.subject_b_id=b.id "
        "WHERE r.subject_a_id=? OR r.subject_b_id=?", (sid, sid)).fetchall())

    conn.close()
    return jsonify({
        "subject": subject,
        "media": media,
        "contacts": contacts,
        "locations": locations,
        "events": events,
        "notes": notes,
        "identifiers": identifiers,
        "relations": relations,
    })

# ─── EXPORT ───────────────────────────────────────────────────────────────────

@app.route("/api/subjects/<sid>/export", methods=["GET"])
def export_subject(sid):
    conn = get_db()
    row = conn.execute("SELECT * FROM subjects WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    d = dict(row)
    d["aliases"] = parse_json_field(d["aliases"])
    d["tags"] = parse_json_field(d["tags"])
    d["media"] = rows_to_list(conn.execute("SELECT * FROM media WHERE subject_id=?", (sid,)).fetchall())
    d["events"] = rows_to_list(conn.execute("SELECT * FROM events WHERE subject_id=? ORDER BY date", (sid,)).fetchall())
    d["locations"] = rows_to_list(conn.execute("SELECT * FROM locations WHERE subject_id=?", (sid,)).fetchall())
    d["identifiers"] = rows_to_list(conn.execute("SELECT * FROM identifiers WHERE subject_id=?", (sid,)).fetchall())
    d["contacts"] = rows_to_list(conn.execute("SELECT * FROM contacts WHERE subject_id=?", (sid,)).fetchall())
    d["notes"] = rows_to_list(conn.execute("SELECT * FROM notes WHERE subject_id=?", (sid,)).fetchall())
    d["relations"] = rows_to_list(conn.execute(
        "SELECT r.*, a.name as name_a, b.name as name_b FROM relations r "
        "JOIN subjects a ON r.subject_a_id=a.id JOIN subjects b ON r.subject_b_id=b.id "
        "WHERE r.subject_a_id=? OR r.subject_b_id=?", (sid, sid)).fetchall())
    conn.close()
    return jsonify(d)

@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_db()
    return jsonify({
        "subjects": conn.execute("SELECT COUNT(*) FROM subjects").fetchone()[0],
        "media": conn.execute("SELECT COUNT(*) FROM media").fetchone()[0],
        "events": conn.execute("SELECT COUNT(*) FROM events").fetchone()[0],
        "locations": conn.execute("SELECT COUNT(*) FROM locations").fetchone()[0],
        "relations": conn.execute("SELECT COUNT(*) FROM relations").fetchone()[0],
        "notes": conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0],
    })

# ─── CASES ────────────────────────────────────────────────────────────────────

@app.route("/api/cases", methods=["GET"])
def list_cases():
    conn = get_db()
    rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
    cases = rows_to_list(rows)
    for c in cases:
        subs = conn.execute("SELECT subject_id FROM case_subjects WHERE case_id=?", (c["id"],)).fetchall()
        c["subject_ids"] = [s["subject_id"] for s in subs]
    conn.close()
    return jsonify(cases)

@app.route("/api/cases", methods=["POST"])
def create_case():
    d = request.json
    cid = uid()
    t = now()
    conn = get_db()
    conn.execute("INSERT INTO cases VALUES (?,?,?,?,?,?,?,?)",
                 (cid, next_case_number(), d.get("title",""), d.get("description",""),
                  d.get("status","open"), d.get("detective",""), t, t))
    conn.commit()
    conn.close()
    log_audit("", "create", "case", cid, f"Caso: {d.get('title','')}")
    return jsonify({"id": cid})

@app.route("/api/cases/<cid>", methods=["DELETE"])
def delete_case(cid):
    conn = get_db()
    conn.execute("DELETE FROM case_subjects WHERE case_id=?", (cid,))
    conn.execute("DELETE FROM cases WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/cases/<cid>/subjects", methods=["POST"])
def add_case_subject(cid):
    d = request.json
    sid = d.get("subject_id")
    if not sid:
        return jsonify({"error": "subject_id requerido"}), 400
    conn = get_db()
    conn.execute("INSERT OR IGNORE INTO case_subjects VALUES (?,?)", (cid, sid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/cases/<cid>/subjects/<sid>", methods=["DELETE"])
def remove_case_subject(cid, sid):
    conn = get_db()
    conn.execute("DELETE FROM case_subjects WHERE case_id=? AND subject_id=?", (cid, sid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ─── AUDIT ─────────────────────────────────────────────────────────────────────

@app.route("/api/audit", methods=["GET"])
def list_audit():
    conn = get_db()
    rows = conn.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

# ─── BACKUP ────────────────────────────────────────────────────────────────────

BACKUP_DIR = BASE_DIR / "backups"
BACKUP_DIR.mkdir(exist_ok=True)
RECOVERY_DIR = BACKUP_DIR / "recovery_packages"
RECOVERY_DIR.mkdir(exist_ok=True)
BACKUP_MAGIC = b"NEXUSBK1"
BACKUP_VERSION = 1

def _build_backup_data(password: str) -> bytes:
    """Build a self-contained backup with header: [magic8][version4][timestamp8][salt16][iv12][tag16][ciphertext]"""
    import crypto, struct, hashlib
    salt = (BASE_DIR / ".nexus_salt").read_bytes()
    raw = DB_PATH.read_bytes()
    key = crypto._derive_key(password, salt)
    iv = os.urandom(12)
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    padded = padder.update(raw) + padder.finalize()
    ct = encryptor.update(padded) + encryptor.finalize()
    ts = int(time.time())
    return struct.pack(">8sIQ", BACKUP_MAGIC, BACKUP_VERSION, ts) + salt + iv + encryptor.tag + ct

def _restore_from_backup(data: bytes, password: str) -> bool:
    """Restore DB from a backup blob. Returns True on success."""
    import crypto, struct, hashlib
    try:
        magic, ver, ts = struct.unpack(">8sIQ", data[:20])
        if magic != BACKUP_MAGIC:
            return False
    except:
        return False
    try:
        salt, data2 = data[20:36], data[36:]
        iv, tag, ct = data2[:12], data2[12:28], data2[28:]
        key = crypto._derive_key(password, salt)
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag))
        decryptor = cipher.decryptor()
        padded = decryptor.update(ct) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        dec = unpadder.update(padded) + unpadder.finalize()
        DB_PATH.write_bytes(dec)
        (BASE_DIR / ".nexus_salt").write_bytes(salt)
        (BASE_DIR / ".nexus_key").write_text(hashlib.sha256(password.encode()).hexdigest())
        return True
    except Exception as e:
        log.error("Restore error: %s", e)
        return False

@app.route("/api/backup", methods=["POST"])
def create_backup():
    global _master_password
    t = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"nexus_backup_{t}.db"
    (BACKUP_DIR / fname).write_bytes(_build_backup_data(_master_password))
    log.info("Backup creado: %s", fname)
    return jsonify({"ok": True, "file": fname, "magic": "NEXUSBK1", "version": BACKUP_VERSION})

@app.route("/api/backups", methods=["GET"])
def list_backups():
    files = sorted([f.name for f in BACKUP_DIR.glob("nexus_backup_*")], reverse=True)
    backups_info = []
    for fname in files:
        fpath = BACKUP_DIR / fname
        info = {"name": fname, "size": fpath.stat().st_size}
        try:
            raw = fpath.read_bytes()
            magic, ver, ts = struct.unpack(">8sIQ", raw[:20])
            if magic == BACKUP_MAGIC:
                info["magic"] = magic.decode()
                info["version"] = ver
                info["created"] = datetime.fromtimestamp(ts).isoformat()
                info["valid"] = True
        except:
            info["valid"] = False
        backups_info.append(info)
    return jsonify({"backups": backups_info})

@app.route("/api/backup/restore/<name>", methods=["POST"])
def restore_backup(name):
    global _master_password
    fpath = BACKUP_DIR / name
    if not fpath.exists():
        return jsonify({"error": "Backup no encontrado"}), 404
    data = fpath.read_bytes()
    if _restore_from_backup(data, _master_password):
        log.info("Backup restaurado: %s", name)
        return jsonify({"ok": True})
    return jsonify({"error": "No se pudo restaurar. ¿Contraseña incorrecta o archivo corrupto?"}), 500

# ─── RECOVERY PACKAGE (.nrb) ──────────────────────────────────────────────────

NRB_MAGIC = b"NEXUSNRB"
NRB_VERSION = 1

@app.route("/api/recovery-package", methods=["POST"])
def create_recovery_package():
    """Create a full .nrb recovery package: encrypted DB + uploads + OSINT data."""
    global _master_password
    import crypto, struct, tarfile, io, hashlib
    t = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"nexus_recovery_{t}.nrb"
    buf = io.BytesIO()
    salt = (BASE_DIR / ".nexus_salt").read_bytes()
    key = crypto._derive_key(_master_password, salt)

    # Build tar of all data
    tar_buf = io.BytesIO()
    with tarfile.open(fileobj=tar_buf, mode="w:gz") as tar:
        tar.add(str(DB_PATH), arcname="nexus.db")
        tar.add(str(BASE_DIR / ".nexus_salt"), arcname=".nexus_salt")
        tar.add(str(BASE_DIR / ".nexus_key"), arcname=".nexus_key")
        if UPLOADS_DIR.exists():
            for f in UPLOADS_DIR.iterdir():
                if f.is_file():
                    tar.add(str(f), arcname=f"uploads/{f.name}")
        # Include sherlock data
        sherlock_data = SHERLOCK_ROOT / "profiles_data"
        if sherlock_data.exists():
            tar.add(str(sherlock_data), arcname="profiles_data")
    raw_tar = tar_buf.getvalue()

    # Encrypt tar
    iv = os.urandom(12)
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    padded = padder.update(raw_tar) + padder.finalize()
    ct = encryptor.update(padded) + encryptor.finalize()
    checksum = hashlib.sha256(raw_tar).hexdigest()

    # NRB: magic(8) + version(4) + created(8) + checksum(64) + salt(16) + iv(12) + tag(16) + ciphertext
    header = struct.pack(">8sIQ", NRB_MAGIC, NRB_VERSION, int(time.time())) + checksum.encode()
    (RECOVERY_DIR / fname).write_bytes(header + salt + iv + encryptor.tag + ct)
    log.info("Recovery package creado: %s", fname)
    return jsonify({"ok": True, "file": fname, "size": len(header)+len(salt)+len(iv)+len(encryptor.tag)+len(ct)})

@app.route("/api/recovery-package/restore", methods=["POST"])
def restore_recovery_package():
    """Restore from a .nrb file. Expects multipart upload with the file and password."""
    global _master_password
    import crypto, struct, tarfile, io, hashlib
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "Subí un archivo .nrb"}), 400
    data = uploaded.read()
    try:
        magic, ver, ts = struct.unpack(">8sIQ", data[:20])
        if magic != NRB_MAGIC:
            return jsonify({"error": "Archivo .nrb inválido"}), 400
    except:
        return jsonify({"error": "Archivo corrupto"}), 400
    checksum = data[20:84].decode()
    salt = data[84:100]
    iv, tag, ct = data[100:112], data[112:128], data[128:]

    password = request.form.get("password", "")
    if not password:
        password = _master_password

    try:
        key = crypto._derive_key(password, salt)
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag))
        decryptor = cipher.decryptor()
        padded = decryptor.update(ct) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        raw_tar = unpadder.update(padded) + unpadder.finalize()
    except:
        return jsonify({"error": "Contraseña incorrecta o archivo corrupto"}), 500

    if hashlib.sha256(raw_tar).hexdigest() != checksum:
        return jsonify({"error": "Checksum inválido. Archivo corrupto."}), 500

    # Extract
    with tarfile.open(fileobj=io.BytesIO(raw_tar), mode="r:gz") as tar:
        tar.extractall(path=str(BASE_DIR))

    # Sync .nexus_key with current password
    (BASE_DIR / ".nexus_key").write_text(hashlib.sha256(password.encode()).hexdigest())

    log.info("Recovery package restaurado")
    return jsonify({"ok": True, "message": "Restauración completa. Reiniciá el servidor."})

# ─── RECOVER FROM OSINT ────────────────────────────────────────────────────────

@app.route("/api/recover-from-osint", methods=["POST"])
def recover_from_osint():
    import glob as _glob
    reports_dir = SHERLOCK_REPORTS_DIR
    if not reports_dir.exists():
        return jsonify({"error": "No hay reportes OSINT"}), 404
    files = _glob.glob(str(reports_dir / "*.json"))
    subjects_created = 0
    conn = get_db()
    t = now()
    seen = set()
    for fpath in sorted(files):
        try:
            with open(fpath) as f:
                rp = json.load(f)
        except:
            continue
        target = rp.get("target", "").strip()
        if not target or target in seen:
            continue
        seen.add(target)
        sid = uid()
        conn.execute("INSERT INTO subjects VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                     (sid, target, json.dumps([]), None, None, None, "active", "low", "", json.dumps([]), t, t))
        ext = rp.get("extracted_data", {})
        for email in ext.get("emails", []):
            conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)", (uid(), sid, "email", email, "OSINT", t))
        for phone in ext.get("phones", []):
            conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)", (uid(), sid, "phone", phone, "OSINT", t))
        for name in ext.get("names", []):
            conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)", (uid(), sid, "name", name, "OSINT", t))
        for loc in ext.get("locations", []):
            conn.execute("INSERT INTO locations VALUES (?,?,?,?,?,?,?,?,?)", (uid(), sid, loc, loc, None, None, "frequent", "OSINT", t))
        for profile in rp.get("profiles", []):
            url = profile.get("url", "")
            platform = profile.get("platform", "Desconocida")
            conn.execute("INSERT INTO identifiers VALUES (?,?,?,?,?,?)", (uid(), sid, "social", url, f"{platform} - OSINT", t))
        if rp.get("insights") or rp.get("recommendations"):
            insights = rp.get("insights", [])
            recommendations = rp.get("recommendations", [])
            content = "## OSINT\n\n"
            if insights: content += "### Insights\n" + "\n".join(f"- {i}" for i in insights) + "\n\n"
            if recommendations: content += "### Recomendaciones\n" + "\n".join(f"- {r}" for r in recommendations)
            conn.execute("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?)", (uid(), sid, "OSINT", content, "intel", 1, t, t))
        conn.execute("INSERT INTO ai_analyses VALUES (?,?,?,?,?)", (uid(), sid, "osint", json.dumps(rp, indent=2, ensure_ascii=False), t))
        subjects_created += 1
    conn.commit()
    conn.close()
    log.info("Recuperados %s sujetos desde OSINT", subjects_created)
    return jsonify({"ok": True, "subjects_created": subjects_created})

@app.route("/")
def index():
    return send_file(str(FRONTEND_DIR / "index.html"))

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(str(FRONTEND_DIR / "assets"), filename)

# ─── QR + PHONE UPLOAD ──────────────────────────────────────────────────────

PHONE_UPLOAD_HTML = """<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>NEXUS - Subir archivos</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0c10;color:#d4dce8;min-height:100vh;display:flex;justify-content:center;padding:20px}
.container{width:100%;max-width:480px;padding-top:40px}
h1{font-family:monospace;color:#e8a020;font-size:20px;letter-spacing:3px;text-align:center;margin-bottom:4px}
.sub{color:#5a6880;font-size:12px;text-align:center;margin-bottom:24px;font-family:monospace}
.card{background:#10141c;border:1px solid #252d3f;border-radius:12px;padding:20px;margin-bottom:16px}
label{display:block;font-size:11px;color:#5a6880;font-family:monospace;letter-spacing:1px;margin-bottom:6px}
select,input[type=file]{width:100%;background:#161b26;border:1px solid #252d3f;border-radius:8px;padding:10px 12px;color:#d4dce8;font-size:14px;outline:none}
select:focus,input:focus{border-color:#e8a020}
select option{background:#10141c;color:#d4dce8}
.btn{width:100%;padding:12px;background:#e8a020;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;letter-spacing:1px;margin-top:8px}
.btn:hover{background:#f0b840}
.btn:disabled{opacity:0.5;cursor:default}
.status{margin-top:12px;padding:10px;border-radius:8px;font-size:13px;display:none}
.status.success{display:block;background:rgba(64,200,128,0.1);border:1px solid rgba(64,200,128,0.3);color:#40c880}
.status.error{display:block;background:rgba(232,64,64,0.1);border:1px solid rgba(232,64,64,0.3);color:#e84040}
.status.loading{display:block;background:rgba(232,160,32,0.1);border:1px solid rgba(232,160,32,0.3);color:#e8a020}
.uploaded{margin-top:12px;font-size:12px;color:#5a6880}
</style></head>
<body><div class="container">
<h1>⬡ NEXUS</h1>
<p class="sub">SUBIR ARCHIVOS</p>
<div class="card">
<label>SUJETO</label>
<select id="subject-select"><option value="">Cargando...</option></select>
</div>
<div class="card">
<label>ARCHIVOS</label>
<input type="file" id="file-input" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt">
</div>
<button class="btn" id="upload-btn" onclick="upload()">📤 SUBIR</button>
<div class="status" id="status"></div>
<div class="uploaded" id="uploaded"></div>
</div>
<script>
async function loadSubjects(){try{
const r=await fetch('/api/subjects');const subs=await r.json();
document.getElementById('subject-select').innerHTML=subs.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('')||'<option value="">Sin sujetos</option>'
}catch(e){document.getElementById('subject-select').innerHTML='<option value="">Error cargando sujetos</option>'}}
async function upload(){const subj=document.getElementById('subject-select').value;const files=document.getElementById('file-input').files;
if(!subj){show('Selecciona un sujeto','error');return}if(!files.length){show('Selecciona archivos','error');return}
const btn=document.getElementById('upload-btn');btn.disabled=true;btn.textContent='SUBIR ('+files.length+')...';show('Subiendo...','loading');
let ok=0,err=0;
for(const f of files){try{const fd=new FormData();fd.append('file',f);await fetch('/api/subjects/'+subj+'/media',{method:'POST',body:fd});ok++}catch(e){err++}}
show(ok+' subidos'+(err?' ('+err+' errores)':''),err?'error':'success');
document.getElementById('uploaded').textContent=ok+' archivos subidos';
btn.disabled=false;btn.textContent='📤 SUBIR'}
function show(msg,type){const el=document.getElementById('status');el.className='status '+type;el.textContent=msg}
loadSubjects()
</script></body></html>"""

import socket
def _get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

@app.route("/api/qr")
def qr_code():
    import qrcode
    from io import BytesIO
    port = 7331
    ip = _get_local_ip()
    url = f"http://{ip}:{port}/phone-upload"
    qr = qrcode.make(url, box_size=8, border=2)
    buf = BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

@app.route("/phone-upload", methods=["GET"])
def phone_upload_page():
    return PHONE_UPLOAD_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}

if __name__ == "__main__":
    import crypto

    first_run = not crypto.KEY_FILE.exists()

    if not first_run:
        password = crypto.verify_password()
        crypto.decrypt_all(password, DB_PATH, UPLOADS_DIR, extra_dirs=[SHERLOCK_ROOT / "profiles_data"])
        print(f"  ✅ Datos desencriptados\n")
    else:
        print(f"  📝 Primera ejecución — sin encriptación aún")

    init_db()

    if first_run:
        password = crypto.setup_password()
        print(f"  ℹ️  Los datos se encriptarán al salir (Ctrl+C)\n")

    _master_password = password

    def _shutdown():
        print(f"\n  🔒 Encriptando datos...")
        crypto.encrypt_all(_master_password, DB_PATH, UPLOADS_DIR, extra_dirs=[SHERLOCK_ROOT / "profiles_data"])
        # Auto-backup (self-contained with header)
        try:
            import struct
            t = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_data = _build_backup_data(_master_password)
            (BACKUP_DIR / f"nexus_backup_{t}.db").write_bytes(backup_data)
            print(f"  💾 Backup: nexus_backup_{t}.db")
        except Exception as e:
            print(f"  ⚠️ Backup: {e}")
        print(f"  ✅ Datos encriptados. Saliendo.\n")
    atexit.register(_shutdown)
    port = 7331
    local_ip = _get_local_ip()
    print(f"\n{'='*55}")
    print(f"  NEXUS - Plataforma de Investigación")
    print(f"{'='*55}")
    print(f"  Local:    http://localhost:{port}")
    print(f"  Red:      http://{local_ip}:{port}  (📱 escanea el QR)")
    print(f"  Datos en: {DB_PATH}")
    print(f"  Archivos: {UPLOADS_DIR}")
    print(f"  Ctrl+C para salir")
    print(f"{'='*55}\n")
    def open_browser():
        import time; time.sleep(1.2)
        webbrowser.open(f"http://localhost:{port}")
    threading.Thread(target=open_browser, daemon=True).start()
    try:
        app.run(host="0.0.0.0", port=port, debug=False)
    except KeyboardInterrupt:
        pass
