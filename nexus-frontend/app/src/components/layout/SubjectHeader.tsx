import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { motion } from 'framer-motion';
import { User, Calendar, Globe, Shield, Save, Camera, Loader2 } from 'lucide-react';

const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
const riskLabels: Record<string, string> = { low: 'BAJO', medium: 'MEDIO', high: 'ALTO', critical: 'CRÍTICO' };
const riskConfig: Record<string, { color: string; bg: string; border: string }> = {
  low:    { color: 'text-[#40c880]', bg: 'bg-[#40c880]/10', border: 'border-[#40c880]/30' },
  medium: { color: 'text-[#e8a020]', bg: 'bg-[#e8a020]/10', border: 'border-[#e8a020]/30' },
  high:   { color: 'text-[#e84040]', bg: 'bg-[#e84040]/10', border: 'border-[#e84040]/30' },
  critical: { color: 'text-[#ff6060]', bg: 'bg-[#ff6060]/15', border: 'border-[#ff6060]/40' },
};
const statuses = ['active', 'inactive', 'suspect', 'closed'] as const;
const statusLabels: Record<string, string> = { active: 'ACTIVO', inactive: 'INACTIVO', suspect: 'SOSPECHOSO', closed: 'CERRADO' };

export default function SubjectHeader() {
  const store = useAppStore();
  const { currentSubject, setCurrentSubject, subjects, setSubjects, addNotification, media } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  if (!currentSubject) return null;
  const subj = currentSubject;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [riskLevel, setRiskLevel] = useState<string>('low');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const risk = riskConfig[subj.risk_level] || riskConfig.low;
  const primaryPhoto = media.find(m => m.is_primary && m.type === 'image');

  function startEdit() {
    setName(subj.name); setDob(subj.dob || ''); setGender(subj.gender || ''); setNationality(subj.nationality || '');
    setStatus(subj.status); setRiskLevel(subj.risk_level); setTags(subj.tags || []); setEditing(true);
  }

  async function saveEdit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.subjects.update(subj.id, { name: name.trim(), dob: dob || null, gender: gender || null,
        nationality: nationality || null, status, risk_level: riskLevel, tags, aliases: subj.aliases || [], notes: subj.notes || '' });
      const updated = await api.subjects.get(subj.id);
      setCurrentSubject(updated);
      setSubjects(subjects.map(s => s.id === updated.id ? updated : s));
      setEditing(false);
      addNotification('Guardado', 'success');
    } catch (e: any) { addNotification('Error: ' + e.message, 'error'); }
    setSaving(false);
  }

  function cycleRisk() {
    const idx = riskLevels.indexOf(riskLevel as any);
    setRiskLevel(riskLevels[(idx + 1) % riskLevels.length]);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  }

  async function uploadProfilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('is_primary', '1');
      await api.media.upload(subj.id, fd);
      const updated = await api.media.list(subj.id);
      useAppStore.getState().setMedia(updated);
      addNotification('Foto actualizada', 'success');
    } catch (e: any) { addNotification('Error: ' + e.message, 'error'); }
    setUploadingPhoto(false);
  }

  return (
    <motion.div key={subj.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0c0f16]/95 backdrop-blur-md border-b border-[#1c2435] px-6 py-4">
      <div className="flex items-start gap-5">
        {/* Photo */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div onClick={() => fileRef.current?.click()}
            className="relative w-[90px] h-[110px] rounded-lg bg-[#111520] border-2 border-[#252d40] overflow-hidden flex items-center justify-center text-[#5a6880] cursor-pointer hover:border-[#e8a020] transition-colors group">
            {primaryPhoto ? <img src={`/uploads/${primaryPhoto.filename}`} alt="" className="w-full h-full object-cover" />
              : <User size={36} className="group-hover:scale-110 transition-transform" />}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPhoto ? <Loader2 size={20} className="animate-spin text-white" /> : <Camera size={20} className="text-white" />}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadProfilePhoto} />
          <span className="font-mono text-[9px] text-[#5a6880] tracking-wider">FOTO</span>
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input value={name} onChange={e => setName(e.target.value)}
                  className="flex-1 bg-[#111520] border border-[#252d40] rounded px-2 py-1 text-lg font-bold text-white outline-none focus:border-[#e8a020]" />
                <span onClick={cycleRisk}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider border cursor-pointer ${riskConfig[riskLevel]?.color || risk.color} ${riskConfig[riskLevel]?.bg || risk.bg} ${riskConfig[riskLevel]?.border || risk.border}`}>
                  {riskLabels[riskLevel] || 'BAJO'}
                </span>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="bg-[#111520] border border-[#252d40] rounded px-2 py-1 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                  {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">FECHA NAC.</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                    className="w-full bg-[#111520] border border-[#252d40] rounded px-2 py-1 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" /></div>
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">GÉNERO</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full bg-[#111520] border border-[#252d40] rounded px-2 py-1 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                    <option value="">—</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">No binario</option>
                  </select></div>
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">NACIONALIDAD</label>
                  <input value={nationality} onChange={e => setNationality(e.target.value)}
                    className="w-full bg-[#111520] border border-[#252d40] rounded px-2 py-1 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" /></div>
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">ALIAS</label>
                  <div className="text-xs text-[#d4dce8] truncate pt-1">{(subj.aliases || []).join(', ') || '—'}</div></div>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#161c2a] border border-[#252d40] rounded-full text-[11px] text-[#8a98b0]">
                    {t} <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-[#5a6880] hover:text-[#e84040]">✕</button>
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
                  placeholder="+ tag" className="bg-transparent border-none text-[11px] text-[#5a6880] outline-none w-16 placeholder:text-[#3a4a60]" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">{subj.name}</h1>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider border ${risk.color} ${risk.bg} ${risk.border}`}>
                  {riskLabels[subj.risk_level]}</span>
                <span className={`text-xs font-mono ${subj.status === 'active' ? 'text-[#40c880]' : subj.status === 'suspect' ? 'text-[#e8a020]' : subj.status === 'closed' ? 'text-[#e84040]' : 'text-[#5a6880]'}`}>
                  {statusLabels[subj.status]}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-3">
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">FECHA NAC.</label>
                  <div className="flex items-center gap-1.5 text-sm text-[#d4dce8]"><Calendar size={12} className="text-[#5a6880]" /> {subj.dob || '—'}</div></div>
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">GÉNERO</label>
                  <div className="flex items-center gap-1.5 text-sm text-[#d4dce8]"><Shield size={12} className="text-[#5a6880]" />
                    {subj.gender === 'M' ? 'Masculino' : subj.gender === 'F' ? 'Femenino' : subj.gender === 'X' ? 'No binario' : '—'}</div></div>
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">NACIONALIDAD</label>
                  <div className="flex items-center gap-1.5 text-sm text-[#d4dce8]"><Globe size={12} className="text-[#5a6880]" /> {subj.nationality || '—'}</div></div>
                <div><label className="text-[9px] font-mono text-[#5a6880] tracking-wider block mb-0.5">ALIAS</label>
                  <div className="text-sm text-[#d4dce8] truncate">{(subj.aliases || []).join(', ') || '—'}</div></div>
              </div>
              {subj.tags && subj.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {subj.tags.map(t => <span key={t} className="px-2.5 py-0.5 bg-[#161c2a] border border-[#252d40] rounded-full text-[11px] text-[#8a98b0]">{t}</span>)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {editing ? (
            <>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={saveEdit} disabled={saving || !name.trim()}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold tracking-wider hover:bg-[#f0b840] disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} GUARDAR
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#161c2a] border border-[#252d40] text-[#d4dce8] rounded-md text-[11px] font-bold">CANCELAR</motion.button>
            </>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={startEdit}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#161c2a] border border-[#252d40] text-[#d4dce8] rounded-md text-[11px] font-bold tracking-wider hover:border-[#e8a020]">
              <Save size={14} /> EDITAR
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
