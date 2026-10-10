import { useState } from 'react';
import { useStore } from '../store';
import type { PathwayItem, PathwaySection, View } from '../types';
import { uid } from '../lib/defaults';
import { Button, Card, CardTitle, Notice, PageHeader, SourceBadge, Toggle, cx } from './ui';
import { ArrowRight, Check, EyeOff, Eye, FileText, House, Milestone, Plus, Route, Wallet } from '../icons';

export const SECTIONS: { id: PathwaySection; title: string; icon: typeof Wallet; link?: { view: View; label: string } }[] = [
  { id: 'budget', title: 'Budgeting', icon: Wallet, link: { view: 'simulator', label: 'Open the simulator' } },
  { id: 'documents', title: 'Documents', icon: FileText, link: { view: 'resources', label: 'Find ID & document help' } },
  { id: 'housing', title: 'Exploring housing', icon: House, link: { view: 'resources', label: 'Housing resources' } },
  { id: 'transition', title: 'Moving out', icon: Route },
];

export function pathwayProgress(items: PathwayItem[]) {
  const v = items.filter((i) => !i.hidden);
  return { done: v.filter((i) => i.done).length, total: v.length };
}

export function PathwayPage() {
  const { state, update, toast, go } = useStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showHidden, setShowHidden] = useState(false);
  const { done, total } = pathwayProgress(state.pathway);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const patch = (id: string, p: Partial<PathwayItem>) => update((s) => ({ ...s, pathway: s.pathway.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const add = (section: PathwaySection) => {
    const text = (drafts[section] ?? '').trim();
    if (!text) return;
    update((s) => ({ ...s, pathway: [...s.pathway, { id: uid('pw'), section, text, done: false, custom: true }] }));
    setDrafts({ ...drafts, [section]: '' });
    toast('Step added.');
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Pathway to independent housing" title="Your pathway" intro="An optional checklist you control. Add your own steps, hide ones that don’t fit, and go at your own pace.">
        <SourceBadge source="private" />
      </PageHeader>

      <Card className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto h-28 w-28" role="img" aria-label={`${done} of ${total} steps done`}>
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold tabular-nums">{pct}%</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold">{done} of {total} steps done</p>
          <p className="text-sm text-muted">There’s no deadline here and no score. Staff can’t see this list unless you turn on sharing below.</p>
          <div className="mt-3 max-w-md">
            <Toggle
              label="Share a progress summary with staff"
              desc={state.shareProgress ? `Staff see only “${done} of ${total} steps done”, never the steps themselves.` : 'Off. Nothing from this page is shared.'}
              checked={state.shareProgress}
              onChange={(v) => { update((s) => ({ ...s, shareProgress: v })); toast(v ? 'Staff will see your progress count only.' : 'Sharing turned off.'); }}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {SECTIONS.map((sec) => {
          const items = state.pathway.filter((i) => i.section === sec.id && (showHidden || !i.hidden));
          const visible = state.pathway.filter((i) => i.section === sec.id && !i.hidden);
          const Icon = sec.icon;
          return (
            <Card key={sec.id}>
              <CardTitle icon={<Icon size={20} />} action={<span className="text-sm font-semibold tabular-nums text-muted">{visible.filter((i) => i.done).length}/{visible.length}</span>}>{sec.title}</CardTitle>
              <ul className="grid gap-2">
                {items.map((i) => (
                  <li key={i.id} className={cx('flex items-start gap-3 rounded-xl px-2 py-2', i.hidden && 'opacity-50')}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={i.done}
                      aria-label={i.text}
                      onClick={() => patch(i.id, { done: !i.done })}
                      className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition', i.done ? 'border-primary bg-primary text-primary-ink' : 'border-muted bg-surface')}
                    >
                      {i.done && <Check size={16} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-ink', i.done && 'text-muted line-through')}>{i.text}</p>
                      {i.hint && <p className="text-xs text-muted">{i.hint}</p>}
                    </div>
                    <button type="button" onClick={() => patch(i.id, { hidden: !i.hidden })} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={i.hidden ? `Show “${i.text}”` : `Hide “${i.text}”`}>
                      {i.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(sec.id); }}>
                <label htmlFor={`add-${sec.id}`} className="sr-only">Add your own step to {sec.title}</label>
                <input id={`add-${sec.id}`} value={drafts[sec.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [sec.id]: e.target.value })} placeholder="Add your own step" className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-focus" />
                <Button type="submit" aria-label={`Add step to ${sec.title}`}><Plus size={18} /></Button>
              </form>
              {sec.link && <div className="mt-2"><Button size="sm" variant="ghost" onClick={() => go(sec.link!.view)}>{sec.link.label} <ArrowRight size={14} /></Button></div>}
            </Card>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => setShowHidden(!showHidden)} aria-pressed={showHidden}>{showHidden ? <EyeOff size={16} /> : <Eye size={16} />} {showHidden ? 'Hide hidden steps' : 'Show hidden steps'}</Button>
      </div>
      <Notice><span className="inline-flex items-center gap-1"><Milestone size={14} /> Your pathway is a planning tool, not a program requirement. Staff can’t change it or see it.</span></Notice>
    </div>
  );
}
