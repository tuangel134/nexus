import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react';

const riskColors: Record<string, string> = {
  low: 'bg-[#40c880]', medium: 'bg-[#e8a020]', high: 'bg-[#e84040]', critical: 'bg-[#ff6060] risk-pulse',
};

export default function Sidebar() {
  const { subjects, currentSubject, sidebarOpen, setCurrentSubject, setCurrentTab,
    setMedia, setEvents, setLocations, setRelations, setIdentifiers, setContacts, setNotes, setAIAnalyses, addNotification } = useAppStore();
  const [cases, setCases] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [showNewCase, setShowNewCase] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDetective, setNewDetective] = useState('');

  useEffect(() => {
    if (!sidebarOpen) return;
    fetch('/api/cases').then(r=>r.json()).then(d => {
      setCases(d);
      const exp: Record<string,boolean> = {};
      d.forEach((c:any) => { exp[c.id] = true; });
      exp['__none'] = true;
      setExpanded(exp);
    }).catch(() => {});
  }, [sidebarOpen, subjects.length, cases.length]);

  async function selectSubject(subject: any) {
    try {
      const [media, events, locations, relations, identifiers, contacts, notes, analyses] = await Promise.all([
        api.media.list(subject.id), api.events.list(subject.id), api.locations.list(subject.id),
        api.relations.list(subject.id), api.identifiers.list(subject.id), api.contacts.list(subject.id),
        api.notes.list(subject.id), api.ai.list(subject.id),
      ]);
      setCurrentSubject(subject); setMedia(media); setEvents(events); setLocations(locations);
      setRelations(relations); setIdentifiers(identifiers); setContacts(contacts); setNotes(notes); setAIAnalyses(analyses);
      setCurrentTab('overview');
    } catch (e: any) { addNotification('Error: ' + e.message, 'error'); }
  }

  async function createCase() {
    if (!newTitle.trim()) return;
    try {
      await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, description: newDesc, detective: newDetective }) });
      setShowNewCase(false); setNewTitle(''); setNewDesc(''); setNewDetective('');
      const d = await fetch('/api/cases').then(r=>r.json());
      setCases(d);
      addNotification('Caso creado', 'success');
    } catch (e: any) { addNotification('Error: ' + e.message, 'error'); }
  }

  async function deleteCase(id: string) {
    if (!confirm('¿Eliminar caso?')) return;
    await fetch(`/api/cases/${id}`, { method: 'DELETE' });
    setCases(cases.filter(c => c.id !== id));
  }

  async function deleteSubject(id: string, name: string) {
    if (!confirm(`¿Eliminar a "${name}" permanentemente?`)) return;
    try {
      const r = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (!r.ok) { addNotification(`Error al eliminar: ${await r.text()}`, 'error'); return; }
      addNotification(`"${name}" eliminado`, 'success');
      window.location.reload();
    } catch (e: any) {
      addNotification('Error: ' + e.message, 'error');
    }
  }

  if (!sidebarOpen) return null;

  const caseMap: Record<string, any[]> = {};
  const unassigned: any[] = [];
  cases.forEach((c: any) => { caseMap[c.id] = []; });
  subjects.forEach(s => {
    let assigned = false;
    for (const c of cases) {
      if ((c.subject_ids || []).includes(s.id)) { caseMap[c.id]?.push(s); assigned = true; break; }
    }
    if (!assigned) unassigned.push(s);
  });

  const toggleCase = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-full bg-[#0c0f16] border-r border-[#1c2435] flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1c2435] flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">CASOS</span>
        <button onClick={() => setShowNewCase(true)} className="text-[#e8a020] hover:text-[#f0b840] p-1 rounded hover:bg-[#1c2435]">
          <Plus size={14} />
        </button>
      </div>

      {/* New case modal */}
      {showNewCase && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowNewCase(false)}>
          <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
            className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[380px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-4"><span className="font-mono text-xs text-[#e8a020]">NUEVO CASO</span><button onClick={() => setShowNewCase(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button></div>
            <div className="space-y-3">
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Título *"
                className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
              <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Descripción" rows={2}
                className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020] resize-none" />
              <input value={newDetective} onChange={e=>setNewDetective(e.target.value)} placeholder="Detective asignado"
                className="w-full bg-[#111520] border border-[#252d40] rounded px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewCase(false)} className="px-4 py-1.5 text-xs text-[#5a6880]">Cancelar</button>
              <button onClick={createCase} disabled={!newTitle.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold disabled:opacity-50">CREAR</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Case list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {cases.map(c => (
          <div key={c.id}>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleCase(c.id)} className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-mono text-[#e8a020] hover:bg-[#111520] transition-colors">
                {expanded[c.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <FolderOpen size={12} />
                <span className="flex-1 text-left truncate">{c.case_number || c.title?.slice(0,20)}</span>
                <span className="text-[10px] text-[#5a6880]">{(caseMap[c.id]||[]).length}</span>
              </button>
              <button onClick={() => deleteCase(c.id)} className="text-[#5a6880] hover:text-[#e84040] p-1 rounded hover:bg-[#1c2435]" title="Eliminar caso"><Trash2 size={12} /></button>
            </div>
            <AnimatePresence>{expanded[c.id] && (caseMap[c.id]||[]).map((s, i) => (
              <SubjectItem key={s.id} subject={s} isActive={currentSubject?.id === s.id} delay={i} onSelect={selectSubject} onDelete={() => deleteSubject(s.id, s.name)} />
            ))}</AnimatePresence>
          </div>
        ))}
        {unassigned.length > 0 && (
          <div>
            <button onClick={() => toggleCase('__none')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-mono text-[#5a6880] hover:bg-[#111520] transition-colors">
              {expanded['__none'] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span className="flex-1 text-left truncate">Sin caso</span>
              <span className="text-[10px] text-[#5a6880]">{unassigned.length}</span>
            </button>
            <AnimatePresence>{expanded['__none'] && unassigned.map((s, i) => (
              <SubjectItem key={s.id} subject={s} isActive={currentSubject?.id === s.id} delay={i} onSelect={selectSubject} onDelete={() => deleteSubject(s.id, s.name)} />
            ))}</AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1c2435] font-mono text-[9px] text-[#5a6880] space-y-1">
        <div className="flex justify-between"><span>Crítico</span><span className="text-[#ff6060]">{subjects.filter(s => s.risk_level === 'critical').length}</span></div>
        <div className="flex justify-between"><span>Alto</span><span className="text-[#e84040]">{subjects.filter(s => s.risk_level === 'high').length}</span></div>
      </div>
    </motion.aside>
  );
}

function SubjectItem({ subject, isActive, delay, onSelect, onDelete }: { subject: any; isActive: boolean; delay: number; onSelect: (s: any) => void; onDelete: () => void }) {
  const initials = subject.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay * 0.03 }}
      className="flex items-center gap-1 pl-6 pr-1 py-0.5 group">
      <button onClick={() => onSelect(subject)}
        className={`flex-1 flex items-center gap-2 py-1.5 rounded transition-all text-left ${
          isActive ? 'text-[#e8a020] font-semibold' : 'text-[#d4dce8] hover:text-white'
        }`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-mono font-bold flex-shrink-0 ${isActive ? 'bg-[#e8a020]/20 text-[#e8a020]' : 'bg-[#161c2a] text-[#5a6880]'}`}>
          {initials}
        </div>
        <span className="text-[11px] truncate flex-1">{subject.name}</span>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskColors[subject.risk_level] || 'bg-[#5a6880]'}`} />
      </button>
      <button onClick={onDelete} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100 p-0.5" title="Eliminar sujeto"><X size={10} /></button>
    </motion.div>
  );
}
