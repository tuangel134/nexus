import { useState } from 'react'; import { useAppStore } from '@/store/useAppStore'; import * as api from '@/lib/api'; import { motion, AnimatePresence } from 'framer-motion'; import { Plus, Trash2, MapPin, X, Loader2 } from 'lucide-react';
const TYPE_ICONS: Record<string,string> = { home:'🏠', work:'🏢', frequent:'⭐', temporary:'⏱', suspicious:'⚠️', other:'📍' };
export default function LocationsSection() {
  const { currentSubject, locations, setLocations, addNotification } = useAppStore();
  const [modal, setModal] = useState(false); const [name, setName] = useState(''); const [address, setAddress] = useState(''); const [locType, setLocType] = useState('frequent'); const [lat, setLat] = useState(''); const [lng, setLng] = useState(''); const [notes, setNotes] = useState(''); const [saving, setSaving] = useState(false);
  async function load() { if (currentSubject) { const d = await api.locations.list(currentSubject.id); setLocations(d); } }
  async function save() { if (!name.trim() || !currentSubject) return; setSaving(true); try {
    await api.locations.create(currentSubject.id, { name: name.trim(), address, location_type: locType, lat: parseFloat(lat)||null, lng: parseFloat(lng)||null, notes }); setModal(false); await load(); addNotification('Ubicación guardada', 'success');
  } catch (e: any) { addNotification('Error: ' + e.message, 'error'); } setSaving(false); }
  async function del(id: string) { await api.locations.delete(id); await load(); }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-4"><span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">UBICACIONES</span>
      <button onClick={() => { setName(''); setAddress(''); setLocType('frequent'); setLat(''); setLng(''); setNotes(''); setModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded-md text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> UBICACIÓN</button>
    </div>
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[400px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">NUEVA UBICACIÓN</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre *" className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Dirección" className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <select value={locType} onChange={e=>setLocType(e.target.value)} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
              {['home','work','frequent','temporary','suspicious','other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitud" type="number" step="any" className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
              <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitud" type="number" step="any" className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            </div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas" rows={2} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] resize-none" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={save} disabled={saving || !name.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold hover:bg-[#f0b840] disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>
    {locations.map(l => (
      <div key={l.id} className="flex items-center gap-3 bg-[#0c0f16] border border-[#1c2435] rounded-lg p-3 mb-2 hover:border-[#3a4a60] group">
        <span className="text-lg">{TYPE_ICONS[l.location_type]||'📍'}</span>
        <div className="flex-1"><div className="text-sm text-[#d4dce8] font-medium">{l.name}</div>
          {l.address && <div className="text-[11px] text-[#5a6880]">{l.address}</div>}
        </div>
        <span className="text-[10px] font-mono text-[#5a6880] px-2 py-0.5 bg-[#111520] rounded">{l.location_type.toUpperCase()}</span>
        {l.lat && <a href={`https://maps.google.com/?q=${l.lat},${l.lng}`} target="_blank" className="text-[#5a6880] hover:text-[#e8a020]"><MapPin size={14} /></a>}
        <button onClick={() => del(l.id)} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
      </div>
    ))}
    {locations.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin ubicaciones</p>}
  </div>);
}
