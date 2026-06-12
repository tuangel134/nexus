import { useState } from 'react';
import { useInitData } from '@/hooks/useInitData';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import SubjectHeader from '@/components/layout/SubjectHeader';
import TabNavigation from '@/components/layout/TabNavigation';
import SectionRenderer from '@/components/sections/SectionRenderer';
import AIAssistant from '@/components/layout/AIAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, User, Shield } from 'lucide-react';

function EmptyState() {
  const { setCurrentSubject, addNotification } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const res = await api.subjects.create({ name: name.trim() });
      const sub = await api.subjects.get(res.id);
      setCurrentSubject(sub);
      addNotification('Sujeto creado', 'success');
      setShowModal(false);
      setName('');
    } catch (e: any) {
      addNotification('Error: ' + e.message, 'error');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div className="absolute inset-0 dot-pattern opacity-50" />
      <div className="absolute inset-0 vignette" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 border border-[#e8a020]/20 rounded-xl flex items-center justify-center"
            style={{ transform: 'rotate(45deg)' }}
          >
            <Activity size={36} className="text-[#e8a020]/40" style={{ transform: 'rotate(-45deg)' }} />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="text-[#e8a020]" size={32} />
          </div>
        </div>

        <h1 className="font-mono text-2xl text-[#e8a020] tracking-[6px] text-glow mb-2">NEXUS</h1>
        <p className="text-[#5a6880] text-sm mb-1">PLATAFORMA DE INTELIGENCIA</p>
        <p className="text-[#3a4a60] text-xs mt-4 max-w-xs text-center leading-relaxed">
          Selecciona un sujeto del panel lateral o crea uno nuevo para comenzar la investigación
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="mt-8 flex items-center gap-2 px-6 py-2.5 bg-[#e8a020] text-black rounded-lg text-xs font-bold tracking-wider hover:bg-[#f0b840] transition-colors"
        >
          <User size={14} />
          NUEVO SUJETO
        </motion.button>
      </motion.div>

      {/* Modal */}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre completo"
              className="w-full bg-[#111520] border border-[#252d40] rounded-lg px-3 py-2 text-sm text-[#d4dce8] outline-none focus:border-[#e8a020] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setName(''); }} className="px-4 py-1.5 text-xs text-[#5a6880] hover:text-[#d4dce8]">Cancelar</button>
              <button onClick={handleCreate} disabled={!name.trim()} className="px-4 py-1.5 bg-[#e8a020] text-black rounded-md text-xs font-bold tracking-wider hover:bg-[#f0b840] disabled:opacity-50">CREAR</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default function Home() {
  useInitData();
  const { currentSubject, sidebarOpen } = useAppStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080a0f] overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && <Sidebar />}
        </AnimatePresence>
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {currentSubject ? (
            <>
              <SubjectHeader />
              <TabNavigation />
              <SectionRenderer />
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
      <NotificationContainer />
      <AIAssistant />
    </div>
  );
}

function NotificationContainer() {
  const { notifications } = useAppStore();
  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`pointer-events-auto px-4 py-3 rounded-lg border shadow-xl backdrop-blur-sm ${
              n.type === 'success'
                ? 'bg-[#40c880]/10 border-[#40c880]/30 text-[#40c880]'
                : n.type === 'error'
                ? 'bg-[#e84040]/10 border-[#e84040]/30 text-[#e84040]'
                : 'bg-[#111520]/90 border-[#252d40] text-[#8a98b0]'
            }`}
          >
            <span className="text-xs">{n.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
