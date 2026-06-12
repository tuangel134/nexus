import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { Search, Plus, Menu, Shield, Activity, Smartphone, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopBar() {
  const {
    subjects, setSubjects, searchQuery, setSearchQuery,
    toggleSidebar, setCurrentSubject, setCurrentTab,
    setMedia, setEvents, setLocations, setRelations,
    setIdentifiers, setContacts, setNotes, setAIAnalyses,
    addNotification,
  } = useAppStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  function openQR() {
    setShowQR(true);
    setQrLoading(true);
    fetch('/api/qr')
      .then(r => r.blob())
      .then(blob => { setQrSrc(URL.createObjectURL(blob)); setQrLoading(false); })
      .catch(() => setQrLoading(false));
  }

  const filtered = searchQuery
    ? subjects.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  async function selectSubject(subject: any) {
    try {
      const [media, events, locations, relations,
             identifiers, contacts, notes, analyses] = await Promise.all([
        api.media.list(subject.id),
        api.events.list(subject.id),
        api.locations.list(subject.id),
        api.relations.list(subject.id),
        api.identifiers.list(subject.id),
        api.contacts.list(subject.id),
        api.notes.list(subject.id),
        api.ai.list(subject.id),
      ]);
      setCurrentSubject(subject);
      setMedia(media); setEvents(events); setLocations(locations);
      setRelations(relations); setIdentifiers(identifiers);
      setContacts(contacts); setNotes(notes); setAIAnalyses(analyses);
      setCurrentTab('overview');
      setSearchQuery('');
    } catch (e: any) {
      addNotification('Error: ' + e.message, 'error');
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const res = await api.subjects.create({ name: newName.trim() });
      const sub = await api.subjects.get(res.id);
      setSubjects([...subjects, sub]);
      await selectSubject(sub);
      setShowModal(false);
      setNewName('');
      addNotification('Sujeto creado', 'success');
    } catch (e: any) {
      addNotification('Error: ' + e.message, 'error');
    }
  }

  const totalMedia = subjects.reduce((a, s) => a + (s.media_count || 0), 0);
  const totalEvents = subjects.reduce((a, s) => a + (s.events_count || 0), 0);

  return (
    <header className="h-14 bg-[#0c0f16] border-b border-[#1c2435] flex items-center px-4 gap-4 flex-shrink-0 z-50 relative">
      <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-[#161c2a] transition-colors text-[#5a6880] hover:text-[#e8a020]">
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2">
        <Shield className="text-[#e8a020]" size={22} />
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[#e8a020] text-sm font-bold tracking-[3px] text-glow">NEXUS</span>
          <span className="font-mono text-[#5a6880] text-[10px] tracking-[2px] hidden sm:inline">INTEL PLATFORM</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-5 ml-6">
        <div className="font-mono text-[10px] text-[#5a6880]">SUJETOS: <span className="text-[#e8a020] font-bold">{subjects.length}</span></div>
        <div className="font-mono text-[10px] text-[#5a6880]">ARCHIVOS: <span className="text-[#e8a020] font-bold">{totalMedia}</span></div>
        <div className="font-mono text-[10px] text-[#5a6880]">EVENTOS: <span className="text-[#e8a020] font-bold">{totalEvents}</span></div>
      </div>

      <div className="flex-1" />

      <div className="relative">
        <div className={`flex items-center gap-2 bg-[#111520] border rounded-lg px-3 py-1.5 transition-all duration-200 ${
          searchFocused ? 'border-[#e8a020] w-72 shadow-[0_0_12px_rgba(232,160,32,0.15)]' : 'border-[#252d40] w-56'
        }`}>
          <Search size={14} className="text-[#5a6880] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Buscar sujeto..."
            className="bg-transparent border-none outline-none text-[13px] text-[#d4dce8] w-full placeholder:text-[#5a6880] font-light"
          />
        </div>

        <AnimatePresence>
          {searchFocused && searchQuery && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full right-0 mt-2 w-80 bg-[#0c0f16] border border-[#252d40] rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSubject(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#111520] transition-colors text-left border-b border-[#1c2435] last:border-none"
                >
                  <div className="w-8 h-8 rounded-full bg-[#161c2a] border border-[#252d40] flex items-center justify-center text-xs font-mono text-[#5a6880]">
                    {s.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-[#d4dce8] font-medium">{s.name}</div>
                    <div className="text-[10px] text-[#5a6880] font-mono uppercase">{s.risk_level} | {s.status}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phone upload button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={openQR}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#161c2a] border border-[#252d40] text-[#8a98b0] rounded-lg text-xs font-bold tracking-wider hover:border-[#20c8c8] hover:text-[#20c8c8] transition-colors mr-1"
        title="Subir archivos desde el teléfono"
      >
        <Smartphone size={14} />
        <span className="hidden sm:inline">TELÉFONO</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-[#e8a020] hover:bg-[#f0b840] text-black px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">NUEVO SUJETO</span>
      </motion.button>

      <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-[#40c880]">
        <Activity size={12} className="animate-pulse" />
        <span>EN LÍNEA</span>
      </div>

      {/* New Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-6 w-[400px] max-w-[90vw]"
          >
            <h2 className="font-mono text-sm text-[#e8a020] tracking-wider mb-4">◈ NUEVO SUJETO</h2>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre completo"
              className="w-full bg-[#111520] border border-[#252d40] rounded-lg px-3 py-2 text-sm text-[#d4dce8] outline-none focus:border-[#e8a020] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setNewName(''); }} className="px-4 py-1.5 text-xs text-[#5a6880] hover:text-[#d4dce8]">Cancelar</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded-md text-xs font-bold tracking-wider hover:bg-[#f0b840] disabled:opacity-50">CREAR</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowQR(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-6 w-[380px] max-w-[90vw] text-center">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-[#20c8c8] tracking-wider">📱 SUBIR DESDE TELÉFONO</span>
              <button onClick={() => setShowQR(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button>
            </div>
            <div className="bg-white rounded-lg p-3 inline-block mx-auto mb-3">
              {qrLoading ? (
                <div className="w-[180px] h-[180px] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-[#5a6880]" /></div>
              ) : qrSrc ? (
                <img src={qrSrc} alt="QR" className="w-[180px] h-[180px]" />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center text-[#5a6880] text-xs">Error generando QR</div>
              )}
            </div>
            <p className="text-xs text-[#8a98b0] mb-1">Escaneá con tu teléfono</p>
            <p className="text-[10px] text-[#5a6880]">Conectado al mismo WiFi. Seleccionás el sujeto y subís archivos directo a Multimedia.</p>
          </motion.div>
        </div>
      )}
    </header>
  );
}
