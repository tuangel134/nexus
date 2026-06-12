import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { motion } from 'framer-motion';
import { Search, Download, Import, Loader2, ExternalLink, Users, Mail, Phone, MapPin, Briefcase, GraduationCap, Link2, Globe, Lightbulb, Shield, ChevronDown, ChevronUp, Eye, EyeOff, Instagram, Sparkles } from 'lucide-react';
import { getAIConfig } from '@/hooks/useAI';

const COMMON_PLATFORMS = [
  "Instagram", "Twitter/X", "Facebook", "TikTok", "LinkedIn", "YouTube",
  "GitHub", "Reddit", "Snapchat", "Telegram", "WhatsApp", "Twitch",
  "Spotify", "Steam", "Pinterest", "Threads", "Bluesky", "Mastodon",
];

export default function OSINTSection() {
  const { currentSubject, addNotification, setOSINTReport, osintReport } = useAppStore();
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullScan, setFullScan] = useState(false);
  const [useSpiderFoot, setUseSpiderFoot] = useState(false);
  const [instaSession, setInstaSession] = useState(localStorage.getItem('nexus_insta_session') || '');
  const [showPass, setShowPass] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformInput, setPlatformInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [depsStatus, setDepsStatus] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<any>({ current: 0, total: 0, phase: '', message: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [report, setReport] = useState<any>(osintReport);
  const [aiVerification, setAiVerification] = useState('');
  const [filtering, setFiltering] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentSubject) return;
    api.osint.status(currentSubject.id).then(setDepsStatus).catch(console.error);
  }, [currentSubject]);

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function addCustomPlatform() {
    const p = platformInput.trim();
    if (p && !selectedPlatforms.includes(p)) {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
    setPlatformInput('');
  }

  async function runOSINT() {
    if (!currentSubject) return;
    if (!target.trim() && !name.trim() && !phone.trim() && !email.trim()) {
      addNotification('Ingresa al menos un dato (username, nombre, teléfono o email)', 'error');
      return;
    }
    if (!confirm(`¿Ejecutar OSINT para "${target || name || phone || email}"?`)) return;

    setRunning(true);
    setReport(null);
    setLogs([]);
    setProgress({ current: 0, total: 0, phase: 'starting', message: 'Iniciando…' });

    if (instaSession) localStorage.setItem('nexus_insta_session', instaSession);

    progressRef.current = setInterval(async () => {
      try {
        const p = await api.osint.progress(currentSubject.id);
        setProgress(p);
      } catch {}
      try {
        const l = await api.osint.log(currentSubject.id);
        if (l.log) setLogs(l.log);
      } catch {}
    }, 800);

    try {
      const r = await api.osint.run(currentSubject.id, {
        target,
        name: name || undefined,
        phone: phone || undefined,
        email: email || undefined,
        full_scan: fullScan,
        timeout: fullScan ? 3600 : 600,
        instagram_session: instaSession || undefined,
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        spiderfoot: useSpiderFoot,
      });
      setReport(r);
      setOSINTReport(r);
      addNotification(`OSINT: ${r.profiles_found || 0} perfiles`, 'success');
    } catch (e: any) {
      addNotification('Error OSINT: ' + e.message, 'error');
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      setRunning(false);
    }
  }

  async function importOSINT() {
    if (!report || !currentSubject) return;
    try {
      const res = await api.osint.import_(currentSubject.id, { report });
      const c = res.imported || {};
      addNotification(`Importados: ${c.contacts||0} contactos, ${c.locations||0} ubicaciones, ${c.photos||0} fotos`, 'success');
    } catch (e: any) {
      addNotification('Error: ' + e.message, 'error');
    }
  }

  function exportJSON() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osint_${report.target}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function verifyWithAI() {
    if (!report) return;
    const dataSummary = `Objetivo: ${report.target}\nPerfiles: ${report.profiles_found}\nEmails: ${(report.extracted_data?.emails||[]).join(', ')}\nTeléfonos: ${(report.extracted_data?.phones||[]).join(', ')}\nNombres: ${(report.extracted_data?.names||[]).join(', ')}\nUbicaciones: ${(report.extracted_data?.locations||[]).join(', ')}`;
    setAiVerification('Analizando con IA...');
    try {
      const r = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: getAIConfig().apiKey,
          api_endpoint: getAIConfig().endpoint,
          model: getAIConfig().model,
          max_tokens: getAIConfig().maxTokens,
          system: 'Eres un analista forense experto. Verifica los siguientes datos OSINT y detecta falsos positivos, inconsistencias y datos sospechosos.',
          messages: [{ role: 'user', content: dataSummary }],
        }),
      });
      const d = await r.json();
      setAiVerification(d.content?.[0]?.text || d.choices?.[0]?.message?.content || 'Sin respuesta');
    } catch (e: any) {
      setAiVerification('Error: ' + e.message);
    }
  }

  async function filterWithAI() {
    if (!report) return;
    setFiltering(true);
    const raw = {
      emails: report.extracted_data?.emails || [],
      phones: report.extracted_data?.phones || [],
      names: report.extracted_data?.names || [],
      locations: report.extracted_data?.locations || [],
      workplaces: report.extracted_data?.workplaces || [],
      education: report.extracted_data?.education || [],
    };
    try {
      const r = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: getAIConfig().apiKey,
          api_endpoint: getAIConfig().endpoint,
          model: getAIConfig().model,
          max_tokens: 4096,
          system: `Sos un filtro de datos OSINT extremadamente estricto. Tu única tarea es limpiar falsos positivos.

REGLAS ESTRICTAS:

📧 EMAILS: Solo conservar si tienen formato válido (usuario@dominio.ext). Descartar los que contengan "example", "test", "domain", "localhost", "user@", "admin@".

📞 TELÉFONOS: Solo conservar si tienen 10+ dígitos y formato de número real. Descartar "000", "111", "123", números repetitivos.

👤 NOMBRES: Solo conservar si parece nombre real de persona (2-3 palabras, cada una con 3+ letras, primera letra mayúscula). Descartar terminantemente: "Click Here", "Read More", "Privacy Policy", "Terms Service", "All Rights", "Powered By", "Copyright", nombres de meses, días, colores, países solos, ciudades solas, palabras sueltas, texto genérico de páginas web.

📍 UBICACIONES: Solo conservar si es una ciudad/país/dirección real. Descartar "World", "International", "Online", "Home", "Page", "Site", "Web".

💼 TRABAJOS: Solo conservar si es un nombre de empresa real (no "Company", "Business", "Services", "Solutions", "Management").

🎓 EDUCACIÓN: Solo conservar si es una universidad/institución real.

DEVOLVÉ ÚNICAMENTE UN JSON VÁLIDO con este formato exacto, sin texto adicional, sin explicaciones, sin markdown:
{"emails":[],"phones":[],"names":[],"locations":[],"workplaces":[],"education":[]}

Si no hay datos válidos para una categoría, devolvé array vacío. No inventes datos. No seas permisivo. Preferí eliminar un dato dudoso antes que conservar un falso positivo.`,
          messages: [{ role: 'user', content: JSON.stringify(raw) }],
        }),
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || '{}';
      const cleaned = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');
      const updated = { ...report, extracted_data: { ...report.extracted_data, ...cleaned } };
      setReport(updated);
      setOSINTReport(updated);
      addNotification('Datos filtrados por IA', 'success');
    } catch (e: any) {
      addNotification('Error filtrando: ' + e.message, 'error');
    } finally {
      setFiltering(false);
    }
  }

  const extracted = report?.extracted_data || {};
  const profiles = report?.profiles || [];
  const emails = extracted.emails || [];
  const phones = extracted.phones || [];
  const names = extracted.names || [];
  const locations = extracted.locations || [];
  const workplaces = extracted.workplaces || [];
  const education = extracted.education || [];
  const insights = report?.insights || [];
  const recommendations = report?.recommendations || [];
  const confidence = report?.confidence_score || 0;
  const risk = report?.risk_score || 0;

  return (
    <div className="p-6">
      <div className="font-mono text-[10px] text-[#5a6880] tracking-[2px] mb-4">INVESTIGACIÓN OSINT</div>

      {/* Main search row */}
      <div className="flex gap-3 mb-3">
        <input value={target} onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runOSINT()}
          placeholder="Username…"
          className="flex-1 bg-[#111520] border border-[#252d40] rounded-lg px-3 py-2 text-sm text-[#d4dce8] outline-none focus:border-[#e8a020]" />
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={runOSINT} disabled={running || (!target.trim() && !name.trim() && !phone.trim() && !email.trim())}
          className="flex items-center gap-2 px-5 py-2 bg-[#e8a020] text-black rounded-lg text-xs font-bold tracking-wider hover:bg-[#f0b840] disabled:opacity-50">
          {running ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          INVESTIGAR
        </motion.button>
      </div>

      {/* Extra fields */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runOSINT()}
          placeholder="Nombre completo" className="bg-[#111520] border border-[#252d40] rounded-lg px-3 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
        <input value={phone} onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runOSINT()}
          placeholder="Teléfono (ej: +521234567890)" className="bg-[#111520] border border-[#252d40] rounded-lg px-3 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
        <input value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runOSINT()}
          placeholder="Email" className="bg-[#111520] border border-[#252d40] rounded-lg px-3 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
      </div>

      {/* Quick/Full toggle */}
      <div className="flex items-center gap-4 mb-3 text-xs text-[#8a98b0]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={fullScan} onChange={e => setFullScan(e.target.checked)}
            className="accent-[#e8a020]" />
          Escaneo completo ({fullScan ? '15-30 min' : '2-5 min'})
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useSpiderFoot} onChange={e => setUseSpiderFoot(e.target.checked)}
            className="accent-[#a060e8]" />
          SpiderFoot (profundidad)
        </label>
      </div>

      {/* Advanced config toggle */}
      <button onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[11px] text-[#5a6880] hover:text-[#e8a020] mb-3 transition-colors">
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Configuración avanzada
      </button>

      {/* Advanced panel */}
      {showAdvanced && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-4 mb-4 space-y-4">
          {/* Instagram Session */}
          <div>
            <div className="font-mono text-[10px] text-[#5a6880] tracking-[2px] mb-2 flex items-center gap-1">
              <Instagram size={12} /> TOUTATIS (INSTAGRAM)
            </div>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={instaSession}
                onChange={e => setInstaSession(e.target.value)}
                placeholder="Session ID de Instagram"
                className="w-full bg-[#111520] border border-[#252d40] rounded-lg px-3 py-1.5 pr-8 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
              <button onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a6880] hover:text-[#e8a020]">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-[#3a4a60] mt-1">Opcional. Obtené la sessionid desde las cookies de Instagram en tu navegador.</p>
          </div>

          {/* Platform filter */}
          <div>
            <div className="font-mono text-[10px] text-[#5a6880] tracking-[2px] mb-2">PLATAFORMAS</div>
            <p className="text-[10px] text-[#3a4a60] mb-2">Seleccioná plataformas específicas o dejá vacío para buscar en todas.</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    selectedPlatforms.includes(p)
                      ? 'bg-[#e8a020]/20 border-[#e8a020] text-[#e8a020]'
                      : 'bg-[#111520] border-[#252d40] text-[#5a6880] hover:border-[#3a4a60]'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={platformInput} onChange={e => setPlatformInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomPlatform()}
                placeholder="O agregá una personalizada…"
                className="flex-1 bg-[#111520] border border-[#252d40] rounded-lg px-3 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
              <button onClick={addCustomPlatform}
                className="px-3 py-1.5 bg-[#1c2435] text-xs text-[#8a98b0] rounded-lg hover:text-[#e8a020] transition-colors">+</button>
            </div>
            {selectedPlatforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedPlatforms.map(p => (
                  <span key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8a020]/10 border border-[#e8a020]/30 rounded text-[10px] text-[#e8a020]">
                    {p}
                    <button onClick={() => setSelectedPlatforms(prev => prev.filter(x => x !== p))} className="hover:text-white">✕</button>
                  </span>
                ))}
                <button onClick={() => setSelectedPlatforms([])}
                  className="text-[10px] text-[#5a6880] hover:text-[#e84040] px-1">Limpiar</button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Deps status */}
      {depsStatus && !depsStatus.ready && (
        <div className="mb-4 p-3 rounded-lg bg-[#e8a020]/5 border border-[#e8a020]/20 text-xs text-[#e8a020]">
          ⚡ Algunas dependencias opcionales no están instaladas. El escaneo igual funciona.
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="mb-4 p-4 rounded-lg bg-[#111520] border border-[#252d40]">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-[#e8a020]" />
            <div className="flex-1">
              <div className="text-sm text-[#d4dce8]">{progress.message || 'Escaneando…'}</div>
              <div className="text-[11px] text-[#5a6880] mt-0.5">
                {progress.phase === 'search' ? `Perfiles encontrados: ${progress.found || 0}` : progress.phase}
              </div>
            </div>
            <span className="font-mono text-sm text-[#e8a020]">
              {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
            </span>
          </div>
          {progress.total > 0 && (
            <div className="mt-2 h-1.5 bg-[#1c2435] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#e8a020] to-[#f0b840] rounded-full transition-all duration-300"
                style={{ width: `${Math.min((progress.current / progress.total) * 100, 100)}%` }} />
            </div>
          )}
          {logs.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto text-[10px] font-mono text-[#5a6880] space-y-0.5 border-t border-[#1c2435] pt-2">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {report && !running && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
            {[
              { icon: Link2, label: 'PERFILES', value: profiles.length, color: 'text-[#4080e8]' },
              { icon: Mail, label: 'EMAILS', value: emails.length, color: 'text-[#40c880]' },
              { icon: Phone, label: 'TELÉFONOS', value: phones.length, color: 'text-[#e8a020]' },
              { icon: Users, label: 'NOMBRES', value: names.length, color: 'text-[#a060e8]' },
              { icon: MapPin, label: 'UBICACIONES', value: locations.length, color: 'text-[#20c8c8]' },
              { icon: Users, label: 'MULTICUENTAS', value: report.total_alternatives || 0, color: 'text-[#e84040]' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-3 text-center">
                <stat.icon size={18} className={`mx-auto mb-1 ${stat.color}`} />
                <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-[#5a6880] font-mono tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 mb-4 text-[11px] font-mono text-[#5a6880]">
            <span>🎯 <b className="text-[#e8a020]">{report.target}</b></span>
            <span>🔍 {report.total_platforms_checked || '500+'} plataformas</span>
            <span>🎯 Confianza: <b className={confidence > 0.7 ? 'text-[#40c880]' : 'text-[#e8a020]'}>{Math.round(confidence * 100)}%</b></span>
            <span>⚠️ Riesgo: <b className={risk > 0.5 ? 'text-[#e84040]' : 'text-[#5a6880]'}>{Math.round(risk * 100)}%</b></span>
          </div>

          {emails.length > 0 && <Section title="EMAILS" icon={Mail} color="#40c880"><div className="flex flex-wrap gap-2">{emails.map((e: string) => <Chip key={e} icon="✉️" text={e} />)}</div></Section>}
          {phones.length > 0 && <Section title="TELÉFONOS" icon={Phone} color="#e8a020"><div className="flex flex-wrap gap-2">{phones.map((p: string) => <Chip key={p} icon="📞" text={p} />)}</div></Section>}
          {names.length > 0 && <Section title="NOMBRES" icon={Users} color="#a060e8"><div className="flex flex-wrap gap-2">{names.map((n: string) => <Chip key={n} icon="👤" text={n} />)}</div></Section>}
          {locations.length > 0 && <Section title="UBICACIONES" icon={MapPin} color="#20c8c8"><div className="flex flex-wrap gap-2">{locations.map((l: string) => <Chip key={l} icon="📍" text={l} />)}</div></Section>}
          {workplaces.length > 0 && <Section title="TRABAJOS" icon={Briefcase} color="#4080e8"><div className="flex flex-wrap gap-2">{workplaces.map((w: string) => <Chip key={w} icon="💼" text={w} />)}</div></Section>}
          {education.length > 0 && <Section title="EDUCACIÓN" icon={GraduationCap} color="#40c880"><div className="flex flex-wrap gap-2">{education.map((e: string) => <Chip key={e} icon="🎓" text={e} />)}</div></Section>}

          {profiles.length > 0 && (
            <Section title={`PERFILES (${profiles.length})`} icon={Globe} color="#4080e8">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {profiles.slice(0, 80).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-[#0c0f16] border border-[#1c2435] rounded-lg px-3 py-2 hover:border-[#3a4a60] transition-colors">
                    <span className="text-lg">🔗</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#d4dce8] font-medium truncate">{p.platform}</div>
                      <div className="text-[11px] text-[#5a6880] truncate">{p.url}</div>
                    </div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#5a6880] hover:text-[#e8a020]"><ExternalLink size={14} /></a>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {insights.length > 0 && (
            <Section title="INSIGHTS" icon={Lightbulb} color="#e8a020">
              <div className="space-y-2">{insights.map((i: string, idx: number) => <div key={idx} className="p-2 bg-[#0c0f16] border border-[#1c2435] rounded-lg text-xs text-[#8a98b0]">{i}</div>)}</div>
            </Section>
          )}

          {recommendations.length > 0 && (
            <Section title="RECOMENDACIONES" icon={Shield} color="#40c880">
              <div className="space-y-2">{recommendations.map((r: string, idx: number) => <div key={idx} className="p-2 bg-[#0c0f16] border border-[#40c880]/20 rounded-lg text-xs text-[#40c880]">{r}</div>)}</div>
            </Section>
          )}

          <div className="flex gap-3 mt-6 flex-wrap">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={importOSINT}
              className="flex items-center gap-2 px-5 py-2 bg-[#e8a020] text-black rounded-lg text-xs font-bold tracking-wider hover:bg-[#f0b840]">
              <Import size={14} /> IMPORTAR A SUJETO
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={exportJSON}
              className="flex items-center gap-2 px-5 py-2 bg-[#161c2a] border border-[#252d40] text-[#d4dce8] rounded-lg text-xs font-bold tracking-wider hover:border-[#e8a020]">
              <Download size={14} /> EXPORTAR JSON
            </motion.button>
            {getAIConfig().apiKey && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={verifyWithAI}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#4020a0] to-[#a060e8] text-white rounded-lg text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(160,96,232,0.3)]">
                <Sparkles size={14} /> VERIFICAR CON IA
              </motion.button>
            )}
            {getAIConfig().apiKey && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={filterWithAI} disabled={filtering}
                className="flex items-center gap-2 px-5 py-2 bg-[#161c2a] border border-[#a060e8] text-[#a060e8] rounded-lg text-xs font-bold tracking-wider hover:bg-[#a060e8]/10 disabled:opacity-50">
                {filtering ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} FILTRAR CON IA
              </motion.button>
            )}
          </div>

          {aiVerification && (
            <div className="mt-4 p-4 bg-[#111520] border border-[#2a1a4a] rounded-lg">
              <div className="font-mono text-[10px] text-[#a060e8] tracking-wider mb-2">🧠 VERIFICACIÓN IA</div>
              <div className="text-xs text-[#d4dce8] whitespace-pre-wrap leading-relaxed">{aiVerification}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1c2435]">
        <Icon size={14} style={{ color }} />
        <span className="font-mono text-[10px] tracking-[2px]" style={{ color }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#111520] border border-[#252d40] rounded-lg text-xs text-[#d4dce8]">{icon} {text}</span>;
}
