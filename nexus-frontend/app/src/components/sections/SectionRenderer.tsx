import { useAppStore } from '@/store/useAppStore';
import { AnimatePresence, motion } from 'framer-motion';
import OverviewSection from './OverviewSection';
import MediaSection from './MediaSection';
import EventsSection from './EventsSection';
import LocationsSection from './LocationsSection';
import RelationsSection from './RelationsSection';
import IdentifiersSection from './IdentifiersSection';
import ContactsSection from './ContactsSection';
import NotesSection from './NotesSection';
import JournalSection from './JournalSection';
import AISection from './AISection';
import BoardSection from './BoardSection';
import OSINTSection from './OSINTSection';
import CasesSection from './CasesSection';
import CrossGraphSection from './CrossGraphSection';
import AuditSection from './AuditSection';

const sectionVariants = {
  initial: { opacity: 0, scale: 0.98, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -20 },
};

const tabComponents: Record<string, React.FC> = {
  overview: OverviewSection,
  media: MediaSection,
  events: EventsSection,
  locations: LocationsSection,
  relations: RelationsSection,
  identifiers: IdentifiersSection,
  contacts: ContactsSection,
  notes: NotesSection,
  journal: JournalSection,
  ai: AISection,
  osint: OSINTSection,
  cases: CasesSection,
  crossgraph: CrossGraphSection,
  audit: AuditSection,
  board: BoardSection,
};

export default function SectionRenderer() {
  const { currentTab } = useAppStore();
  const Section = tabComponents[currentTab];

  return (
    <div className="flex-1 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`absolute inset-0 ${currentTab === 'board' ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}
        >
          {Section && <Section />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
