import { create } from 'zustand';
import type {
  Subject, MediaItem, EventItem, LocationItem, RelationItem,
  IdentifierItem, ContactItem, NoteItem, AIAnalysis, BoardNode,
  BoardConnection, BoardState, Notification, OSINTReport
} from '@/types';

interface AppStore {
  // State
  subjects: Subject[];
  currentSubject: Subject | null;
  currentTab: string;
  sidebarOpen: boolean;
  notifications: Notification[];
  searchQuery: string;
  isLoading: boolean;
  dirty: boolean;
  board: BoardState;
  selectedBoardNode: string | null;
  boardMode: 'select' | 'connect' | 'pan' | 'add_sticky' | 'add_photo' | 'add_note';
  boardConnectionStart: string | null;
  media: MediaItem[];
  events: EventItem[];
  locations: LocationItem[];
  relations: RelationItem[];
  identifiers: IdentifierItem[];
  contacts: ContactItem[];
  notes: NoteItem[];
  aiAnalyses: AIAnalysis[];
  osintReport: OSINTReport | null;

  // Actions
  setSubjects: (subjects: Subject[]) => void;
  setCurrentSubject: (subject: Subject | null) => void;
  setCurrentTab: (tab: string) => void;
  toggleSidebar: () => void;
  addNotification: (msg: string, type: Notification['type']) => void;
  removeNotification: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setLoading: (v: boolean) => void;
  setDirty: (v: boolean) => void;
  setBoard: (board: BoardState) => void;
  setSelectedBoardNode: (id: string | null) => void;
  setBoardMode: (mode: AppStore['boardMode']) => void;
  setBoardConnectionStart: (id: string | null) => void;
  addBoardNode: (node: BoardNode) => void;
  updateBoardNode: (id: string, updates: Partial<BoardNode>) => void;
  removeBoardNode: (id: string) => void;
  addBoardConnection: (conn: BoardConnection) => void;
  removeBoardConnection: (id: string) => void;
  setMedia: (m: MediaItem[]) => void;
  setEvents: (e: EventItem[]) => void;
  setLocations: (l: LocationItem[]) => void;
  setRelations: (r: RelationItem[]) => void;
  setIdentifiers: (i: IdentifierItem[]) => void;
  setContacts: (c: ContactItem[]) => void;
  setNotes: (n: NoteItem[]) => void;
  setAIAnalyses: (a: AIAnalysis[]) => void;
  setOSINTReport: (r: OSINTReport | null) => void;
  updateSubjectCounts: () => void;

  // Subject actions
  addSubject: (s: Subject) => void;
  removeSubject: (id: string) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
}

let notifId = 0;

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  subjects: [],
  currentSubject: null,
  currentTab: 'overview',
  sidebarOpen: true,
  notifications: [],
  searchQuery: '',
  isLoading: false,
  dirty: false,
  board: {
    nodes: [],
    connections: [],
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  selectedBoardNode: null,
  boardMode: 'select',
  boardConnectionStart: null,
  media: [],
  events: [],
  locations: [],
  relations: [],
  identifiers: [],
  contacts: [],
  notes: [],
  aiAnalyses: [],
  osintReport: null,

  // Actions
  setSubjects: (subjects) => set({ subjects }),
  setCurrentSubject: (subject) => set({ currentSubject: subject, dirty: false }),
  setCurrentTab: (tab) => set({ currentTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (msg, type) => {
    const id = `notif_${++notifId}`;
    set((s) => ({ notifications: [...s.notifications, { id, message: msg, type, timestamp: Date.now() }] }));
    setTimeout(() => get().removeNotification(id), 3000);
  },
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLoading: (v) => set({ isLoading: v }),
  setDirty: (v) => set({ dirty: v }),
  setBoard: (board) => set({ board }),
  setSelectedBoardNode: (id) => set({ selectedBoardNode: id }),
  setBoardMode: (mode) => set({ boardMode: mode, boardConnectionStart: null }),
  setBoardConnectionStart: (id) => set({ boardConnectionStart: id }),
  addBoardNode: (node) =>
    set((s) => ({ board: { ...s.board, nodes: [...s.board.nodes, node] } })),
  updateBoardNode: (id, updates) =>
    set((s) => ({
      board: {
        ...s.board,
        nodes: s.board.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      },
    })),
  removeBoardNode: (id) =>
    set((s) => ({
      board: {
        ...s.board,
        nodes: s.board.nodes.filter((n) => n.id !== id),
        connections: s.board.connections.filter((c) => c.fromId !== id && c.toId !== id),
      },
    })),
  addBoardConnection: (conn) =>
    set((s) => ({ board: { ...s.board, connections: [...s.board.connections, conn] } })),
  removeBoardConnection: (id) =>
    set((s) => ({
      board: { ...s.board, connections: s.board.connections.filter((c) => c.id !== id) },
    })),
  setMedia: (m) => set({ media: m }),
  setEvents: (e) => set({ events: e }),
  setLocations: (l) => set({ locations: l }),
  setRelations: (r) => set({ relations: r }),
  setIdentifiers: (i) => set({ identifiers: i }),
  setContacts: (c) => set({ contacts: c }),
  setNotes: (n) => set({ notes: n }),
  setAIAnalyses: (a) => set({ aiAnalyses: a }),
  setOSINTReport: (r) => set({ osintReport: r }),
  updateSubjectCounts: () => {
    const s = get();
    if (!s.currentSubject) return;
    const updated = {
      ...s.currentSubject,
      media_count: s.media.length,
      events_count: s.events.length,
      locations_count: s.locations.length,
      relations_count: s.relations.length,
      notes_count: s.notes.length,
    };
    set({ currentSubject: updated });
  },
  addSubject: (subject) => set((s) => ({ subjects: [...s.subjects, subject] })),
  removeSubject: (id) =>
    set((s) => ({
      subjects: s.subjects.filter((sub) => sub.id !== id),
      currentSubject: s.currentSubject?.id === id ? null : s.currentSubject,
    })),
  updateSubject: (id, updates) =>
    set((s) => ({
      subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)),
      currentSubject: s.currentSubject?.id === id ? { ...s.currentSubject, ...updates } : s.currentSubject,
    })),
}));
