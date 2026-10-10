import { useState } from 'react';
import { useStore } from '../store';
import type { Appearance } from '../types';
import { PALETTES } from '../lib/palettes';
import { Button, Card, CardTitle, ChoiceGroup, Notice, PageHeader, TextField, Toggle, cx } from './ui';
import { Accessibility, Check, Lock, Monitor, Moon, Palette, RotateCcw, Sun, Trash, User, UserCog } from '../icons';

export function SettingsPage() {
  const { state, update, toast, reset, mode, storageOk } = useStore();
  const a = state.appearance;
  const setA = (p: Partial<Appearance>) => update((s) => ({ ...s, appearance: { ...s.appearance, ...p } }));
  const [confirm, setConfirm] = useState(false);
  const p = state.profile;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Settings" title="Make it yours" intro="Choose how HomeBridge looks and reads. Your choices are saved on this device." />

      <Card id="appearance">
        <CardTitle icon={<Palette size={20} />}>Color palette</CardTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Color palette">
          {PALETTES.map((pal) => {
            const t = mode === 'dark' ? pal.dark : pal.light;
            const on = a.palette === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { setA({ palette: pal.id }); toast(`${pal.name} palette applied.`); }}
                className={cx('group relative overflow-hidden rounded-2xl border-2 text-left transition', on ? 'border-primary' : 'border-line hover:border-muted')}
              >
                <div className="flex h-20" style={{ background: t.bg }} aria-hidden="true">
                  <div className="m-3 flex flex-1 flex-col justify-between rounded-xl p-2" style={{ background: t.surface, boxShadow: t.shadow }}>
                    <div className="h-2 w-16 rounded-full" style={{ background: t.ink, opacity: 0.8 }} />
                    <div className="flex gap-1.5">
                      <span className="h-5 w-10 rounded-md" style={{ background: t.primary }} />
                      <span className="h-5 w-5 rounded-md" style={{ background: t.secondary }} />
                      <span className="h-5 w-5 rounded-md" style={{ background: t.warn }} />
                      <span className="h-5 w-5 rounded-md" style={{ background: t.danger }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2">
                  <span><span className="block font-semibold text-ink">{pal.name}</span><span className="text-xs text-muted">{pal.blurb}</span></span>
                  {on && <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-ink"><Check size={16} /></span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <ChoiceGroup
            name="mode"
            legend="Light or dark"
            value={a.mode}
            onChange={(v) => setA({ mode: v })}
            options={[{ value: 'system', label: 'Match my device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
          <p className="flex items-center gap-2 self-end text-sm text-muted">{mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />} Showing {mode} mode{a.mode === 'system' ? ' from your device' : ''}. <Monitor size={16} /></p>
        </div>
      </Card>

      <Card>
        <CardTitle icon={<Accessibility size={20} />}>Reading & motion</CardTitle>
        <div className="grid gap-5">
          <ChoiceGroup
            name="text"
            legend="Text size"
            value={String(a.textScale)}
            onChange={(v) => setA({ textScale: Number(v) })}
            options={[{ value: '1', label: 'Default' }, { value: '1.15', label: 'Large' }, { value: '1.3', label: 'Larger' }, { value: '1.5', label: 'Largest' }]}
          />
          <Toggle label="Reduce motion" desc="Turns off animations, including the Impact Engine’s step-by-step reveal." checked={a.reduceMotion} onChange={(v) => setA({ reduceMotion: v })} />
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Every control works with a keyboard (Tab, Enter, Space) and a screen reader. Rooms in the HomeTwin are buttons you can tab to. Status is always shown with words, not color alone.</p>
        </div>
      </Card>

      <Card>
        <CardTitle icon={<UserCog size={20} />}>Who’s using HomeBridge</CardTitle>
        <ChoiceGroup
          name="role"
          legend="View"
          value={state.role}
          onChange={(v) => { update((s) => ({ ...s, role: v })); toast(v === 'staff' ? 'Staff view: building-level information only.' : 'Resident view.'); }}
          options={[{ value: 'resident', label: 'Resident', desc: 'Your room, budget, pathway and reports' }, { value: 'staff', label: 'House staff', desc: 'Shared areas and all repair reports' }]}
        />
        <Notice title="How information is separated">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Private to the resident:</strong> their bedroom readings, budget simulator, pathway checklist and bookmarks.</li>
            <li><strong>Building-level (staff can see):</strong> shared rooms, the staff office, repair reports, and alerts a resident chooses to share.</li>
            <li><strong>Never shown to anyone:</strong> other residents’ rooms. No tracking, scoring or risk ratings exist in HomeBridge.</li>
          </ul>
        </Notice>
      </Card>

      {state.role === 'resident' && (
        <Card>
          <CardTitle icon={<User size={20} />}>Your housing</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="First name (optional)" value={p.firstName} maxLength={30} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, firstName: e.target.value } }))} />
            <TextField label="Residence name" value={p.residence} maxLength={40} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, residence: e.target.value } }))} />
            <TextField label="Room" value={p.room} maxLength={20} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, room: e.target.value } }))} />
            <TextField label="Move-in date" type="date" value={p.moveIn} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, moveIn: e.target.value } }))} />
            <TextField label="Planned stay" suffix="months" inputMode="numeric" value={String(p.plannedMonths)} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, plannedMonths: Math.max(1, Math.min(36, Number(e.target.value) || 1)) } }))} />
            <TextField label="Monthly program fee" prefix="$" inputMode="decimal" value={String(p.programFee)} onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, programFee: Math.max(0, Number(e.target.value.replace(/[$,]/g, '')) || 0) } }))} />
          </div>
        </Card>
      )}

      <Card>
        <CardTitle icon={<Lock size={20} />}>Data & demo</CardTitle>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
          <li>Everything stays in this browser. Nothing is uploaded.</li>
          <li>All sensor readings and events are <strong>simulated</strong>. No hardware or accounts are connected.</li>
          <li>Repair cost ranges are illustrative estimates, not quotes.</li>
        </ul>
        {!storageOk && <Notice tone="warn">This browser isn’t saving data right now. Changes last until you close the page.</Notice>}
        {!confirm ? (
          <Button variant="danger" onClick={() => setConfirm(true)}><RotateCcw size={18} /> Reset demo</Button>
        ) : (
          <div className="grid gap-2 rounded-xl border border-danger bg-danger-soft p-3" role="group" aria-label="Confirm reset">
            <p className="font-semibold">Reset all demo data and settings to the starting example?</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={() => { reset(); toast('Demo reset.'); }}><Trash size={18} /> Yes, reset</Button>
              <Button onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
