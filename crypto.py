"""
NEXUS encryption module.
Encrypts/decrypts the SQLite database and upload files using AES-GCM.
First run: prompts to set a master password.
Subsequent runs: prompts for password, decrypts on success, re-encrypts on shutdown.
"""

import os, sys, json, hashlib, base64, shutil, getpass
from pathlib import Path

SALT_FILE = Path(__file__).parent / ".nexus_salt"
KEY_FILE = Path(__file__).parent / ".nexus_key"

def _derive_key(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600000, dklen=32)

def _encrypt_data(data: bytes, key: bytes) -> bytes:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding
    iv = os.urandom(12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    padded = padder.update(data) + padder.finalize()
    ct = encryptor.update(padded) + encryptor.finalize()
    return iv + encryptor.tag + ct

def _decrypt_data(data: bytes, key: bytes) -> bytes:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding
    iv, tag, ct = data[:12], data[12:28], data[28:]
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag))
    decryptor = cipher.decryptor()
    padded = decryptor.update(ct) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(padded) + unpadder.finalize()

def encrypt_file(path: Path, key: bytes):
    """Encrypt a file in-place, replacing with .encrypted version."""
    if not path.exists():
        return
    data = path.read_bytes()
    enc = _encrypt_data(data, key)
    path.write_bytes(enc)
    path.with_suffix(path.suffix + ".enc").write_bytes(b"")  # marker

def decrypt_file(path: Path, key: bytes) -> bool:
    """Decrypt a .enc file back to original. Returns True on success."""
    marker = path.with_suffix(path.suffix + ".enc")
    if not path.exists():
        return False
    try:
        data = path.read_bytes()
        dec = _decrypt_data(data, key)
        path.write_bytes(dec)
        if marker.exists():
            marker.unlink()
        return True
    except Exception:
        return False

def is_encrypted(path: Path) -> bool:
    """Check if a file has an .enc marker."""
    return path.with_suffix(path.suffix + ".enc").exists()

def setup_password() -> str:
    """First-run setup: prompt for a new password and store salt."""
    salt = os.urandom(16)
    SALT_FILE.write_bytes(salt)
    print("\n🔐 Primera ejecución - Configurar contraseña maestra")
    while True:
        p1 = getpass.getpass("  Nueva contraseña: ")
        p2 = getpass.getpass("  Repetir contraseña: ")
        if p1 == p2 and len(p1) >= 4:
            KEY_FILE.write_text(hashlib.sha256(p1.encode()).hexdigest())
            print("  ✅ Contraseña configurada\n")
            return p1
        print("  ❌ No coinciden o muy corta (min 4 caracteres)\n")

def verify_password() -> str:
    """Prompt for password and verify against stored hash. Returns password on success."""
    if not KEY_FILE.exists():
        return setup_password()
    stored_hash = KEY_FILE.read_text().strip()
    attempts = 3
    print(f"\n🔐 NEXUS - Ingresar contraseña maestra ({attempts} intentos)")
    while attempts > 0:
        p = getpass.getpass("  Contraseña: ")
        if hashlib.sha256(p.encode()).hexdigest() == stored_hash:
            print("  ✅ Acceso concedido\n")
            return p
        attempts -= 1
        if attempts > 0:
            print(f"  ❌ Incorrecta. {attempts} intento(s) restante(s)")
        else:
            print("  ❌ Acceso denegado")
            sys.exit(1)

def encrypt_all(password: str, db_path: Path, uploads_dir: Path, extra_dirs: list = None):
    """Encrypt database and all upload files."""
    salt = SALT_FILE.read_bytes() if SALT_FILE.exists() else os.urandom(16)
    if not SALT_FILE.exists():
        SALT_FILE.write_bytes(salt)
    key = _derive_key(password, salt)
    try:
        encrypt_file(db_path, key)
        print(f"  🔒 Base de datos encriptada")
    except Exception as e:
        print(f"  ⚠️ No se pudo encriptar DB: {e}")
    for d in [uploads_dir] + (extra_dirs or []):
        if d.exists():
            cnt = 0
            for f in d.iterdir():
                if f.is_file() and not is_encrypted(f):
                    try:
                        encrypt_file(f, key)
                        cnt += 1
                    except:
                        pass
            if cnt > 0:
                print(f"  🔒 {d.name}: {cnt} archivos")

def decrypt_all(password: str, db_path: Path, uploads_dir: Path, extra_dirs: list = None) -> bool:
    """Decrypt database and upload files. Returns True if successful."""
    if not SALT_FILE.exists():
        return True
    salt = SALT_FILE.read_bytes()
    key = _derive_key(password, salt)
    ok = decrypt_file(db_path, key)
    for d in [uploads_dir] + (extra_dirs or []):
        if d.exists():
            for f in d.iterdir():
                if f.is_file() and is_encrypted(f):
                    try:
                        decrypt_file(f, key)
                    except:
                        pass
    return ok
