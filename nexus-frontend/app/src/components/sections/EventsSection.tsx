import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Pencil, Trash2, X, Loader2, Filter, List } from 'lucide-react';

const typeColors: Record<string, string> = { activity:'#4080e8', meeting:'#40c880', travel:'#a060e8', transaction:'#e8a020', communication:'#20c8c8', incident:'#e84040', arrest:'#ff6060', other:'#5a6880' };
const typeLabels: Record<string, string> = { activity:'Actividad', meeting:'Reunión', travel:'Viaje', transaction:'Transacción', communication:'Comunicación', incident:'Incidente', arrest:'Detención', other:'Otro' };
const impColors: Record<string, string> = { low:'#5a6880', normal:'#e8a020', high:'#e84040', critical:'#ff6060' };
const typeFilters = ['all','activity','meeting','travel','transaction','communication','incident','arrest','other'];
const impFilters = ['all','critical','high','normal','low'];

export default function EventsSection() {
  const { currentSubject, events, setEvents, addNotification } = useAppStore();
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [typeFilter, setTypeFilter] = useState('all');
  const [impFilter, setImpFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [evType, setEvType] = useState('activity');
  const [importance, setImportance] = useState('normal'); const [location, setLocation] = useState(''); const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = events.filter(e => (typeFilter === 'all' || e.event_type === typeFilter) && (impFilter === 'all' || e.importance === impFilter));
  const sorted = [...filtered].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

  async function load() { if (currentSubject) { const d = await api.events.list(currentSubject.id); setEvents(d); } }

  function openNew() { setEditId(null); setTitle(''); setDate(''); setEvType('activity'); setImportance('normal'); setLocation(''); setDescription(''); setModal(true); }
  function openEdit(e: any) { setEditId(e.id); setTitle(e.title); setDate(e.date?.slice(0,16)||''); setEvType(e.event_type); setImportance(e.importance); setLocation(e.location||''); setDescription(e.description||''); setModal(true); }

  async function save() {
    if (!title.trim() || !currentSubject) return; setSaving(true);
    try {
      const data = { title: title.trim(), date: date || null, event_type: evType, importance, location, description };
      if (editId) await api.events.update(editId, data); else await api.events.create(currentSubject.id, data);
      setModal(false); await load(); addNotification('Evento guardado', 'success');
    } catch (e: any) { addNotification('Error: ' + e.message, 'error'); }
    setSaving(false);
  }
  async function del(id: string) { if (!confirm('¿Eliminar evento?')) return; await api.events.delete(id); await load(); }

  // Timeline drag
  const handleDragStart = useCallback((e: React.MouseEvent, eventId: string) => {
    e.preventDefault(); setDraggingId(eventId);
    const startX = e.clientX; const ev = events.find(ev => ev.id === eventId); if (!ev) return;
    const origDate = ev.date || '';
    const handleMove = (me: MouseEvent) => {
      const dx = me.clientX - startX; const cw = containerRef.current?.offsetWidth || 1000;
      const daysDelta = Math.round((dx / cw) * 365);
      if (origDate) {
        const d = new Date(origDate); d.setDate(d.getDate() + daysDelta);
        // We don't save while dragging, just show indicator
      }
    };
    const handleUp = () => { setDraggingId(null); document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove); document.addEventListener('mouseup', handleUp);
  }, [events]);

  return (<div className="p-6">
    {/* Toolbar */}
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-mono border transition-colors ${showFilters ? 'border-[#e8a020] text-[#e8a020] bg-[#e8a020]/10' : 'border-[#252d40] text-[#5a6880]'}`}>
          <Filter size={12} /> Filtros
        </button>
        <div className="flex border border-[#252d40] rounded overflow-hidden">
          <button onClick={() => setView('list')} className={`p-1.5 ${view === 'list' ? 'bg-[#e8a020]/20 text-[#e8a020]' : 'text-[#5a6880]'}`}><List size={14} /></button>
          <button onClick={() => setView('timeline')} className={`p-1.5 ${view === 'timeline' ? 'bg-[#e8a020]/20 text-[#e8a020]' : 'text-[#5a6880]'}`}><span className="text-[10px] font-bold">⊞</span></button>
        </div>
      </div>
      <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a020] text-black rounded text-[11px] font-bold hover:bg-[#f0b840]"><Plus size={12} /> EVENTO</button>
    </div>

    {/* Filters */}
    {showFilters && (
      <div className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-3 mb-4 space-y-3">
        <div><label className="text-[10px] text-[#5a6880] font-mono tracking-wider block mb-1">TIPO</label>
          <div className="flex flex-wrap gap-1">{typeFilters.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${typeFilter === t ? 'border-[#e8a020] text-[#e8a020] bg-[#e8a020]/10' : 'border-[#1c2435] text-[#5a6880]'}`}>
              {t === 'all' ? 'Todos' : typeLabels[t] || t}</button>
          ))}</div></div>
        <div><label className="text-[10px] text-[#5a6880] font-mono tracking-wider block mb-1">IMPORTANCIA</label>
          <div className="flex flex-wrap gap-1">{impFilters.map(i => (
            <button key={i} onClick={() => setImpFilter(i)}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${impFilter === i ? 'border-[#e8a020] text-[#e8a020] bg-[#e8a020]/10' : 'border-[#1c2435] text-[#5a6880]'}`}>
              {i === 'all' ? 'Todas' : i}</button>
          ))}</div></div>
      </div>
    )}

    {/* Modal */}
    <AnimatePresence>{modal && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)}>
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
          className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[500px] max-w-[90vw]">
          <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020] tracking-wider">{editId ? 'EDITAR' : 'NUEVO'} EVENTO</span><button onClick={() => setModal(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
          <div className="space-y-3">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título *" className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            <div className="grid grid-cols-2 gap-3">
              <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
              <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ubicación" className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={evType} onChange={e=>setEvType(e.target.value)} className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                {typeFilters.filter(t=>t!=='all').map(t => <option key={t} value={t}>{typeLabels[t]||t}</option>)}
              </select>
              <select value={importance} onChange={e=>setImportance(e.target.value)} className="bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]">
                {impFilters.filter(i=>i!=='all').map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descripción" rows={3} className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] resize-none" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
            <button onClick={save} disabled={saving || !title.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'GUARDAR'}
            </button>
          </div>
        </motion.div>
      </div>
    )}</AnimatePresence>

    {/* Interactive Timeline View */}
    {view === 'timeline' && sorted.length > 0 && (
      <div ref={containerRef} className="relative bg-[#0c0f16] border border-[#1c2435] rounded-lg overflow-x-auto" style={{ height: Math.max(300, Math.ceil(sorted.length/2) * 140 + 60) }}>
        {/* Axis line */}
        <div className="absolute left-0 right-0 top-10 h-[2px] bg-gradient-to-r from-transparent via-[#e8a020]/40 to-transparent" />
        {/* Events */}
        {sorted.map((ev, idx) => {
          const lane = idx % 2; const topPos = 55 + lane * 130;
          const pctX = sorted.length > 1 ? ((idx) / (sorted.length - 1)) * 90 + 5 : 50;
          return (
            <div key={ev.id}
              className="absolute cursor-grab active:cursor-grabbing group"
              style={{ left: `${pctX}%`, top: `${topPos}px`, transform: 'translateX(-50%)', zIndex: draggingId === ev.id ? 50 : 10 }}
              onMouseDown={(e) => handleDragStart(e, ev.id)}>
              {/* Connector */}
              <div className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-[#e8a020]/30" style={{ top: lane === 0 ? '-20px' : 'auto', bottom: lane === 1 ? '-20px' : 'auto', height: '20px' }} />
              {/* Card */}
              <div className="bg-[#111520] border border-[#252d40] rounded-lg p-2.5 w-[200px] shadow-lg hover:border-[#e8a020]/50 transition-all group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${typeColors[ev.event_type]||'#5a6880'}22`, color: typeColors[ev.event_type]||'#5a6880' }}>{ev.event_type.toUpperCase()}</span>
                  <span className="text-[9px] font-mono" style={{ color: impColors[ev.importance] || '#5a6880' }}>{ev.importance.toUpperCase()}</span>
                </div>
                <div className="text-[11px] text-[#d4dce8] font-semibold truncate">{ev.title}</div>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-[#5a6880]">
                  🕐 {ev.date?.slice(0,10) || '?'}
                  {ev.location && <><MapPin size={10} /> {ev.location}</>}
                </div>
                <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(ev); }} className="text-[9px] text-[#e8a020] hover:text-[#f0b840]">✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); del(ev.id); }} className="text-[9px] text-[#e84040] hover:text-[#ff6060]">🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* List View */}
    {view === 'list' && (
      <div className="relative pl-6">
        <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-[#1c2435]" />
        <div className="space-y-4">
          {sorted.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity:0, x:-15 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.04 }} className="relative">
              <div className={`absolute -left-[21px] top-4 w-[10px] h-[10px] rounded-full border-2 border-[#080a0f] ${e.importance === 'critical' ? 'bg-[#ff6060] shadow-[0_0_8px_rgba(255,96,96,0.5)]' : e.importance === 'high' ? 'bg-[#e84040]' : e.importance === 'normal' ? 'bg-[#e8a020]' : 'bg-[#5a6880]'}`} />
              <div className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-4 hover:border-[#c47010]/50 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#d4dce8] group-hover:text-white">{e.title}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded border" style={{ background: `${typeColors[e.event_type]||'#5a6880'}22`, color: typeColors[e.event_type]||'#5a6880', borderColor: `${typeColors[e.event_type]||'#5a6880'}44` }}>{e.event_type.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px]">
                      {e.date && <span className="font-mono text-[#e8a020]">{e.date.replace('T',' ').slice(0,16)}</span>}
                      {e.location && <span className="text-[#5a6880] flex items-center gap-1"><MapPin size={10} /> {e.location}</span>}
                    </div>
                    {e.description && <p className="text-xs text-[#8a98b0] mt-2">{e.description}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-[#161c2a] text-[#5a6880] hover:text-[#e8a020]"><Pencil size={12} /></button>
                    <button onClick={() => del(e.id)} className="p-1.5 rounded hover:bg-[#e84040]/20 text-[#5a6880] hover:text-[#e84040]"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )}
    {sorted.length === 0 && <p className="text-[#5a6880] text-sm py-8 text-center">Sin eventos{typeFilter !== 'all' || impFilter !== 'all' ? ' con esos filtros' : ''}</p>}
  </div>);
}
