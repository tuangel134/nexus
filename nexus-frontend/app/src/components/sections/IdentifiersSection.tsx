import { useState } from 'react'; import { useAppStore } from '@/store/useAppStore'; import * as api from '@/lib/api'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, X, Loader2 } from 'lucide-react';
const ID_COLORS: Record<string,string> = { curp:'#4080e8', rfc:'#40c880', passport:'#e8a020', ine:'#a060e8', ssn:'#20c8c8', license:'#e84040', plate:'#ff6060', email:'#4080e8', phone:'#40c880', social:'#a060e8', bank:'#e8a020', ip:'#20c8c8', other:'#5a6880' };
export default function IdentifiersSection() {
  const { currentSubject, identifiers, setIdentifiers, addNotification } = useAppStore();
  const [modal, setModal] = useState(false); const [idType, setIdType] = useState('curp'); const [value, setValue] = useState(''); const [notes, setNotes] = useState(''); const [saving, setSaving] = useState(false);
  async function load() { if (currentSubject) { const d = await api.identifiers.list(currentSubject.id); setIdentifiers(d); } }
  async function save() { if (!value.trim() || !currentSubject) return; setSaving(true); try {
    await api.identifiers.create(currentSubject.id, { id_type: idType, value: value.trim(), notes }); setModal(false); await load(); addNotification('Identificador guardado', 'success');
  } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { await api.identifiers.delete(id); await load(); }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4"><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">IDENTIFICADORES</span>
      <button onClick={() => { setIdType('curp'); setValue(''); setNotes(''); setModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> IDENTIFICADOR</button>
    </div>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[400px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">NUEVO IDENTIFICADOR</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <select value={idType} onChange={e=>setIdType(e.target.value)} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
              {Object.keys(ID_COLORS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <input value={value} onChange={e=>setValue(e.target.value)} placeholder="Valor *" className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas" className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={save} disabled={saving || !value.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold hover:bg-[#f0b840] disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>
    <table className="w-full text-xs">
      <thead><tr className="text-[10px] text-[#5a6880] font-mono tracking-wider border-b border-[#1c2435]">
        <th className="text-left py-2 px-2">TIPO</th><th className="text-left py-2 px-2">VALOR</th><th className="text-left py-2 px-2">NOTAS</th><th className="text-left py-2 px-2">FECHA</th><th className="py-2 px-2"></th>
      </tr></thead>
      <tbody>{identifiers.map(i => (
        <tr key={i.id} className="border-b border-[#1c2435] hover:bg-[#111520]">
          <td className="py-2 px-2"><span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${ID_COLORS[i.id_type]||'#5a6880'}22`, color:ID_COLORS[i.id_type]||'#5a6880' }}>{i.id_type.toUpperCase()}</span></td>
          <td className="py-2 px-2 font-mono text-[#d4dce8]">{i.value}</td>
          <td className="py-2 px-2 text-[#5a6880]">{i.notes || '—'}</td>
          <td className="py-2 px-2 text-[#5a6880] font-mono">{i.created_at?.slice(0,10)}</td>
          <td className="py-2 px-2"><button onClick={() => del(i.id)} className="text-[#5a6880] hover:text-[#e84040]"><Trash2 size={12} /></button></td>
        </tr>
      ))}</tbody>
    </table>
    {identifiers.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin identificadores</p>}
  </div>);
}
