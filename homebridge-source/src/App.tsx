import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from './store';
import type { View } from './types';
import { Dashboard, TwinPage } from './components/Dashboard';
import { EnginePage } from './components/Engine';
import { SimulatorPage } from './components/Simulator';
import { MaintenancePage } from './components/Maintenance';
import { ResourcesPage } from './components/Resources';
import { PathwayPage } from './components/Pathway';
import { CommunityPage } from './components/Community';
import { CalendarPage } from './components/Calendar';
import { DocumentsPage } from './components/Documents';
import { SettingsPage } from './components/Settings';
import { Logo } from './components/Logo';
import { cx } from './components/ui';
import { Activity, CalendarDays, CircleAlert, CircleCheck, Ellipsis, HeartHandshake, PartyPopper, ScanText, House, Info, LayoutDashboard, Milestone, Palette, PiggyBank, Settings, Wrench, X, Zap } from './icons';

const NAV: { view: View; label: string; short: string; icon: ReactNode; residentOnly?: boolean }[] = [
  { view: 'dashboard', label: 'Dashboard', short: 'Home', icon: <LayoutDashboard size={22} /> },
  { view: 'twin', label: 'HomeTwin', short: 'Twin', icon: <House size={22} /> },
  { view: 'engine', label: 'Impact Engine', short: 'Engine', icon: <Zap size={22} /> },
  { view: 'simulator', label: 'Living Simulator', short: 'Budget', icon: <PiggyBank size={22} />, residentOnly: true },
  { view: 'maintenance', label: 'Repairs', short: 'Repairs', icon: <Wrench size={22} /> },
  { view: 'resources', label: 'Resources', short: 'Help', icon: <HeartHandshake size={22} /> },
  { view: 'community', label: 'Community', short: 'Community', icon: <PartyPopper size={22} /> },
  { view: 'calendar', label: 'Calendar', short: 'Calendar', icon: <CalendarDays size={22} />, residentOnly: true },
  { view: 'documents', label: 'Document Helper', short: 'Docs', icon: <ScanText size={22} />, residentOnly: true },
  { view: 'pathway', label: 'Pathway', short: 'Pathway', icon: <Milestone size={22} />, residentOnly: true },
  { view: 'settings', label: 'Settings', short: 'Settings', icon: <Settings size={22} /> },
];

export function App() {
  const { state, update, view, go, toasts, toast } = useStore();
  const [more, setMore] = useState(false);
  const staff = state.role === 'staff';
  const nav = NAV.filter((n) => !(staff && n.residentOnly));
  const mobileMain = nav.filter((n) => ['dashboard', 'twin', staff ? 'maintenance' : 'simulator', 'engine'].includes(n.view));
  const mobileMore = nav.filter((n) => !mobileMain.includes(n));
  const alerts = state.runs.filter((r) => !r.resolved).length;

  useEffect(() => {
    if (staff && NAV.some((n) => n.view === view && n.residentOnly)) go('dashboard');
  }, [staff, view, go]);

  useEffect(() => {
    document.getElementById('page-title')?.focus({ preventScroll: true });
    const n = NAV.find((x) => x.view === view);
    document.title = `${n?.label ?? 'HomeBridge'} · HomeBridge`;
    setMore(false);
  }, [view]);

  const roleSwitch = (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Switch view">
      {(['resident', 'staff'] as const).map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={state.role === r}
          onClick={() => { update((s) => ({ ...s, role: r })); toast(r === 'staff' ? 'Staff view: building-level information only.' : 'Resident view.', 'info'); }}
          className={cx('min-h-[36px] rounded-lg px-3 text-sm font-semibold', state.role === r ? 'bg-primary text-primary-ink' : 'text-ink hover:bg-surface-2')}
        >
          {r === 'resident' ? 'Resident' : 'Staff'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#main" className="skip-link">Skip to main content</a>

      <aside className="sticky top-0 hidden h-screen flex-col gap-5 overflow-y-auto border-r border-line bg-surface px-4 py-6 lg:flex" aria-label="Sidebar">
        <button type="button" onClick={() => go('dashboard')} className="self-start rounded-lg" aria-label="HomeBridge dashboard"><Logo /></button>
        <nav aria-label="Main">
          <ul className="grid gap-0.5">
            {nav.map((n) => (
              <li key={n.view}>
                <button type="button" onClick={() => go(n.view)} aria-current={view === n.view ? 'page' : undefined} className={cx('flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 font-semibold transition', view === n.view ? 'bg-primary text-primary-ink shadow-card' : 'text-ink hover:bg-surface-2')}>
                  {n.icon}{n.label}
                  {n.view === 'engine' && alerts > 0 && <span className="ml-auto rounded-full bg-danger px-2 text-xs font-bold text-white">{alerts}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto grid gap-3">
          <button type="button" onClick={() => go('settings')} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left text-sm font-semibold"><Palette size={18} /> Appearance</button>
          <p className="px-1 text-xs text-muted">Prototype · all sensor data simulated</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky z-30 flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3 sm:px-6" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <button type="button" onClick={() => go('dashboard')} className="rounded-lg lg:hidden" aria-label="HomeBridge dashboard"><Logo /></button>
          <p className="hidden items-center gap-2 text-sm text-muted lg:flex"><Activity size={16} /> {state.profile.residence} · {staff ? 'Staff view' : `${state.profile.room}`}</p>
          {roleSwitch}
        </header>

        <main id="main" className="fade-in mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8" key={view + state.role}>
          {view === 'dashboard' && <Dashboard />}
          {view === 'twin' && <TwinPage />}
          {view === 'engine' && <EnginePage />}
          {view === 'simulator' && !staff && <SimulatorPage />}
          {view === 'maintenance' && <MaintenancePage />}
          {view === 'resources' && <ResourcesPage />}
          {view === 'community' && <CommunityPage />}
          {view === 'calendar' && !staff && <CalendarPage />}
          {view === 'documents' && !staff && <DocumentsPage />}
          {view === 'pathway' && !staff && <PathwayPage />}
          {view === 'settings' && <SettingsPage />}
        </main>

        {more && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMore(false)} aria-hidden="true" />
        )}
        {more && (
          <div className="fixed inset-x-3 z-50 rounded-2xl border border-line bg-surface p-3 shadow-card lg:hidden" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }} role="dialog" aria-label="More pages">
            <div className="mb-2 flex items-center justify-between px-1"><p className="font-semibold">More</p><button type="button" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2" onClick={() => setMore(false)} aria-label="Close menu"><X size={18} /></button></div>
            <ul className="grid gap-1">
              {mobileMore.map((n) => (
                <li key={n.view}><button type="button" onClick={() => go(n.view)} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 font-semibold hover:bg-surface-2">{n.icon}{n.label}</button></li>
              ))}
            </ul>
          </div>
        )}

        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <ul className="grid grid-cols-5">
            {mobileMain.map((n) => (
              <li key={n.view}>
                <button type="button" aria-label={n.label} onClick={() => go(n.view)} aria-current={view === n.view ? 'page' : undefined} className={cx('relative flex min-h-[62px] w-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold', view === n.view ? 'text-primary' : 'text-muted')}>
                  <span className={cx('grid h-8 w-12 place-items-center rounded-full', view === n.view && 'bg-primary-soft')}>{n.icon}</span>{n.short}
                  {n.view === 'engine' && alerts > 0 && <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full bg-danger" aria-hidden="true" />}
                </button>
              </li>
            ))}
            <li>
              <button type="button" aria-expanded={more} aria-label="More pages" onClick={() => setMore(!more)} className={cx('flex min-h-[62px] w-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold', mobileMore.some((n) => n.view === view) ? 'text-primary' : 'text-muted')}>
                <span className="grid h-8 w-12 place-items-center rounded-full"><Ellipsis size={22} /></span>More
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }} aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className="fade-in pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-bg shadow-card">
            {t.tone === 'warn' ? <CircleAlert size={18} /> : t.tone === 'info' ? <Info size={18} /> : <CircleCheck size={18} />}{t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
