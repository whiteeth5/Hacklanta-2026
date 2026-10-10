import type { PaletteId } from './lib/palettes';

export type Role = 'resident' | 'staff';
export type View = 'dashboard' | 'twin' | 'engine' | 'simulator' | 'maintenance' | 'resources' | 'community' | 'calendar' | 'documents' | 'pathway' | 'settings';

// ---------- Residence ----------
/** mine = the resident's own room · shared = common areas · private = another resident's room · staff = staff-only */
export type RoomScope = 'mine' | 'shared' | 'private' | 'staff';
export type SensorKind = 'temperature' | 'humidity' | 'air' | 'leak';

export interface Room {
  id: string;
  name: string;
  scope: RoomScope;
  x: number; y: number; w: number; h: number;
  sensors: SensorKind[];
  icon: 'bed' | 'bath' | 'laundry' | 'sofa' | 'kitchen' | 'office' | 'door';
}

export type EventKind = 'leak_laundry' | 'leak_bath' | 'humidity_bath' | 'heat_mine' | 'air_kitchen' | 'sensor_offline';

export interface ActiveEvent {
  id: string;
  kind: EventKind;
  at: string;
}

export interface EngineRun {
  id: string;
  kind: EventKind;
  roomId: string;
  startedAt: string;
  issueId?: string;
  resolved: boolean;
}

// ---------- Maintenance ----------
export type IssueSource = 'resident' | 'sensor';
export type IssueStatus = 'submitted' | 'acknowledged' | 'scheduled' | 'in_progress' | 'resolved';
export type IssueCategory = 'plumbing' | 'electrical' | 'heating_cooling' | 'moisture' | 'pests' | 'appliance' | 'safety' | 'furniture' | 'other';

export interface Evidence {
  id: string;
  kind: 'note' | 'photo';
  text?: string;
  dataUrl?: string;
  at: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  by: 'resident' | 'staff' | 'system';
  text: string;
  status?: IssueStatus;
}

export interface Issue {
  id: string;
  source: IssueSource;
  roomId: string;
  category: IssueCategory;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  status: IssueStatus;
  evidence: Evidence[];
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
  engineRunId?: string;
}

// ---------- Budget ----------
export interface Budget {
  incomeMode: 'hourly' | 'monthly';
  hourly: number;
  hoursPerWeek: number;
  deductionPct: number;
  monthlyTakeHome: number;
  otherIncome: number;
  expenses: Record<ExpenseKey, number>;
  housingPreset: 'shared' | 'studio' | 'one_bed' | 'custom';
  moveIn: { deposit: number; firstMonth: number; fees: number; basics: number };
  currentSavings: number;
}

export type ExpenseKey =
  | 'rent' | 'utilities' | 'groceries' | 'transportation' | 'phone' | 'internet'
  | 'insurance' | 'personal' | 'fees' | 'debt' | 'other';

// ---------- Pathway ----------
export type PathwaySection = 'budget' | 'documents' | 'housing' | 'transition';
export interface PathwayItem {
  id: string;
  section: PathwaySection;
  text: string;
  hint?: string;
  done: boolean;
  custom?: boolean;
  hidden?: boolean;
}

// ---------- Resources ----------
export type ResourceCategory = 'housing' | 'employment' | 'food' | 'transportation' | 'id_documents' | 'utilities' | 'legal' | 'health';
export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  summary: string;
  eligibility: string;
  hours: string;
  phone: string;
  website: string;
  area: string;
  tags: string[];
  verification: 'demo' | 'national';
}

// ---------- App ----------
export interface Appearance {
  palette: PaletteId;
  mode: 'system' | 'light' | 'dark';
  textScale: number;
  reduceMotion: boolean;
}

export interface Profile {
  firstName: string;
  residence: string;
  room: string;
  moveIn: string;
  plannedMonths: number;
  programFee: number;
}

// ---------- Calendar ----------
export type CalendarKind = 'appointment' | 'court' | 'work' | 'interview' | 'housing' | 'program' | 'community' | 'deadline' | 'other';
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or ''
  kind: CalendarKind;
  notes: string;
  source: 'me' | 'community' | 'document';
  remind: boolean;
}

// ---------- Documents ----------
export interface KeyDate { date: string; what: string }
export interface DocExplanation {
  id: string;
  name: string;
  at: string;
  docType: string;
  summary: string;
  purpose: string;
  keyDates: KeyDate[];
  actions: string[];
  questions: string[];
  caution: string;
  engine: 'claude' | 'builtin';
}

export interface AppState {
  version: 2;
  role: Role;
  profile: Profile;
  appearance: Appearance;
  events: ActiveEvent[];
  runs: EngineRun[];
  issues: Issue[];
  budget: Budget;
  pathway: PathwayItem[];
  shareProgress: boolean;
  bookmarks: string[];
  welcomeDismissed: boolean;
  calendar: CalendarEvent[];
  going: string[];
  docs: DocExplanation[];
}
