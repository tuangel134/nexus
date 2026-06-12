import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Image, CalendarDays, MapPin, Link2,
  Fingerprint, Phone, StickyNote, Brain, Pin, Search,
  FolderKanban, History, Network, BookOpen
} from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'RESUMEN', icon: LayoutDashboard },
  { id: 'media', label: 'MULTIMEDIA', icon: Image, badge: 'media_count' as const },
  { id: 'events', label: 'EVENTOS', icon: CalendarDays, badge: 'events_count' as const },
  { id: 'locations', label: 'UBICACIONES', icon: MapPin, badge: 'locations_count' as const },
  { id: 'relations', label: 'RELACIONES', icon: Link2, badge: 'relations_count' as const },
  { id: 'identifiers', label: 'IDENTIFICADORES', icon: Fingerprint, badge: 'identifiers_count' as const },
  { id: 'contacts', label: 'CONTACTOS', icon: Phone, badge: 'contacts_count' as const },
  { id: 'notes', label: 'NOTAS', icon: StickyNote, badge: 'notes_count' as const },
  { id: 'journal', label: 'CUADERNO', icon: BookOpen },
  { id: 'ai', label: 'ANÁLISIS IA', icon: Brain, badge: 'ai_count' as const },
  { id: 'osint', label: 'OSINT', icon: Search },
  { id: 'cases', label: 'CASOS', icon: FolderKanban },
  { id: 'crossgraph', label: 'GRAFO', icon: Network },
  { id: 'audit', label: 'AUDITORÍA', icon: History },
  { id: 'board', label: 'PIZARRÓN', icon: Pin },
];

export default function TabNavigation() {
  const { currentTab, setCurrentTab, currentSubject } = useAppStore();

  return (
    <nav className="bg-[#0c0f16]/90 backdrop-blur-sm border-b border-[#1c2435] px-4 flex items-center gap-0.5 overflow-x-auto custom-scrollbar flex-shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        const badgeValue = tab.badge && currentSubject ? (currentSubject as any)[tab.badge] || 0 : 0;

        return (
          <motion.button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            whileHover={{ y: -1 }}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-[11px] font-mono tracking-wider whitespace-nowrap transition-all border-b-2 ${
              isActive
                ? 'text-[#e8a020] border-[#e8a020] tab-active-glow'
                : 'text-[#5a6880] border-transparent hover:text-[#8a98b0] hover:bg-[#111520]/50'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && badgeValue > 0 && (
              <span className={`ml-1 px-1.5 py-0 rounded-full text-[9px] font-bold ${
                isActive ? 'bg-[#e8a020] text-black' : 'bg-[#161c2a] text-[#5a6880]'
              }`}>
                {badgeValue}
              </span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
