import { useState } from 'react'; import { useAppStore } from '@/store/useAppStore'; import * as api from '@/lib/api'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, X, Loader2 } from 'lucide-react';
const CT_ICONS: Record<string, string> = { phone:'📞', mobile:'📱', email:'✉️', telegram:'💬', whatsapp:'📲', facebook:'🌐', instagram:'📸', twitter:'🐦', tiktok:'🎵', other:'🔗' };
export default function ContactsSection() {
  const { currentSubject, contacts, setContacts, addNotification } = useAppStore();
  const [modal, setModal] = useState(false); const [ctType, setCtType] = useState('phone'); const [value, setValue] = useState(''); const [label, setLabel] = useState(''); const [saving, setSaving] = useState(false);
  async function load() { if (currentSubject) { const d = await api.contacts.list(currentSubject.id); setContacts(d); } }
  async function save() { if (!value.trim() || !currentSubject) return; setSaving(true); try {
    await api.contacts.create(currentSubject.id, { contact_type: ctType, value: value.trim(), label }); setModal(false); await load(); addNotification('Contacto guardado', 'success');
  } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { await api.contacts.delete(id); await load(); }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4"><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">CONTACTOS</span>
      <button onClick={() => { setCtType('phone'); setValue(''); setLabel(''); setModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> CONTACTO</button>
    </div>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[400px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020] tracking-wider">NUEVO CONTACTO</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <select value={ctType} onChange={e=>setCtType(e.target.value)} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
              {Object.keys(CT_ICONS).map(t => <option key={t} value={t}>{CT_ICONS[t]} {t}</option>)}
            </select>
            <input value={value} onChange={e=>setValue(e.target.value)} placeholder="Valor *"
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Etiqueta (ej: Personal, Trabajo)"
              className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880] hover:text-white">Cancelar</button>
            <button onClick={save} disabled={saving || !value.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold hover:bg-[#f0b840] disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>
    <div className="flex flex-wrap gap-2">{contacts.map(c => (
      <div key={c.id} className="flex items-center gap-2 bg-[#0c0f16] border border-[#1c2435] rounded-lg px-3 py-2 hover:border-[#3a4a60] group">
        <span className="text-sm">{CT_ICONS[c.contact_type] || '🔗'}</span>
        <span className="text-xs text-[#d4dce8]">{c.value}</span>
        {c.label && <span className="text-[10px] text-[#5a6880]">({c.label})</span>}
        <button onClick={() => del(c.id)} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
      </div>
    ))}</div>
    {contacts.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin contactos</p>}
  </div>);
}
