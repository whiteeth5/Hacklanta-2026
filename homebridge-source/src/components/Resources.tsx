import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { AppState, Resource, ResourceCategory } from '../types';
import { CATEGORY_LABEL, RESOURCES } from '../data/resources';
import { EVENTS } from '../lib/residence';
import { computeBudget } from '../lib/budget';
import { Button, Card, Notice, PageHeader, SourceBadge, cx } from './ui';
import { Bookmark, BookmarkCheck, Clock, Copy, ExternalLink, MapPin, Phone, Search, ShieldCheck } from '../icons';

/** Suggestions come only from what the resident is doing in the app: open alerts, budget gaps, pathway steps. */
export function suggestions(s: AppState): { r: Resource; why: string }[] {
  const out: { r: Resource; why: string }[] = [];
  const add = (cat: ResourceCategory, why: string) => RESOURCES.filter((r) => r.category === cat).slice(0, 2).forEach((r) => { if (!out.some((o) => o.r.id === r.id)) out.push({ r, why }); });
  s.runs.filter((r) => !r.resolved).forEach((run) => EVENTS[run.kind].resourceTags.forEach((t) => add(t as ResourceCategory, `Related to the ${EVENTS[run.kind].title.toLowerCase()} alert.`)));
  const b = computeBudget(s.budget);
  if (b.status !== 'surplus') { add('employment', 'Your simulated budget is tight. More income closes the gap fastest.'); add('food', 'Food support can free up money in a tight month.'); }
  const docsLeft = s.pathway.some((p) => p.section === 'documents' && !p.done && !p.hidden);
  if (docsLeft) add('id_documents', 'You still have documents to gather on your pathway.');
  const housingLeft = s.pathway.some((p) => p.section === 'housing' && !p.done && !p.hidden);
  if (housingLeft) add('housing', 'Next steps on your pathway are about finding housing.');
  return out.slice(0, 4);
}

function ResourceCard({ r, why }: { r: Resource; why?: string }) {
  const { state, update, toast } = useStore();
  const saved = state.bookmarks.includes(r.id);
  const toggle = () => { update((s) => ({ ...s, bookmarks: saved ? s.bookmarks.filter((x) => x !== r.id) : [r.id, ...s.bookmarks] })); toast(saved ? `Removed ${r.name} from bookmarks.` : `Bookmarked ${r.name}.`); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(r.phone); toast('Number copied.'); } catch { toast('Copy isn’t available here. Select the number instead.', 'warn'); }
  };
  return (
    <Card as="article" className="grid gap-2" aria-labelledby={`rn-${r.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{CATEGORY_LABEL[r.category]}</p>
          <h3 id={`rn-${r.id}`} className="font-display text-lg font-semibold leading-snug text-ink">{r.name}</h3>
        </div>
        <Button size="sm" variant={saved ? 'primary' : 'secondary'} onClick={toggle} aria-pressed={saved} aria-label={saved ? `Remove bookmark for ${r.name}` : `Bookmark ${r.name}`}>
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
      <div><SourceBadge source={r.verification === 'demo' ? 'demo' : 'national'} /></div>
      <p className="text-ink">{r.summary}</p>
      {why && <p className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm text-primary"><strong>Why this is here:</strong> {why}</p>}
      <p className="flex gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" /><span><strong>Eligibility:</strong> {r.eligibility}</span></p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {r.phone && (
          <span className="flex items-center gap-1">
            <Phone size={14} /><span className="select-all font-semibold tabular-nums text-ink">{r.phone}</span>
            {r.phone.length > 4 && <button type="button" onClick={copy} aria-label={`Copy ${r.phone}`} className="rounded p-1 text-primary hover:bg-surface-2"><Copy size={14} /></button>}
          </span>
        )}
        <span className="flex items-center gap-1"><Clock size={14} />{r.hours}</span>
        <span className="flex items-center gap-1"><MapPin size={14} />{r.area}</span>
      </div>
      {r.website && (
        <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary underline underline-offset-2">
          {r.website.replace('https://', '')} <ExternalLink size={13} />{r.verification === 'demo' && <span className="font-normal text-muted">(placeholder)</span>}
        </a>
      )}
    </Card>
  );
}

export function ResourcesPage() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ResourceCategory | 'all' | 'saved'>('all');
  const sugg = useMemo(() => suggestions(state), [state]);
  const cats = Object.keys(CATEGORY_LABEL) as ResourceCategory[];
  const list = RESOURCES.filter((r) => {
    if (cat === 'saved' && !state.bookmarks.includes(r.id)) return false;
    if (cat !== 'all' && cat !== 'saved' && r.category !== cat) return false;
    const hay = `${r.name} ${r.summary} ${r.eligibility} ${CATEGORY_LABEL[r.category]} ${r.area}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Reentry Resource Navigator" title="Resources" intro="Housing, jobs, food, transportation, ID documents, utilities and legal help. Search, filter and bookmark what you need." />
      <Notice title="Demo directory">Listings marked <strong>Demo listing</strong> are invented for this prototype. Four are real national services (211, Social Security cards, LIHEAP, Lifeline). Each program decides its own eligibility; HomeBridge never does.</Notice>
      <div className="grid gap-3">
        <label htmlFor="res-q" className="sr-only">Search resources</label>
        <div className="flex min-h-[48px] items-center gap-2 rounded-xl border border-line bg-surface px-3 shadow-card focus-within:ring-2 focus-within:ring-focus">
          <Search size={18} className="text-muted" />
          <input id="res-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “deposit”, “ID”, “jobs”, “bus”…" className="w-full bg-transparent py-2 outline-none" />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
          {(['all', 'saved', ...cats] as const).map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c as typeof cat)} className={cx('min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-3 text-sm font-semibold', cat === c ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface hover:bg-surface-2')}>
              {c === 'all' ? 'All' : c === 'saved' ? `Bookmarked (${state.bookmarks.length})` : CATEGORY_LABEL[c as ResourceCategory]}
            </button>
          ))}
        </div>
      </div>
      {!q && cat === 'all' && sugg.length > 0 && (
        <section aria-labelledby="sugg-h" className="grid gap-3">
          <h2 id="sugg-h" className="font-display text-xl font-semibold">Suggested for you</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{sugg.map((s) => <ResourceCard key={s.r.id} r={s.r} why={s.why} />)}</div>
        </section>
      )}
      <section aria-labelledby="all-h" className="grid gap-3">
        <h2 id="all-h" className="font-display text-xl font-semibold">{cat === 'saved' ? 'Bookmarked' : 'All resources'} <span className="text-base font-normal text-muted" aria-live="polite">({list.length})</span></h2>
        {list.length === 0 ? <Card><p>{cat === 'saved' ? 'No bookmarks yet.' : 'No matches. Try a shorter word or another category.'}</p></Card> : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{list.map((r) => <ResourceCard key={r.id} r={r} />)}</div>
        )}
      </section>
    </div>
  );
}
