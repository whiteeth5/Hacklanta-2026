import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { CalendarEvent, CalendarKind } from '../types';
import { localDate, uid } from '../lib/defaults';
import { time12 } from '../data/community';
import { Button, Card, CardTitle, PageHeader, SelectField, SourceBadge, TextArea, TextField, Toggle, cx, fmtDate } from './ui';
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash, X } from '../icons';

export const KIND_LABEL: Record<CalendarKind, string> = {
  appointment: 'Appointment or check-in', court: 'Court date', work: 'Work shift', interview: 'Job interview',
  housing: 'Housing viewing', program: 'Program meeting', community: 'Community event', deadline: 'Deadline or pickup', other: 'Other',
};
const KIND_COLOR: Record<CalendarKind, string> = {
  appointment: 'var(--primary)', court: 'var(--danger)', work: 'var(--info)', interview: 'var(--ok)', housing: 'var(--secondary)',
  program: 'var(--primary)', community: 'var(--warn)', deadline: 'var(--danger)', other: 'var(--muted)',
};
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function upcoming(events: CalendarEvent[], days = 14) {
  const today = localDate();
  const limit = localDate(new Date(Date.now() + days * 86400000));
  return events.filter((e) => e.date >= today && e.date <= limit).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

const blank = (date: string): CalendarEvent => ({ id: uid('cal'), title: '', date, time: '', kind: 'appointment', notes: '', source: 'me', remind: true });

export function CalendarPage() {
  const { state, update, toast } = useStore();
  const today = localDate();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today);
  const [draft, setDraft] = useState<CalendarEvent | null>(null);
  const [err, setErr] = useState<{ title?: string; date?: string }>({});

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    state.calendar.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]));
    m.forEach((v) => v.sort((a, b) => a.time.localeCompare(b.time)));
    return m;
  }, [state.calendar]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { iso: localDate(d), inMonth: d.getMonth() === month.getMonth(), day: d.getDate() }; });
  }, [month]);

  const save = () => {
    if (!draft) return;
    const e: typeof err = {};
    if (!draft.title.trim()) e.title = 'Give it a name, like “Caseworker meeting”.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) e.date = 'Pick a date.';
    setErr(e);
    if (Object.keys(e).length) return;
    const exists = state.calendar.some((c) => c.id === draft.id);
    update((s) => ({ ...s, calendar: exists ? s.calendar.map((c) => (c.id === draft.id ? { ...draft, title: draft.title.trim() } : c)) : [...s.calendar, { ...draft, title: draft.title.trim() }] }));
    toast(exists ? 'Date updated.' : 'Added to your calendar.');
    setSelected(draft.date);
    setDraft(null);
  };
  const remove = (id: string) => { update((s) => ({ ...s, calendar: s.calendar.filter((c) => c.id !== id) })); toast('Removed from calendar.'); setDraft(null); };

  const dayEvents = byDate.get(selected) ?? [];
  const next = upcoming(state.calendar, 30).slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Calendar" title="Important dates" intro="Appointments, court dates, work shifts, viewings and anything else you don’t want to miss. Private to you." >
        <Button variant="primary" onClick={() => { setDraft(blank(selected)); setErr({}); }}><Plus size={18} /> Add a date</Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold" aria-live="polite">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></Button>
              <Button size="sm" variant="ghost" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(today); }}>Today</Button>
              <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden="true">{WEEK.map((w) => <span key={w} className="py-1">{w}</span>)}</div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Month">
            {cells.map((c) => {
              const evs = byDate.get(c.iso) ?? [];
              const sel = c.iso === selected;
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="gridcell"
                  aria-selected={sel}
                  aria-label={`${fmtDate(c.iso)}${evs.length ? `, ${evs.length} event${evs.length > 1 ? 's' : ''}` : ''}`}
                  onClick={() => setSelected(c.iso)}
                  onDoubleClick={() => { setSelected(c.iso); setDraft(blank(c.iso)); }}
                  className={cx('flex min-h-[56px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition sm:min-h-[76px]', sel ? 'border-primary bg-primary-soft' : 'border-line hover:bg-surface-2', !c.inMonth && 'opacity-45')}
                >
                  <span className={cx('grid h-6 w-6 place-items-center rounded-full text-xs font-bold tabular-nums', c.iso === today ? 'bg-primary text-primary-ink' : 'text-ink')}>{c.day}</span>
                  <span className="flex w-full flex-wrap gap-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className="hidden w-full truncate rounded px-1 text-[0.68rem] font-semibold text-ink sm:block" style={{ background: `color-mix(in srgb, ${KIND_COLOR[e.kind]} 22%, transparent)` }}>{e.title}</span>
                    ))}
                    {evs.map((e) => <span key={e.id + 'd'} className="h-1.5 w-1.5 rounded-full sm:hidden" style={{ background: KIND_COLOR[e.kind] }} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid content-start gap-6">
          {draft ? (
            <Card>
              <CardTitle icon={<Pencil size={20} />} action={<Button size="sm" variant="ghost" aria-label="Close" onClick={() => setDraft(null)}><X size={18} /></Button>}>
                {state.calendar.some((c) => c.id === draft.id) ? 'Edit date' : 'Add a date'}
              </CardTitle>
              <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
                <TextField id="cal-title" label="What is it?" value={draft.title} error={err.title} maxLength={70} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <SelectField id="cal-kind" label="Type" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CalendarKind })} options={(Object.keys(KIND_LABEL) as CalendarKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
                <div className="grid grid-cols-2 gap-3">
                  <TextField id="cal-date" type="date" label="Date" value={draft.date} error={err.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                  <TextField id="cal-time" type="time" label="Time (optional)" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
                </div>
                <TextArea id="cal-notes" label="Notes (optional)" hint="Address, what to bring, who you’re meeting." value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                <Toggle label="Show on my dashboard" desc="Appears under “Coming up” in the week before." checked={draft.remind} onChange={(v) => setDraft({ ...draft, remind: v })} />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="primary">Save</Button>
                  {state.calendar.some((c) => c.id === draft.id) && <Button variant="danger" onClick={() => remove(draft.id)}><Trash size={16} /> Delete</Button>}
                </div>
              </form>
            </Card>
          ) : (
            <Card>
              <CardTitle icon={<CalendarDays size={20} />} action={<Button size="sm" variant="ghost" onClick={() => setDraft(blank(selected))}><Plus size={16} /> Add</Button>}>{fmtDate(selected)}</CardTitle>
              {dayEvents.length === 0 ? <p className="text-muted">Nothing on this day.</p> : (
                <ul className="grid gap-2">
                  {dayEvents.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => { setDraft(e); setErr({}); }} className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left hover:bg-surface-2">
                        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: KIND_COLOR[e.kind] }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{e.title}</span>
                          <span className="block text-sm text-muted">{e.time ? time12(e.time) + ' · ' : ''}{KIND_LABEL[e.kind]}</span>
                          {e.notes && <span className="block text-sm text-muted">{e.notes}</span>}
                        </span>
                        <Pencil size={16} className="mt-1 shrink-0 text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          <Card>
            <CardTitle icon={<Bell size={20} />} action={<SourceBadge source="private" />}>Next 30 days</CardTitle>
            {next.length === 0 ? <p className="text-muted">Nothing coming up.</p> : (
              <ul className="grid gap-2">
                {next.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => { setSelected(e.date); const d = new Date(e.date + 'T12:00:00'); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left hover:bg-primary-soft">
                      <span className="min-w-0"><span className="block truncate font-semibold">{e.title}</span><span className="text-xs text-muted">{KIND_LABEL[e.kind]}</span></span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtDate(e.date).replace(/, \d{4}$/, '')}{e.time ? ` · ${time12(e.time)}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
