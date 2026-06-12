import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Eye, Edit3, Trash2, UserPlus, Download, Upload, Shield, Loader2, RefreshCw, Package } from 'lucide-react';

export default function AuditSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [backups, setBackups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetch('/api/audit').then(r=>r.json()).then(setLogs).catch(()=>{}); loadBackups(); }, []);

  async function loadBackups() {
    try { const r = await fetch('/api/backups'); const d = await r.json(); setBackups(d.backups || []); } catch {}
  }

  async function createBackup() {
    setLoading(true); setMsg('Creando backup...');
    try { await fetch('/api/backup', { method: 'POST' }); setMsg('✅ Backup creado'); await loadBackups(); } catch { setMsg('❌ Error'); }
    setLoading(false);
  }

  async function createRecoveryPackage() {
    if (!confirm('¿Crear Recovery Package (.nrb)? Incluye base de datos, multimedia, archivos OSINT. Puede tardar unos segundos.')) return;
    setLoading(true); setMsg('Creando Recovery Package...');
    try { const r = await fetch('/api/recovery-package', { method: 'POST' }); const d = await r.json(); if (d.ok) setMsg('✅ Recovery Package creado'); else setMsg('❌ ' + (d.error || 'Error')); } catch { setMsg('❌ Error'); }
    setLoading(false);
  }

  async function restoreBackup(name: string) {
    if (!confirm(`¿Restaurar backup ${name}? Se reemplazará toda la base de datos actual.`)) return;
    setLoading(true); setMsg('Restaurando...');
    try {
      const r = await fetch(`/api/backup/restore/${name}`, { method: 'POST' });
      const d = await r.json();
      if (d.ok) { setMsg('✅ Restaurado. Recargá la página.'); setTimeout(() => location.reload(), 1500); }
      else setMsg('❌ ' + (d.error || 'Error'));
    } catch { setMsg('❌ Error de conexión'); }
    setLoading(false);
  }

  async function recoverFromOSINT() {
    if (!confirm('¿Recuperar sujetos desde los reportes OSINT? Se crearán sujetos nuevos con los datos disponibles.')) return;
    setLoading(true); setMsg('Recuperando...');
    try {
      const r = await fetch('/api/recover-from-osint', { method: 'POST' });
      const d = await r.json();
      if (d.ok) setMsg(`✅ ${d.subjects_created} sujetos recuperados. Recargá.`);
      else setMsg('❌ ' + (d.error || 'Error'));
      setTimeout(() => location.reload(), 2000);
    } catch { setMsg('❌ Error'); }
    setLoading(false);
  }

  const icons: Record<string,any> = { create: <UserPlus size={14} className="text-[#40c880]" />, update: <Edit3 size={14} className="text-[#e8a020]" />, delete: <Trash2 size={14} className="text-[#e84040]" />, view: <Eye size={14} className="text-[#4080e8]" /> };

  return (
    <div className="p-6">
      {/* Backup section */}
      <div className="mb-6 bg-[#0c0f16] border border-[#1c2435] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px] flex items-center gap-2"><Shield size={12} /> BACKUP Y SEGURIDAD</span>
          <div className="flex gap-2">
            <button onClick={createBackup} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#40c880] text-black rounded text-[10px] font-bold tracking-wider hover:bg-[#60e890] disabled:opacity-50">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} BACKUP
            </button>
            <button onClick={recoverFromOSINT} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#e8a020] text-black rounded text-[10px] font-bold tracking-wider hover:bg-[#f0b840] disabled:opacity-50">
              <RefreshCw size={12} /> RECUPERAR OSINT
            </button>
            <button onClick={createRecoveryPackage} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#a060e8] text-white rounded text-[10px] font-bold tracking-wider hover:bg-[#b070f8] disabled:opacity-50">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />} .NRB
            </button>
          </div>
        </div>
        {msg && <p className="text-xs text-[#8a98b0] mb-2">{msg}</p>}
        {backups.length > 0 && (
          <div className="space-y-1">
            {backups.slice(0, 10).map(b => (
              <div key={b} className="flex items-center justify-between bg-[#111520] rounded px-3 py-1.5">
                <span className="text-[11px] font-mono text-[#d4dce8]">{b.replace('nexus_backup_','').replace('.db','')}</span>
                <button onClick={() => restoreBackup(b)}
                  className="flex items-center gap-1 text-[10px] text-[#e8a020] hover:text-[#f0b840]">
                  <Upload size={10} /> Restaurar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="flex items-center gap-2 mb-4"><History size={14} className="text-[#5a6880]" /><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">HISTORIAL DE CAMBIOS</span></div>
      {logs.length === 0 ? <p className="text-[#5a6880] text-sm py-8 text-center">Sin actividad registrada</p> : (
        <div className="space-y-1">{logs.map(l => (
          <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-[#0c0f16] border border-[#1c2435] rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#3a4a60] transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#111520] flex items-center justify-center">{icons[l.action] || <Eye size={14} className="text-[#5a6880]" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase" style={{ color: l.action === 'create' ? '#40c880' : l.action === 'delete' ? '#e84040' : l.action === 'update' ? '#e8a020' : '#4080e8' }}>{l.action}</span>
                <span className="text-[10px] text-[#5a6880] font-mono">{l.entity_type?.toUpperCase()}</span>
              </div>
              <p className="text-xs text-[#d4dce8] mt-0.5">{l.details || l.action + ' en ' + (l.entity_type||'?')}</p>
            </div>
            <span className="text-[10px] text-[#5a6880] font-mono whitespace-nowrap">{l.created_at?.slice(0,16).replace('T',' ')}</span>
          </motion.div>
        ))}</div>
      )}
    </div>
  );
}
