import { useState, useEffect } from 'react'; import { useAppStore } from '@/store/useAppStore'; import * as api from '@/lib/api'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, X, Loader2 } from 'lucide-react';
const STRENGTH_DOTS: Record<string,number> = { weak:1, medium:2, strong:3 };
export default function RelationsSection() {
  const { currentSubject, subjects, setSubjects, relations, setRelations, addNotification } = useAppStore();
  const [modal, setModal] = useState(false); const [otherId, setOtherId] = useState(''); const [relType, setRelType] = useState('friend'); const [strength, setStrength] = useState('medium'); const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState(''); const [creatingSubject, setCreatingSubject] = useState(false);
  useEffect(() => { if (currentSubject) load(); }, [currentSubject]);
  async function load() { if (currentSubject) { const d = await api.relations.list(currentSubject.id); setRelations(d); } }
  async function save() { if (!otherId || !currentSubject) return; setSaving(true); try {
    let targetId = otherId;
    if (targetId === '__new__') {
      if (!newName.trim()) { addNotification('Ingresá un nombre', 'error'); setSaving(false); return; }
      const res = await api.subjects.create({ name: newName.trim() });
      const sub = await api.subjects.get(res.id);
      setSubjects([...subjects, sub]);
      targetId = sub.id;
    }
    await api.relations.create({ subject_a_id: currentSubject.id, subject_b_id: targetId, relation_type: relType, strength }); setModal(false); await load(); addNotification('Relación creada', 'success');
  } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { await api.relations.delete(id); await load(); }
  const others = subjects.filter(s => s.id !== currentSubject?.id);
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4"><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">RELACIONES</span>
      <button onClick={() => { setOtherId(''); setRelType('friend'); setStrength('medium'); setNewName(''); setCreatingSubject(false); setModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> RELACIÓN</button>
    </div>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[400px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">NUEVA RELACIÓN</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <select value={otherId} onChange={e => { setOtherId(e.target.value); setCreatingSubject(e.target.value === '__new__'); }} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
              <option value="">Seleccionar sujeto…</option>
              <option value="__new__" className="text-[#e8a020]">✨ Crear nuevo sujeto…</option>
              {others.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {creatingSubject && (
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nombre del nuevo sujeto"
                className="w-full bg-[#111520] border border-[#e8a020] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none" />
            )}
            <div className="grid grid-cols-2 gap-3">
              <select value={relType} onChange={e=>setRelType(e.target.value)} className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                {['family','partner','friend','colleague','associate','boss','employee','rival','victim','witness','suspect','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={strength} onChange={e=>setStrength(e.target.value)} className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                {['weak','medium','strong'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={save} disabled={saving || !otherId} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold hover:bg-[#f0b840] disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>
    {relations.map(r => {
      const otherName = r.subject_a_id === currentSubject?.id ? r.name_b : r.name_a;
      const dots = STRENGTH_DOTS[r.strength] || 1;
      return (<div key={r.id} className="flex items-center gap-3 bg-[#0c0f16] border border-[#1c2435] rounded-lg p-3 mb-2 hover:border-[#3a4a60] group">
        <div className="w-9 h-9 rounded-full bg-[#111520] border border-[#252d40] flex items-center justify-center text-xs font-mono text-[#5a6880]">
          {otherName?.split(' ').map((w:any)=>w[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1"><div className="text-sm text-[#d4dce8] font-medium">{otherName}</div>
          <div className="text-[11px] text-[#5a6880]">{r.relation_type.toUpperCase()}</div></div>
        <div className="flex gap-0.5">{[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= dots ? 'bg-[#e8a020]' : 'bg-[#252d40]'}`} />)}</div>
        <button onClick={() => del(r.id)} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
      </div>);
    })}
    {relations.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin relaciones</p>}
  </div>);
}
