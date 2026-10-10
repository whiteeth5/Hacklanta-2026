import { useState, type ReactNode } from 'react';
import { useStore } from '../store';
import type { View } from '../types';
import { EVENTS, ROOMS, canSeeRoom, readings, roomById, roomLevel, roomName } from '../lib/residence';
import { computeBudget, usd } from '../lib/budget';
import { HomeTwin, RoomPanel } from './HomeTwin';
import { pathwayProgress } from './Pathway';
import { STATUS_LABEL } from './Maintenance';
import { suggestions } from './Resources';
import { KIND_LABEL, upcoming } from './Calendar';
import { upcomingCommunity, COMMUNITY_ICON } from './Community';
import { time12 } from '../data/community';
import { Button, Card, CardTitle, Pill, SourceBadge, cx, fmtDate } from './ui';
import { Activity, ArrowRight, Bell, CalendarDays, PartyPopper, ScanText, CircleCheck, Flag, HeartHandshake, House, Lock, Milestone, PiggyBank, Wrench, Zap } from '../icons';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

interface NextStep { text: string; why: string; view: View; target?: string; icon: ReactNode }

function nextSteps(s: ReturnType<typeof useStore>['state']): NextStep[] {
  const out: NextStep[] = [];
  s.runs.filter((r) => !r.resolved).slice(0, 2).forEach((r) => out.push({ text: `Check the alert: ${EVENTS[r.kind].title.toLowerCase()}`, why: `${roomById(r.roomId).name} · simulated`, view: 'engine', target: r.id, icon: <Bell size={18} /> }));
  const b = computeBudget(s.budget);
  if (b.status === 'shortfall') out.push({ text: `Your simulated budget is short ${usd(-b.leftover)} a month`, why: 'Try the roommate or hours what-ifs', view: 'simulator', icon: <PiggyBank size={18} /> });
  const resolvedToConfirm = s.issues.find((i) => i.status === 'resolved' && i.source === 'resident' && !i.history.some((h) => h.text.startsWith('Resident confirmed')));
  if (resolvedToConfirm) out.push({ text: `Confirm the fix: ${resolvedToConfirm.title}`, why: 'Staff marked it resolved', view: 'maintenance', target: `issue:${resolvedToConfirm.id}`, icon: <Wrench size={18} /> });
  const court = upcoming(s.calendar, 7).find((e) => e.kind === 'court' || e.kind === 'deadline');
  if (court) out.push({ text: `${court.title}: ${fmtDate(court.date)}`, why: 'Coming up on your calendar', view: 'calendar', icon: <CalendarDays size={18} /> });
  const step = s.pathway.find((p) => !p.done && !p.hidden);
  if (step) out.push({ text: step.text, why: 'Next on your pathway', view: 'pathway', icon: <Milestone size={18} /> });
  if (s.bookmarks.length === 0) out.push({ text: 'Bookmark a resource you might need', why: 'Jobs, IDs, deposits and more', view: 'resources', icon: <HeartHandshake size={18} /> });
  return out.slice(0, 4);
}

export function Dashboard() {
  const { state } = useStore();
  return state.role === 'staff' ? <StaffDashboard /> : <ResidentDashboard />;
}

function TwinCard({ title }: { title: string }) {
  const { state, go } = useStore();
  const active = state.runs.find((r) => !r.resolved && canSeeRoom(roomById(r.roomId), state.role));
  const [sel, setSel] = useState<string>(active?.roomId ?? (state.role === 'resident' ? 'mine' : 'kitchen'));
  return (
    <Card as="section" aria-labelledby="twin-h">
      <CardTitle id="twin-h" icon={<House size={20} />} action={<div className="flex items-center gap-2"><SourceBadge source="simulated" /><Button size="sm" variant="ghost" onClick={() => go('twin', sel)}>Full view</Button></div>}>
        {title}
      </CardTitle>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <HomeTwin selected={sel} onSelect={setSel} highlight={active?.roomId} />
        <div className="min-w-0 rounded-2xl bg-surface-2 p-4"><RoomPanel roomId={sel} role={state.role} /></div>
      </div>
    </Card>
  );
}

function DemoStrip() {
  const { triggerEvent, go, toast, state } = useStore();
  const leakActive = state.events.some((e) => e.kind === 'leak_laundry');
  return (
    <section aria-label="Demo" className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-primary px-5 py-4 text-primary-ink shadow-card">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold">See the Impact Engine in action</p>
        <p className="text-sm opacity-90">One simulated leak becomes a located alert, a cost estimate, a repair report and matched resources.</p>
      </div>
      <button
        type="button"
        onClick={() => {
          const id = triggerEvent('leak_laundry');
          toast('Simulated: water detected under the washing machine', 'info');
          go('engine', id);
        }}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-ink px-4 font-semibold text-primary hover:opacity-90"
      >
        <Zap size={18} /> {leakActive ? 'Run it again' : 'Simulate a water leak'}
      </button>
    </section>
  );
}

function ResidentDashboard() {
  const { state, go } = useStore();
  const p = state.profile;
  const weeks = Math.max(1, Math.floor((Date.now() - new Date(p.moveIn + 'T12:00:00').getTime()) / (7 * 86400000)) + 1);
  const totalWeeks = Math.round((p.plannedMonths * 52) / 12);
  const b = computeBudget(state.budget);
  const { done, total } = pathwayProgress(state.pathway);
  const open = state.issues.filter((i) => i.status !== 'resolved');
  const steps = nextSteps(state);
  const activeRuns = state.runs.filter((r) => !r.resolved);
  const sugg = suggestions(state).slice(0, 2);
  const coming = upcoming(state.calendar, 7).filter((e) => e.remind);
  const nearby = upcomingCommunity().slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{greeting()}{p.firstName ? `, ${p.firstName}` : ''}</p>
          <h1 id="page-title" tabIndex={-1} className="font-display text-[2rem] font-bold leading-tight text-ink outline-none sm:text-[2.5rem]">Your home base</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{p.residence} · {p.room}</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-ink">Week {Math.min(weeks, totalWeeks)} of about {totalWeeks}</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-ink">Pathway {done}/{total}</span>
          </div>
        </div>
      </header>

      <DemoStrip />

      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Glance label="Housing status" value="Stable" sub={`Since ${fmtDate(p.moveIn)}`} icon={<House size={18} />} tone="ok" onClick={() => go('settings')} />
        <Glance label="Active alerts" value={String(activeRuns.length)} sub={activeRuns.length ? EVENTS[activeRuns[0].kind].title : 'All rooms normal'} icon={<Bell size={18} />} tone={activeRuns.length ? 'danger' : 'ok'} onClick={() => go('engine')} />
        <Glance label="Open repairs" value={String(open.length)} sub={open[0] ? `${open[0].title} · ${STATUS_LABEL[open[0].status]}` : 'Nothing open'} icon={<Wrench size={18} />} tone={open.length ? 'warn' : 'ok'} onClick={() => go('maintenance')} />
        <Glance label="Simulated budget" value={b.leftover >= 0 ? `+${usd(b.leftover)}` : `−${usd(-b.leftover)}`} sub="a month in your first place" icon={<PiggyBank size={18} />} tone={b.status === 'shortfall' ? 'danger' : b.status === 'tight' ? 'warn' : 'ok'} onClick={() => go('simulator')} />
      </section>

      <TwinCard title="HomeTwin" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card as="section" aria-labelledby="next-h">
          <CardTitle id="next-h" icon={<Flag size={20} />}>Recommended next steps</CardTitle>
          <ol className="grid gap-2">
            {steps.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => go(s.view, s.target)} className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left hover:border-primary hover:bg-primary-soft">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">{s.icon}</span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{s.text}</span><span className="text-xs text-muted">{s.why}</span></span>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ol>
        </Card>
        <Card as="section" aria-labelledby="money-h">
          <CardTitle id="money-h" icon={<PiggyBank size={20} />} action={<SourceBadge source="private" />}>Living expenses</CardTitle>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Program fee now</dt><dd className="font-display text-xl font-bold tabular-nums">{usd(p.programFee)}</dd></div>
            <div><dt className="text-muted">First place (simulated)</dt><dd className="font-display text-xl font-bold tabular-nums">{usd(b.expenses)}</dd></div>
            <div><dt className="text-muted">Move-in fund</dt><dd className="font-semibold tabular-nums">{usd(state.budget.currentSavings)} of {usd(b.moveInTotal)}</dd></div>
            <div><dt className="text-muted">Time to move-in fund</dt><dd className="font-semibold">{b.monthsToMoveIn === null ? 'Close the gap first' : b.monthsToMoveIn === 0 ? 'Ready' : `${b.monthsToMoveIn} months`}</dd></div>
          </dl>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="meter" aria-label="Move-in fund progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(state.budget.currentSavings / Math.max(b.moveInTotal, 1), 1) * 100)}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(state.budget.currentSavings / Math.max(b.moveInTotal, 1), 1) * 100}%` }} />
          </div>
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => go('simulator')}>Open the simulator <ArrowRight size={14} /></Button></div>
        </Card>
        <Card as="section" aria-labelledby="rep-h">
          <CardTitle id="rep-h" icon={<Wrench size={20} />}>Repairs</CardTitle>
          {open.length === 0 ? <p className="text-muted">Nothing open.</p> : (
            <ul className="grid gap-2">
              {open.slice(0, 3).map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => go('maintenance', `issue:${i.id}`)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left hover:bg-primary-soft">
                    <span className="min-w-0"><span className="block truncate font-semibold">{i.title}</span><span className="text-xs text-muted">{i.source === 'sensor' ? 'Sensor alert' : 'Your report'} · {roomById(i.roomId).name}</span></span>
                    <span className="shrink-0 text-xs font-semibold text-muted">{STATUS_LABEL[i.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => go('maintenance', 'new')}>Report a problem <ArrowRight size={14} /></Button></div>
        </Card>
        <Card as="section" aria-labelledby="cal-h">
          <CardTitle id="cal-h" icon={<CalendarDays size={20} />} action={<SourceBadge source="private" />}>Coming up</CardTitle>
          {coming.length === 0 ? <p className="text-muted">Nothing in the next 7 days.</p> : (
            <ul className="grid gap-2">
              {coming.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="min-w-0"><span className="block truncate font-semibold">{e.title}</span><span className="text-xs text-muted">{KIND_LABEL[e.kind]}</span></span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtDate(e.date).replace(/, \d{4}$/, '')}{e.time ? ` · ${time12(e.time)}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => go('calendar')}>Open calendar <ArrowRight size={14} /></Button><Button size="sm" variant="ghost" onClick={() => go('documents')}><ScanText size={14} /> Explain a document</Button></div>
        </Card>
        <Card as="section" aria-labelledby="com-h">
          <CardTitle id="com-h" icon={<PartyPopper size={20} />}>Happening nearby</CardTitle>
          <ul className="grid gap-2">
            {nearby.map(({ e, date }) => (
              <li key={e.id}>
                <button type="button" onClick={() => go('community')} className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-left hover:bg-primary-soft">
                  <span className="text-primary">{COMMUNITY_ICON[e.category]}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{e.title}</span><span className="text-xs text-muted">{fmtDate(date).replace(/, \d{4}$/, '')} · {time12(e.start)} · {e.cost}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => go('community')}>All community events <ArrowRight size={14} /></Button></div>
        </Card>
        <Card as="section" aria-labelledby="res-h">
          <CardTitle id="res-h" icon={<HeartHandshake size={20} />}>Resources for you</CardTitle>
          {sugg.length ? (
            <ul className="grid gap-2">{sugg.map((s) => (
              <li key={s.r.id}><button type="button" onClick={() => go('resources')} className="w-full rounded-xl bg-surface-2 px-3 py-2 text-left hover:bg-primary-soft"><span className="block font-semibold">{s.r.name}</span><span className="text-xs text-muted">{s.why}</span></button></li>
            ))}</ul>
          ) : <p className="text-muted">Suggestions appear based on alerts, your budget and your pathway.</p>}
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => go('resources')}>Browse resources <ArrowRight size={14} /></Button></div>
        </Card>
      </div>
    </div>
  );
}

function Glance({ label, value, sub, icon, tone, onClick }: { label: string; value: string; sub: string; icon: ReactNode; tone: 'ok' | 'warn' | 'danger'; onClick: () => void }) {
  const c = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ok';
  return (
    <button type="button" onClick={onClick} className="min-w-0 rounded-card border border-line bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted"><span className={c}>{icon}</span>{label}</p>
      <p className={cx('mt-1 font-display text-2xl font-bold tabular-nums', c)}>{value}</p>
      <p className="truncate text-xs text-muted">{sub}</p>
    </button>
  );
}

function StaffDashboard() {
  const { state, go } = useStore();
  const rs = readings(state.events);
  const shared = ROOMS.filter((r) => canSeeRoom(r, 'staff'));
  const open = state.issues.filter((i) => i.status !== 'resolved');
  const byStatus = (['submitted', 'acknowledged', 'scheduled', 'in_progress'] as const).map((s) => ({ s, n: open.filter((i) => i.status === s).length }));
  const alerts = state.runs.filter((r) => !r.resolved && canSeeRoom(roomById(r.roomId), 'staff'));
  const sensorsTotal = shared.reduce((a, r) => a + r.sensors.length, 0);
  const offline = rs.filter((r) => r.level === 'offline' && shared.some((x) => x.id === r.roomId)).length;
  const { done, total } = pathwayProgress(state.pathway);

  return (
    <div className="grid grid-cols-1 gap-6">
      <header>
        <p className="text-sm font-semibold text-primary">Staff view · {state.profile.residence}</p>
        <h1 id="page-title" tabIndex={-1} className="font-display text-[2rem] font-bold leading-tight text-ink outline-none sm:text-[2.5rem]">House overview</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Lock size={14} /> Building-level information only. Residents’ budgets, pathways and bedroom readings are not shown here.</p>
      </header>
      <DemoStrip />
      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Glance label="Active alerts" value={String(alerts.length)} sub={alerts[0] ? EVENTS[alerts[0].kind].title : 'Shared areas normal'} icon={<Bell size={18} />} tone={alerts.length ? 'danger' : 'ok'} onClick={() => go('engine')} />
        <Glance label="Open repairs" value={String(open.length)} sub={`${byStatus[0].n} new · ${byStatus[3].n} in progress`} icon={<Wrench size={18} />} tone={open.length ? 'warn' : 'ok'} onClick={() => go('maintenance')} />
        <Glance label="Sensors online" value={`${sensorsTotal - offline}/${sensorsTotal}`} sub="Shared areas and office" icon={<Activity size={18} />} tone={offline ? 'warn' : 'ok'} onClick={() => go('twin')} />
        <Glance label="Shared progress" value={state.shareProgress ? `${done}/${total}` : 'Private'} sub={state.shareProgress ? 'Pathway steps, count only' : 'Resident hasn’t shared'} icon={<CircleCheck size={18} />} tone="ok" onClick={() => go('dashboard')} />
      </section>
      <TwinCard title="Building HomeTwin" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card as="section" aria-labelledby="q-h">
          <CardTitle id="q-h" icon={<Wrench size={20} />}>Repair queue</CardTitle>
          <ul className="grid gap-2">
            {byStatus.map(({ s, n }) => (
              <li key={s} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"><span>{STATUS_LABEL[s]}</span><span className="font-display text-lg font-bold tabular-nums">{n}</span></li>
            ))}
          </ul>
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => go('maintenance')}>Manage repairs <ArrowRight size={14} /></Button></div>
        </Card>
        <Card as="section" aria-labelledby="sh-h">
          <CardTitle id="sh-h" icon={<Activity size={20} />}>Shared-area conditions</CardTitle>
          <ul className="grid gap-2">
            {shared.map((r) => {
              const lvl = roomLevel(r.id, rs);
              return (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                  <span>{roomName(r)}</span>
                  <Pill tone={lvl === 'alert' ? 'danger' : lvl === 'watch' ? 'warn' : lvl === 'offline' ? 'muted' : 'ok'}>{lvl === 'alert' ? 'Alert' : lvl === 'watch' ? 'Watch' : lvl === 'offline' ? 'Offline' : 'Normal'}</Pill>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function TwinPage() {
  const { state, target, clearTarget } = useStore();
  const [sel, setSel] = useState<string>(() => {
    const t = target && ROOMS.some((r) => r.id === target) ? target : state.role === 'resident' ? 'mine' : 'kitchen';
    if (target) window.setTimeout(clearTarget, 0);
    return t;
  });
  const active = state.runs.find((r) => !r.resolved);
  return (
    <div className="grid grid-cols-1 gap-6">
      <header>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">Interactive HomeTwin</p>
        <h1 id="page-title" tabIndex={-1} className="font-display text-[2rem] font-bold leading-tight text-ink outline-none">{state.profile.residence}</h1>
        <p className="mt-1 text-muted">Tap or tab to any room to see its simulated readings. {state.role === 'resident' ? 'Your room is private to you.' : 'Bedrooms are private to residents.'}</p>
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card><HomeTwin selected={sel} onSelect={setSel} highlight={active?.roomId} /></Card>
        <Card><RoomPanel roomId={sel} role={state.role} /></Card>
      </div>
    </div>
  );
}
