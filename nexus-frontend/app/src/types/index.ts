export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'active' | 'inactive' | 'suspect' | 'closed';
export type Gender = 'M' | 'F' | 'X' | '';

export type EventType = 'activity' | 'meeting' | 'travel' | 'transaction' | 'communication' | 'incident' | 'arrest' | 'other';
export type EventImportance = 'low' | 'normal' | 'high' | 'critical';

export type LocationType = 'home' | 'work' | 'frequent' | 'temporary' | 'suspicious' | 'other';

export type RelationType = 'family' | 'partner' | 'friend' | 'colleague' | 'associate' | 'boss' | 'employee' | 'rival' | 'victim' | 'witness' | 'suspect' | 'other';
export type RelationStrength = 'weak' | 'medium' | 'strong';

export type IdentifierType = 'curp' | 'rfc' | 'passport' | 'ine' | 'ssn' | 'license' | 'plate' | 'email' | 'phone' | 'social' | 'bank' | 'ip' | 'other';

export type ContactType = 'phone' | 'mobile' | 'email' | 'telegram' | 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'other';

export type NoteCategory = 'general' | 'intel' | 'surveillance' | 'financial' | 'legal' | 'personal' | 'hypothesis';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type AnalysisType = 'profile' | 'risk' | 'pattern' | 'network' | 'summary';

export type BoardItemType = 'media' | 'contacts' | 'locations' | 'events' | 'notes' | 'identifiers' | 'relations' | 'subject' | 'sticky' | 'photo' | 'note_card' | 'connection';

export interface Subject {
  id: string;
  name: string;
  dob: string | null;
  gender: Gender;
  nationality: string | null;
  status: Status;
  risk_level: RiskLevel;
  tags: string[];
  aliases: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  media_count: number;
  events_count: number;
  locations_count: number;
  relations_count: number;
  notes_count: number;
}

export interface MediaItem {
  id: string;
  subject_id: string;
  filename: string;
  original_name: string;
  type: MediaType;
  is_primary: boolean;
  created_at: string;
}

export interface EventItem {
  id: string;
  subject_id: string;
  title: string;
  date: string | null;
  event_type: EventType;
  importance: EventImportance;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationItem {
  id: string;
  subject_id: string;
  name: string;
  address: string | null;
  location_type: LocationType;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  created_at: string;
}

export interface RelationItem {
  id: string;
  subject_a_id: string;
  subject_b_id: string;
  name_a: string;
  name_b: string;
  relation_type: RelationType;
  strength: RelationStrength;
  notes: string | null;
  created_at: string;
}

export interface IdentifierItem {
  id: string;
  subject_id: string;
  id_type: IdentifierType;
  value: string;
  notes: string | null;
  created_at: string;
}

export interface ContactItem {
  id: string;
  subject_id: string;
  contact_type: ContactType;
  value: string;
  label: string | null;
  created_at: string;
}

export interface NoteItem {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  category: NoteCategory;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  id: string;
  subject_id: string;
  analysis_type: AnalysisType;
  content: string;
  created_at: string;
}

export interface BoardNode {
  id: string;
  type: BoardItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: any;
  rotation?: number;
  zIndex: number;
  label?: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  connectedTo?: string[];
}

export interface BoardConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: number;
}

export interface BoardState {
  nodes: BoardNode[];
  connections: BoardConnection[];
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface AppState {
  subjects: Subject[];
  currentSubject: Subject | null;
  currentTab: string;
  sidebarOpen: boolean;
  notifications: Notification[];
  searchQuery: string;
  isLoading: boolean;
  dirty: boolean;
  modals: Record<string, boolean>;
  board: BoardState;
  selectedBoardNode: string | null;
  boardMode: 'select' | 'connect' | 'pan' | 'add_sticky' | 'add_photo' | 'add_note';
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

export interface OSINTReport {
  target: string;
  profiles: Array<{ platform: string; url: string }>;
  extracted_data: {
    emails: string[];
    phones: string[];
    names: string[];
    locations: string[];
    workplaces: string[];
    education: string[];
  };
  alternative_accounts: Record<string, Array<{ username: string; url: string; confidence: number; evidence: string[] }>>;
  insights: string[];
  recommendations: string[];
  confidence_score: number;
  risk_score: number;
  total_platforms_checked: string;
  elapsed_time: number;
  profiles_found: number;
}
