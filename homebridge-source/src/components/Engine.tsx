import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import type { EngineRun, EventKind } from '../types';
import { EVENTS, WATER_RATE_PER_GAL, roomById, waterCost } from '../lib/residence';
import { RESOURCES, CATEGORY_LABEL } from '../data/resources';
import { usd } from '../lib/budget';
import { HomeTwin } from './HomeTwin';
import { Button, Card, CardTitle, Notice, PageHeader, Pill, SourceBadge, cx, fmtDate } from './ui';
import { Bell, Check, CircleAlert, ClipboardList, DollarSign, FlaskConical, HeartHandshake, Info, Lock, MapPin, ArrowRight, Wrench, Zap } from '../icons';

export function EnginePage() {
  const { state, target, clearTarget, triggerEvent, go, toast } = useStore();
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    if (target) { setRunId(target); clearTarget(); }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = state.runs.find((r) => r.id === runId) ?? state.runs.find((r) => !r.resolved) ?? null;
  const kinds = (Object.keys(EVENTS) as EventKind[]).filter((k) => state.role === 'resident' || EVENTS[k].roomId !== 'mine');

  const start = (k: EventKind) => {
    const id = triggerEvent(k);
    setRunId(id);
    toast(`Simulated: ${EVENTS[k].title}`, 'info');
    window.setTimeout(() => document.getElementById('run-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Reintegration Impact Engine" title="From alert to action" intro="One event becomes a clear workflow: where it is, what it means, what it could cost, who handles it, and where to find help.">
        <SourceBadge source="simulated" />
      </PageHeader>

      <Card>
        <CardTitle icon={<FlaskConical size={20} />}>Simulate an event</CardTitle>
        <p className="mb-3 text-sm text-muted">Pick an event to see the full workflow. Nothing real is affected; all readings are simulated.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {kinds.map((k) => {
            const active = state.events.some((e) => e.kind === k);
            return (
              <Button key={k} variant={k === 'leak_laundry' ? 'primary' : 'secondary'} onClick={() => start(k)} className="justify-start text-left" aria-pressed={active}>
                {k === 'leak_laundry' ? <Zap size={18} /> : null}
                {EVENTS[k].button}
                {active && <span className="ml-auto text-xs font-bold">Active</span>}
              </Button>
            );
          })}
        </div>
      </Card>

      <div id="run-panel" className="scroll-mt-24">
        {current ? <RunView key={current.id} run={current} /> : (
          <Card><p className="text-ink">No events yet.</p><p className="text-sm text-muted">Start with “Simulate a water leak in the laundry” to see the engine connect sensors, costs, maintenance and resources.</p></Card>
        )}
      </div>

      {state.runs.length > 0 && (
        <Card>
          <CardTitle icon={<ClipboardList size={20} />}>Event log</CardTitle>
          <ul className="grid gap-2">
            {state.runs.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setRunId(r.id)} className={cx('flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left', current?.id === r.id ? 'border-primary bg-primary-soft' : 'border-line hover:bg-surface-2')}>
                  <span className="min-w-0"><span className="block font-semibold text-ink">{EVENTS[r.kind].title}</span><span className="text-xs text-muted">{roomById(r.roomId).name} · {fmtDate(r.startedAt, true)}</span></span>
                  <Pill tone={r.resolved ? 'ok' : EVENTS[r.kind].severity === 'urgent' ? 'danger' : 'warn'}>{r.resolved ? 'Resolved' : 'Active'}</Pill>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => go('maintenance')}><Wrench size={16} /> See maintenance reports</Button></div>
        </Card>
      )}
    </div>
  );
}

function Step({ n, icon, title, children, shown, last = false }: { n: number; icon: ReactNode; title: string; children: ReactNode; shown: boolean; last?: boolean }) {
  return (
    <li className={cx('relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 transition-opacity duration-300', shown ? 'opacity-100' : 'opacity-0')} aria-hidden={!shown}>
      <div className="flex flex-col items-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-ink" aria-hidden="true">{icon}</span>
        {!last && <span className="mt-1 w-0.5 flex-1 bg-line" aria-hidden="true" />}
      </div>
      <div className="min-w-0 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Step {n}</p>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <div className="mt-2 text-ink">{children}</div>
      </div>
    </li>
  );
}

export function RunView({ run }: { run: EngineRun }) {
  const { state, go, shareRunWithStaff, resolveRun, toast, update } = useStore();
  const def = EVENTS[run.kind];
  const room = roomById(run.roomId);
  const fresh = Date.now() - new Date(run.startedAt).getTime() < 4000 && !state.appearance.reduceMotion;
  const [shown, setShown] = useState(fresh ? 1 : 7);
  const [hours, setHours] = useState(24);
  const issue = run.issueId ? state.issues.find((i) => i.id === run.issueId) : undefined;
  const isPrivate = room.scope === 'mine';

  useEffect(() => {
    if (shown >= 7) return;
    const t = window.setTimeout(() => setShown((s) => s + 1), 450);
    return () => window.clearTimeout(t);
  }, [shown]);

  const water = waterCost(def, hours);
  const tier = def.costs[hours <= 24 ? 0 : hours <= 72 ? Math.min(1, def.costs.length - 1) : def.costs.length - 1];
  const recs = [...RESOURCES.filter((r) => def.resourceTags.includes(r.category)), RESOURCES.find((r) => r.id === 'n-211')!].slice(0, 4);
  const saved = (id: string) => state.bookmarks.includes(id);

  return (
    <Card as="section" aria-labelledby="run-h" className={cx('border-2', run.resolved ? 'border-ok' : def.severity === 'urgent' ? 'border-danger' : 'border-warn')}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cx('text-xs font-bold uppercase tracking-wider', run.resolved ? 'text-ok' : def.severity === 'urgent' ? 'text-danger' : 'text-warn')}>
            {run.resolved ? 'Resolved' : def.severity === 'urgent' ? 'Urgent' : def.severity === 'warning' ? 'Needs attention' : 'For your information'}
          </p>
          <h2 id="run-h" className="font-display text-2xl font-bold text-ink">{def.title}</h2>
          <p className="text-sm text-muted">{room.name} · {fmtDate(run.startedAt, true)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SourceBadge source="simulated" />
          {isPrivate && <SourceBadge source="private" />}
        </div>
      </div>

      <ol className="grid" aria-live="polite">
        <Step n={1} icon={<Bell size={18} />} title="Detected" shown={shown >= 1}>
          <p>{def.what}</p>
          <p className="mt-1 text-sm text-muted">Source: simulated sensor reading, not a diagnosis.</p>
        </Step>
        <Step n={2} icon={<MapPin size={18} />} title={`Located: ${room.name}`} shown={shown >= 2}>
          <div className="max-w-md rounded-xl border border-line bg-surface-2 p-2"><HomeTwin compact highlight={room.id} selected={room.id} onSelect={() => go('twin', room.id)} /></div>
        </Step>
        <Step n={3} icon={<Info size={18} />} title="What it means, and what it doesn’t" shown={shown >= 3}>
          <ul className="grid gap-2">
            <li className="rounded-xl bg-surface-2 p-3 text-sm"><strong>What it doesn’t mean:</strong> {def.notMeaning}</li>
            <li className="rounded-xl bg-surface-2 p-3 text-sm">
              <strong>What to do now:</strong>
              <ol className="mt-1 list-decimal space-y-1 pl-5">{def.residentSteps.map((s) => <li key={s}>{s}</li>)}</ol>
            </li>
          </ul>
        </Step>
        <Step n={4} icon={<DollarSign size={18} />} title="Estimated financial impact" shown={shown >= 4}>
          {def.flowGalPerHour ? (
            <div className="rounded-xl bg-surface-2 p-3">
              <label htmlFor={`hrs-${run.id}`} className="text-sm font-semibold">If no one fixes it for <span className="tabular-nums text-primary">{hours < 24 ? `${hours} hours` : `${Math.round(hours / 24)} day${hours >= 48 ? 's' : ''}`}</span></label>
              <input id={`hrs-${run.id}`} type="range" min={6} max={168} step={6} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-2 w-full" aria-valuetext={`${hours} hours`} />
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div><p className="text-xs font-semibold uppercase text-muted">Water lost</p><p className="font-display text-xl font-bold tabular-nums">{water.gallons.toLocaleString('en-US')} gal</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted">Water cost</p><p className="font-display text-xl font-bold tabular-nums">{usd(water.cost, true)}</p></div>
                <div className="col-span-2 sm:col-span-1"><p className="text-xs font-semibold uppercase text-muted">Likely repair</p><p className="font-display text-xl font-bold tabular-nums text-danger">{usd(tier.low)}–{usd(tier.high)}</p></div>
              </div>
              <p className="mt-2 text-xs text-muted">The water itself is cheap. The damage it causes is not, which is why reporting quickly matters.</p>
            </div>
          ) : null}
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-surface-2"><tr><th scope="col" className="px-3 py-2">Scenario</th><th scope="col" className="px-3 py-2">Estimated range</th><th scope="col" className="px-3 py-2">Usually paid by</th></tr></thead>
              <tbody>
                {def.costs.map((c) => (
                  <tr key={c.label} className={cx('border-t border-line', c === tier && !!def.flowGalPerHour && 'bg-danger-soft')}>
                    <td className="px-3 py-2">{c.label}</td><td className="px-3 py-2 tabular-nums">{usd(c.low)}–{usd(c.high)}</td><td className="px-3 py-2">{c.who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3"><Notice tone="ok" title="What this means for you">{def.residentImpact}</Notice></div>
          {def.assumptions.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="font-semibold text-primary">How this was estimated</summary>
              <ul className="mt-1 list-disc pl-5 text-muted">{def.assumptions.map((a) => <li key={a}>{a}</li>)}<li>Water rate used: ${WATER_RATE_PER_GAL} per gallon.</li></ul>
            </details>
          )}
        </Step>
        <Step n={5} icon={<Wrench size={18} />} title="Maintenance report" shown={shown >= 5}>
          {issue ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3">
              <span className="min-w-0"><span className="block font-semibold">{issue.title}</span><span className="text-xs text-muted">Created automatically · labeled “Sensor alert” so it’s never confused with a resident report</span></span>
              <Button size="sm" onClick={() => go('maintenance', `issue:${issue.id}`)}>Open report</Button>
            </div>
          ) : isPrivate ? (
            <div className="rounded-xl bg-surface-2 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Lock size={16} /> This alert is private to you</p>
              <p className="mt-1 text-muted">Readings from your room are never sent to staff automatically. Share it if you want them to fix the cooling.</p>
              <div className="mt-2"><Button size="sm" variant="primary" onClick={() => { shareRunWithStaff(run.id); toast('Shared with staff as a maintenance report.'); }}>Share with staff</Button></div>
            </div>
          ) : null}
        </Step>
        <Step n={6} icon={<CircleAlert size={18} />} title="Staff notified" shown={shown >= 6}>
          <p className="text-sm">
            {issue
              ? <>Staff see the room, the alert and the report. They <strong>don’t</strong> see your budget, your pathway checklist or your bedroom readings. <span className="text-muted">(Simulated notification; no message is actually sent.)</span></>
              : 'Not notified. Nothing leaves your view unless you share it.'}
          </p>
        </Step>
        <Step n={7} icon={<HeartHandshake size={18} />} title="Help that fits this situation" shown={shown >= 7} last>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recs.map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted">{CATEGORY_LABEL[r.category]} · {r.verification === 'demo' ? 'Demo listing' : 'Real national service'}</p>
                <p className="mt-1">{r.summary}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  aria-pressed={saved(r.id)}
                  onClick={() => { update((s) => ({ ...s, bookmarks: saved(r.id) ? s.bookmarks.filter((x) => x !== r.id) : [r.id, ...s.bookmarks] })); toast(saved(r.id) ? 'Bookmark removed.' : 'Bookmarked.'); }}
                >
                  {saved(r.id) ? <Check size={16} /> : null}{saved(r.id) ? 'Bookmarked' : 'Bookmark'}
                </Button>
              </li>
            ))}
          </ul>
        </Step>
      </ol>

      {!run.resolved && shown >= 7 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button variant="primary" onClick={() => { resolveRun(run.id); toast('Simulation cleared. Readings are back to normal.'); }}><Check size={18} /> Mark fixed (end simulation)</Button>
          <Button onClick={() => go('resources')}><ArrowRight size={18} /> All resources</Button>
        </div>
      )}
    </Card>
  );
}
