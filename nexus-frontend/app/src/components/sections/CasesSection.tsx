import { useState, useEffect } from 'react'; import { useAppStore } from '@/store/useAppStore'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, FolderOpen, X, Loader2, UserCheck, UserPlus, UserX } from 'lucide-react';
async function fetchJSON<T>(method: string, path: string, body?: any): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
export default function CasesSection() {
  const { subjects, addNotification } = useAppStore();
  const [cases, setCases] = useState<any[]>([]); const [modal, setModal] = useState(false); const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [detective, setDetective] = useState(''); const [saving, setSaving] = useState(false);
  const [addSubjectModal, setAddSubjectModal] = useState<string | null>(null); const [selectedSubj, setSelectedSubj] = useState('');
  useEffect(() => { load(); }, []);
  async function load() { try { const d = await fetchJSON<any[]>('GET', '/api/cases'); setCases(d); } catch {} }
  async function create() { if (!title.trim()) return; setSaving(true); try { await fetchJSON('POST', '/api/cases', { title, description: desc, detective }); setModal(false); setTitle(''); setDesc(''); setDetective(''); await load(); addNotification('Caso creado', 'success'); } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { if (!confirm('¿Eliminar caso y sus asignaciones?')) return; await fetchJSON('DELETE', `/api/cases/${id}`); await load(); }
  async function addSubj(caseId: string) { if (!selectedSubj) return; await fetchJSON('POST', `/api/cases/${caseId}/subjects`, { subject_id: selectedSubj }); setAddSubjectModal(null); setSelectedSubj(''); await load(); addNotification('Sujeto agregado al caso', 'success'); }
  async function removeSubj(caseId: string, subjId: string) { await fetchJSON('DELETE', `/api/cases/${caseId}/subjects/${subjId}`); await load(); }
  async function delSubj(subjId: string) { if (!confirm('¿Eliminar sujeto permanentemente?')) return; await fetchJSON('DELETE', `/api/subjects/${subjId}`); window.location.reload(); }

  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4"><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">CASOS / EXPEDIENTES</span>
      <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> CASO</button>
    </div>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[450px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">NUEVO CASO</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título *"
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descripción" rows={3}
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] resize-none" />
            <input value={detective} onChange={e=>setDetective(e.target.value)} placeholder="Detective asignado"
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={create} disabled={saving || !title.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold hover:bg-[#f0b840] disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'CREAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>

    {/* Add subject modal */}
    <AnimatePresence>{addSubjectModal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setAddSubjectModal(null)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[400px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#40c880]">AGREGAR SUJETO AL CASO</span><button onClick={() => setAddSubjectModal(null)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <select value={selectedSubj} onChange={e=>setSelectedSubj(e.target.value)} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] mb-3">
            <option value="">Seleccionar sujeto…</option>
            {subjects.filter(s => !cases.find(c => c.id === addSubjectModal)?.subject_ids?.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddSubjectModal(null)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={() => addSubj(addSubjectModal!)} disabled={!selectedSubj} className="px-4 py-1.5 bg-[#40c880] text-black rounded text-xs font-bold disabled:opacity-50">AGREGAR</button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>

    <div className="space-y-4">{cases.map(c => (
      <div key={c.id} className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-4 hover:border-[#3a4a60] transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2"><FolderOpen size={14} className="text-[#e8a020]" />
              <span className="text-sm font-semibold text-[#d4dce8]">{c.case_number || c.id.slice(0,8)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${c.status === 'open' ? 'bg-[#40c880]/20 text-[#40c880]' : 'bg-[#5a6880]/20 text-[#5a6880]'}`}>{c.status?.toUpperCase()}</span>
            </div>
            <h3 className="text-sm font-semibold text-white mt-1">{c.title}</h3>
            {c.description && <p className="text-xs text-[#8a98b0] mt-1">{c.description}</p>}
            {c.detective && <div className="flex items-center gap-1 mt-1 text-[11px] text-[#5a6880]"><UserCheck size={12} /> {c.detective}</div>}
          </div>
          <button onClick={() => del(c.id)} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
        </div>
        {/* Subjects in case */}
        <div className="border-t border-[#1c2435] pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#5a6880] font-mono">SUJETOS ({c.subject_ids?.length || 0})</span>
            <button onClick={() => { setAddSubjectModal(c.id); setSelectedSubj(''); }} className="flex items-center gap-1 text-[10px] text-[#40c880] hover:text-[#60e890]">
              <UserPlus size={12} /> Agregar
            </button>
          </div>
          <div className="space-y-1">
            {(c.subject_ids || []).map((sid: string) => {
              const s = subjects.find(sub => sub.id === sid);
              return (
                <div key={sid} className="flex items-center justify-between bg-[#111520] rounded px-2 py-1 group/subj">
                  <span className="text-xs text-[#d4dce8]">{s?.name || sid.slice(0,8)}</span>
                  <div className="flex gap-1 opacity-0 group-hover/subj:opacity-100">
                    <button onClick={() => delSubj(sid)} className="text-[#e84040] hover:text-[#ff6060]" title="Eliminar sujeto"><UserX size={11} /></button>
                    <button onClick={() => removeSubj(c.id, sid)} className="text-[#e8a020] hover:text-[#f0b840]" title="Quitar del caso"><X size={11} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ))}</div>
    {cases.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin casos aún. Creá uno para agrupar sujetos.</p>}
  </div>);
}
