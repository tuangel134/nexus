import { useState, useEffect } from 'react'; import { useAppStore } from '@/store/useAppStore'; import * as api from '@/lib/api'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, X, Loader2, Edit3, Book } from 'lucide-react';
export default function JournalSection() {
  const { currentSubject, addNotification } = useAppStore();
  const [entries, setEntries] = useState<any[]>([]); const [modal, setModal] = useState(false); const [editId, setEditId] = useState<string|null>(null);
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (currentSubject) load(); }, [currentSubject]);
  async function load() { if (!currentSubject) return; const all = await api.notes.list(currentSubject.id); setEntries(all.filter((n:any) => n.category === 'journal')); }
  function openNew() { setEditId(null); setTitle(''); setContent(''); setModal(true); }
  function openEdit(e: any) { setEditId(e.id); setTitle(e.title); setContent(e.content); setModal(true); }
  async function save() { if (!title.trim() || !content.trim() || !currentSubject) return; setSaving(true); try {
    const data = { title: title.trim(), content: content.trim(), category: 'journal', is_pinned: false };
    if (editId) await api.notes.update(editId, data); else await api.notes.create(currentSubject.id, data);
    setModal(false); await load(); addNotification('Guardado en cuaderno', 'success');
  } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { if (!confirm('¿Eliminar anotación?')) return; await api.notes.delete(id); await load(); }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4">
      <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px] flex items-center gap-2"><Book size={12} /> CUADERNO DEL INVESTIGADOR</span>
      <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> ANOTACIÓN</button>
    </div>
    <p className="text-[10px] text-[#5a6880] mb-4">Notas personales del investigador: hipótesis, preguntas, observaciones. Esto NO se envía a la IA.</p>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[550px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">{editId ? 'EDITAR' : 'NUEVA'} ANOTACIÓN</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título (hipótesis, pregunta, observación…)"
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Desarrollá tu idea…" rows={8}
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] resize-y" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={save} disabled={saving || !title.trim() || !content.trim()}
              className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>
    <div className="space-y-3">{entries.map(e => (
      <div key={e.id} onClick={() => openEdit(e)} className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-4 cursor-pointer hover:border-[#c47010]/50 transition-all group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2"><span className="text-sm font-semibold text-[#d4dce8]">{e.title}</span></div>
            <p className="text-xs text-[#8a98b0] mt-1 whitespace-pre-wrap">{e.content}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); openEdit(e); }} className="p-1 text-[#5a6880] hover:text-[#e8a020]"><Edit3 size={12} /></button>
            <button onClick={ev => { ev.stopPropagation(); del(e.id); }} className="p-1 text-[#5a6880] hover:text-[#e84040]"><Trash2 size={12} /></button>
          </div>
        </div>
        <div className="text-[10px] text-[#5a6880] font-mono mt-2">{e.updated_at?.slice(0,16).replace('T',' ')}</div>
      </div>
    ))}</div>
    {entries.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin anotaciones. Usá este espacio para hipótesis, preguntas y observaciones personales.</p>}
  </div>);
}
