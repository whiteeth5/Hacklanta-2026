import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, EventKind, Issue, View } from './types';
import { initialState, uid } from './lib/defaults';
import { EVENTS, roomById } from './lib/residence';
import { applyPalette } from './lib/palettes';

const KEY = 'homebridge:v2';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && s.version === 2) return { ...initialState(), ...s };
    }
  } catch { /* storage unavailable */ }
  return initialState();
}

export interface Toast { id: number; text: string; tone: 'ok' | 'info' | 'warn' }

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  view: View;
  go: (v: View, target?: string) => void;
  target: string | null;
  clearTarget: () => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  triggerEvent: (kind: EventKind) => string;
  shareRunWithStaff: (runId: string) => void;
  resolveRun: (runId: string) => void;
  reset: () => void;
  storageOk: boolean;
  mode: 'light' | 'dark';
}

const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [view, setView] = useState<View>('dashboard');
  const [target, setTarget] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [systemDark, setSystemDark] = useState(() => {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
  });
  const n = useRef(0);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch { return undefined; }
  }, []);

  // A theme the host page sets explicitly (data-theme) wins over the OS when the user chose "system".
  const hostTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
  const a = state.appearance;
  const mode: 'light' | 'dark' = a.mode === 'system' ? (hostTheme === 'dark' || hostTheme === 'light' ? hostTheme : systemDark ? 'dark' : 'light') : a.mode;

  useEffect(() => {
    applyPalette(a.palette, mode);
    const root = document.documentElement;
    root.style.fontSize = `${Math.round(a.textScale * 100)}%`;
    root.classList.toggle('reduce-motion', a.reduceMotion);
  }, [a.palette, a.textScale, a.reduceMotion, mode]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); setStorageOk(true); } catch { setStorageOk(false); }
  }, [state]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++n.current;
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const go = useCallback((v: View, t?: string) => { setView(v); setTarget(t ?? null); window.scrollTo({ top: 0 }); }, []);

  const makeIssue = (kind: EventKind, runId: string): Issue => {
    const def = EVENTS[kind];
    const now = new Date().toISOString();
    return {
      id: uid('iss'), source: 'sensor', roomId: def.roomId, category: def.category, title: def.title,
      description: `${def.what} (Simulated sensor alert from the ${roomById(def.roomId).name.toLowerCase()}.)`,
      severity: def.severity === 'urgent' ? 'urgent' : def.severity === 'warning' ? 'medium' : 'low', status: 'submitted', evidence: [],
      history: [{ id: uid('h'), at: now, by: 'system', text: 'Created automatically by the Impact Engine from a simulated sensor alert', status: 'submitted' }],
      createdAt: now, updatedAt: now, engineRunId: runId,
    };
  };

  const triggerEvent = useCallback((kind: EventKind) => {
    const runId = uid('run');
    const now = new Date().toISOString();
    const def = EVENTS[kind];
    const privateRoom = roomById(def.roomId).scope === 'mine';
    setState((s) => {
      const issue = privateRoom ? undefined : makeIssue(kind, runId);
      return {
        ...s,
        events: [...s.events.filter((e) => e.kind !== kind), { id: uid('ev'), kind, at: now }],
        runs: [{ id: runId, kind, roomId: def.roomId, startedAt: now, issueId: issue?.id, resolved: false }, ...s.runs].slice(0, 12),
        issues: issue ? [issue, ...s.issues] : s.issues,
      };
    });
    return runId;
  }, []);

  const shareRunWithStaff = useCallback((runId: string) => {
    setState((s) => {
      const run = s.runs.find((r) => r.id === runId);
      if (!run || run.issueId) return s;
      const issue = makeIssue(run.kind, runId);
      issue.history.push({ id: uid('h'), at: new Date().toISOString(), by: 'resident', text: 'Resident chose to share this private alert with staff' });
      return { ...s, issues: [issue, ...s.issues], runs: s.runs.map((r) => (r.id === runId ? { ...r, issueId: issue.id } : r)) };
    });
  }, []);

  const resolveRun = useCallback((runId: string) => {
    setState((s) => {
      const run = s.runs.find((r) => r.id === runId);
      if (!run) return s;
      return { ...s, events: s.events.filter((e) => e.kind !== run.kind), runs: s.runs.map((r) => (r.id === runId ? { ...r, resolved: true } : r)) };
    });
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setState(initialState());
    setView('dashboard');
  }, []);

  const value = useMemo(() => ({ state, update, view, go, target, clearTarget: () => setTarget(null), toast, toasts, triggerEvent, shareRunWithStaff, resolveRun, reset, storageOk, mode }),
    [state, update, view, go, target, toast, toasts, triggerEvent, shareRunWithStaff, resolveRun, reset, storageOk, mode]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStore() {
  const c = useContext(C);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
