import { useState } from 'react'; import { useAppStore } from '@/store/useAppStore'; import * as api from '@/lib/api'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, Pin, X, Loader2 } from 'lucide-react';
const CAT_COLORS: Record<string,string> = { general:'#5a6880', intel:'#4080e8', surveillance:'#e84040', financial:'#40c880', legal:'#e8a020', personal:'#a060e8', hypothesis:'#20c8c8' };
export default function NotesSection() {
  const { currentSubject, notes, setNotes, addNotification } = useAppStore();
  const [modal, setModal] = useState(false); const [editId, setEditId] = useState<string|null>(null); const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [category, setCategory] = useState('general'); const [pinned, setPinned] = useState(false); const [saving, setSaving] = useState(false);
  async function load() { if (currentSubject) { const d = await api.notes.list(currentSubject.id); setNotes(d); } }
  function openNew() { setEditId(null); setTitle(''); setContent(''); setCategory('general'); setPinned(false); setModal(true); }
  function openEdit(n: any) { setEditId(n.id); setTitle(n.title); setContent(n.content); setCategory(n.category); setPinned(!!n.is_pinned); setModal(true); }
  async function save() { if (!title.trim() || !content.trim() || !currentSubject) return; setSaving(true); try {
    const data = { title: title.trim(), content: content.trim(), category, is_pinned: pinned };
    if (editId) await api.notes.update(editId, data); else await api.notes.create(currentSubject.id, data);
    setModal(false); await load(); addNotification('Nota guardada', 'success');
  } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { if (!confirm('¿Eliminar nota?')) return; await api.notes.delete(id); await load(); }
  const sorted = [...notes].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4"><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">NOTAS</span>
      <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> NOTA</button>
    </div>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[550px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">{editId ? 'EDITAR' : 'NUEVA'} NOTA</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <div className="flex gap-3"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título *" className="flex-1 bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
              <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                {Object.keys(CAT_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Contenido *" rows={8}
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] resize-none" />
            <label className="flex items-center gap-2 text-xs text-[#8a98b0]"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)} className="accent-[#e8a020]" /> Fijar nota</label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={save} disabled={saving || !title.trim() || !content.trim()}
              className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold hover:bg-[#f0b840] disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>
    <div className="space-y-3">{sorted.map(n => (
      <div key={n.id} onClick={() => openEdit(n)} className={`bg-[#0c0f16] border rounded-lg p-4 cursor-pointer hover:border-[#c47010]/50 transition-all group ${n.is_pinned ? 'border-[#c47010]/30 bg-[#c47010]/[0.02]' : 'border-[#1c2435]'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1"><div className="flex items-center gap-2">
            {n.is_pinned && <Pin size={12} className="text-[#e8a020]" />}
            <span className="text-sm font-semibold text-[#d4dce8]">{n.title}</span>
          </div>
            <p className="text-xs text-[#8a98b0] mt-1 line-clamp-2">{n.content}</p>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background:`${CAT_COLORS[n.category]||'#5a6880'}22`, color:CAT_COLORS[n.category]||'#5a6880' }}>{n.category.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-[#5a6880] font-mono">{n.updated_at?.slice(0,10)}</span>
          <button onClick={e => { e.stopPropagation(); del(n.id); }} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100 ml-auto"><Trash2 size={12} /></button>
        </div>
      </div>
    ))}</div>
    {notes.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin notas</p>}
  </div>);
}
