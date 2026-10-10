import { useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { COMMUNITY_EVENTS, COMMUNITY_LABEL, nextDate, time12, type CommunityCategory, type CommunityEvent } from '../data/community';
import { uid } from '../lib/defaults';
import { Button, Card, Notice, PageHeader, SourceBadge, cx, fmtDate } from './ui';
import { BookOpen, Briefcase, CalendarPlus, Check, Clock, HandHeart, MapPin, PartyPopper, Utensils } from '../icons';

export const COMMUNITY_ICON: Record<CommunityCategory, ReactNode> = {
  food: <Utensils size={18} />, activity: <PartyPopper size={18} />, learning: <BookOpen size={18} />, support: <HandHeart size={18} />, jobs: <Briefcase size={18} />,
};

export function upcomingCommunity() {
  return COMMUNITY_EVENTS.map((e) => ({ e, date: nextDate(e.weekday) })).sort((a, b) => (a.date + a.e.start).localeCompare(b.date + b.e.start));
}

export function CommunityCard({ e, date }: { e: CommunityEvent; date: string }) {
  const { state, update, toast } = useStore();
  const going = state.going.includes(e.id);
  const onCal = state.calendar.some((c) => c.source === 'community' && c.title === e.title && c.date === date);
  const add = () => {
    update((s) => ({ ...s, calendar: [...s.calendar, { id: uid('cal'), title: e.title, date, time: e.start, kind: 'community', notes: `${e.place}. ${e.goodToKnow}`, source: 'community', remind: true }] }));
    toast(`Added “${e.title}” to your calendar.`);
  };
  return (
    <Card as="article" className="grid gap-2" aria-labelledby={`ce-${e.id}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary-soft text-primary">{COMMUNITY_ICON[e.category]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{COMMUNITY_LABEL[e.category]} · {e.cost}</p>
          <h3 id={`ce-${e.id}`} className="font-display text-lg font-semibold leading-snug text-ink">{e.title}</h3>
        </div>
      </div>
      <p className="text-ink">{e.summary}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1"><Clock size={14} />{fmtDate(date)} · {time12(e.start)}–{time12(e.end)}</span>
        <span className="flex items-center gap-1"><MapPin size={14} />{e.place}</span>
      </div>
      <p className="text-sm text-muted">{e.recurring}. {e.goodToKnow}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={onCal ? 'secondary' : 'primary'} disabled={onCal} onClick={add}>{onCal ? <Check size={16} /> : <CalendarPlus size={16} />} {onCal ? 'On your calendar' : 'Add to calendar'}</Button>
        <Button size="sm" variant="ghost" aria-pressed={going} onClick={() => { update((s) => ({ ...s, going: going ? s.going.filter((x) => x !== e.id) : [...s.going, e.id] })); toast(going ? 'Marked not going.' : 'Marked as going. Only you can see this.'); }}>
          {going ? <Check size={16} /> : null}{going ? 'Going' : 'I might go'}
        </Button>
        <span className="ml-auto"><SourceBadge source="demo" /></span>
      </div>
    </Card>
  );
}

export function CommunityPage() {
  const [cat, setCat] = useState<CommunityCategory | 'all' | 'week'>('all');
  const list = upcomingCommunity().filter(({ e, date }) => {
    if (cat === 'all') return true;
    if (cat === 'week') { const diff = (new Date(date + 'T12:00:00').getTime() - Date.now()) / 86400000; return diff <= 3; }
    return e.category === cat;
  });
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Community" title="Things to do nearby" intro="Free meals, activities, classes, support groups and job events. Add anything to your calendar in one tap." />
      <Notice title="Demo listings">These events are examples for the prototype. In a live version, house staff and local partners keep this list current.</Notice>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter events">
        {(['all', 'week', ...(Object.keys(COMMUNITY_LABEL) as CommunityCategory[])] as const).map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cx('min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold', cat === c ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface hover:bg-surface-2')}>
            {c === 'all' ? 'All' : c === 'week' ? 'Next few days' : COMMUNITY_LABEL[c]}
          </button>
        ))}
      </div>
      <p className="-mt-3 text-sm text-muted" aria-live="polite">{list.length} events</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {list.map(({ e, date }) => <CommunityCard key={e.id} e={e} date={date} />)}
      </div>
    </div>
  );
}
