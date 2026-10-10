import { useId } from 'react';
import { useStore } from '../store';
import type { Budget, ExpenseKey } from '../types';
import { EXPENSE_META, HOUSING_PRESETS, computeBudget, usd } from '../lib/budget';
import { Donut, TrajectoryChart, type Slice } from './charts';
import { Button, Card, CardTitle, ChoiceGroup, Notice, PageHeader, Pill, SourceBadge, cx } from './ui';
import { Briefcase, Bus, Car, ChartPie, House, Lock, PiggyBank, RotateCcw, Users, Wallet } from '../icons';
import { defaultBudget } from '../lib/defaults';

const SLICE_ORDER: ExpenseKey[] = ['rent', 'utilities', 'groceries', 'transportation', 'phone', 'internet', 'insurance', 'personal', 'fees', 'debt', 'other'];

/** Slider + number input pair, kept in sync, both labelled. */
function MoneyInput({ label, hint, value, max, step, onChange, suffix }: { label: string; hint?: string; value: number; max: number; step: number; onChange: (n: number) => void; suffix?: string }) {
  const id = useId();
  const set = (raw: string) => {
    const n = Number(raw.replace(/[$,]/g, ''));
    onChange(Number.isFinite(n) && n >= 0 ? n : 0);
  };
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`${id}-n`} className="text-sm font-semibold text-ink">{label}</label>
        <div className="flex items-center rounded-lg border border-line bg-surface px-2 focus-within:ring-2 focus-within:ring-focus">
          {!suffix && <span className="text-muted" aria-hidden="true">$</span>}
          <input id={`${id}-n`} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="w-20 bg-transparent py-1 text-right tabular-nums outline-none" aria-describedby={hint ? `${id}-h` : undefined} />
          {suffix && <span className="ml-1 text-sm text-muted" aria-hidden="true">{suffix}</span>}
        </div>
      </div>
      <input type="range" min={0} max={Math.max(max, value)} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={`${label} slider`} />
      {hint && <p id={`${id}-h`} className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SimulatorPage() {
  const { state, update, toast } = useStore();
  const b = state.budget;
  const r = computeBudget(b);
  const set = (patch: Partial<Budget>) => update((s) => ({ ...s, budget: { ...s.budget, ...patch } }));
  const setExp = (k: ExpenseKey, v: number) => update((s) => ({ ...s, budget: { ...s.budget, expenses: { ...s.budget.expenses, [k]: v } } }));

  const preset = (p: keyof typeof HOUSING_PRESETS) => {
    const h = HOUSING_PRESETS[p];
    update((s) => ({ ...s, budget: { ...s.budget, housingPreset: p, expenses: { ...s.budget.expenses, rent: h.rent, utilities: h.utilities }, moveIn: { ...s.budget.moveIn, deposit: h.rent, firstMonth: h.rent } } }));
  };
  const whatIf = (label: string, fn: (x: Budget) => Budget) => { update((s) => ({ ...s, budget: fn(s.budget) })); toast(`Applied: ${label}`, 'info'); };

  const tone = r.status === 'shortfall' ? 'danger' : r.status === 'tight' ? 'warn' : 'ok';
  const palette = ['var(--primary)', 'var(--secondary)', 'var(--info)', 'var(--warn)', 'var(--ok)', 'var(--danger)'];
  const slices: Slice[] = SLICE_ORDER.map((k, i) => ({ key: k, label: EXPENSE_META[k].label, value: b.expenses[k] || 0, color: palette[i % palette.length] }))
    .filter((s) => s.value > 0);
  if (r.leftover > 0) slices.push({ key: 'left', label: 'Left over', value: r.leftover, color: 'var(--line)' });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Independent Living Simulator" title="Picture your first place" intro="Change your income and costs and see your monthly budget update instantly. These numbers are yours alone.">
        <SourceBadge source="private" />
      </PageHeader>

      <section aria-label="Results" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={cx('border-2 lg:col-span-1', tone === 'danger' ? 'border-danger' : tone === 'warn' ? 'border-warn' : 'border-ok')}>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Each month</p>
          <p className={cx('font-display text-4xl font-bold tabular-nums', tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ok')} aria-live="polite">
            {r.leftover >= 0 ? usd(r.leftover) : `−${usd(-r.leftover)}`}
          </p>
          <p className="text-sm text-muted">{r.leftover >= 0 ? 'left after expenses' : 'short each month'}</p>
          <div className="mt-2"><Pill tone={tone}>{r.status === 'shortfall' ? 'Shortfall' : r.status === 'tight' ? 'Tight but balanced' : 'Room to save'}</Pill></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Income</dt><dd className="font-semibold tabular-nums">{usd(r.income)}</dd></div>
            <div><dt className="text-muted">Expenses</dt><dd className="font-semibold tabular-nums">{usd(r.expenses)}</dd></div>
            <div><dt className="text-muted">Rent share</dt><dd className={cx('font-semibold tabular-nums', r.rentShare > 0.4 ? 'text-danger' : r.rentShare > 0.3 ? 'text-warn' : 'text-ok')}>{Math.round(r.rentShare * 100)}% of income</dd></div>
            <div><dt className="text-muted">Now at {state.profile.residence}</dt><dd className="font-semibold tabular-nums">{usd(state.profile.programFee)} program fee</dd></div>
          </dl>
          <div className="mt-3">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-line" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.rentShare * 100)} aria-label="Rent as a share of income">
              <div className={cx('h-full rounded-full', r.rentShare > 0.4 ? 'bg-danger' : r.rentShare > 0.3 ? 'bg-warn' : 'bg-ok')} style={{ width: `${Math.min(r.rentShare * 100, 100)}%` }} />
              <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: '30%' }} aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs text-muted">The marker is the common 30%-of-income guideline. Many landlords also ask for income of about 3× rent.</p>
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <CardTitle icon={<ChartPie size={20} />}>Where it goes</CardTitle>
          <Donut slices={slices} centerTop={usd(r.expenses)} centerBottom="monthly costs" summary={`Monthly costs total ${usd(r.expenses)}. Rent is ${usd(b.expenses.rent)}.`} size={210} />
        </Card>

        <Card className="lg:col-span-1">
          <CardTitle icon={<PiggyBank size={20} />}>Move-in fund</CardTitle>
          <p className="font-display text-3xl font-bold tabular-nums text-ink">
            {r.monthsToMoveIn === 0 ? 'Ready now' : r.monthsToMoveIn === null ? 'Not yet' : `${r.monthsToMoveIn} month${r.monthsToMoveIn === 1 ? '' : 's'}`}
          </p>
          <p className="text-sm text-muted">
            {r.monthsToMoveIn === null ? 'Close the monthly gap first, then your savings can grow.' : `to save ${usd(r.moveInTotal)} for deposit, first month, fees and basics, starting from ${usd(b.currentSavings)}.`}
          </p>
          <TrajectoryChart
            height={170}
            xWord="Month"
            refLabel="Move-in goal"
            points={r.projection.map((p) => ({ x: p.month, label: `Month ${p.month}`, a: p.savings, solid: p.month === 0 }))}
            budget={r.moveInTotal}
            formatY={(n) => usd(n)}
            aLabel="Savings if you save all of what’s left"
            summary={`Savings grow from ${usd(b.currentSavings)} to ${usd(r.projection[12].savings)} in 12 months, against a move-in goal of ${usd(r.moveInTotal)}.`}
          />
        </Card>
      </section>

      <Card>
        <CardTitle icon={<Users size={20} />}>Try a what-if</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => whatIf('Share with a roommate', (x) => ({ ...x, housingPreset: 'custom', expenses: { ...x.expenses, rent: Math.round(x.expenses.rent * 0.55), utilities: Math.round(x.expenses.utilities * 0.5) } }))}><Users size={18} /> Share with a roommate</Button>
          <Button onClick={() => whatIf('$1 more per hour', (x) => ({ ...x, hourly: Math.round((x.hourly + 1) * 100) / 100 }))}><Briefcase size={18} /> $1 more per hour</Button>
          <Button onClick={() => whatIf('4 more hours a week', (x) => ({ ...x, hoursPerWeek: Math.min(x.hoursPerWeek + 4, 60) }))}><Briefcase size={18} /> 4 more hours a week</Button>
          <Button onClick={() => whatIf('Transit pass instead of a car', (x) => ({ ...x, expenses: { ...x.expenses, transportation: 95 } }))}><Bus size={18} /> Transit pass ($95)</Button>
          <Button onClick={() => whatIf('Owning a car', (x) => ({ ...x, expenses: { ...x.expenses, transportation: 480 } }))}><Car size={18} /> Car costs ($480)</Button>
          <Button variant="ghost" onClick={() => { update((s) => ({ ...s, budget: defaultBudget() })); toast('Simulator reset to the example.'); }}><RotateCcw size={18} /> Reset simulator</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<Wallet size={20} />}>Income</CardTitle>
          <div className="grid gap-4">
            <ChoiceGroup name="incomeMode" legend="I know my" value={b.incomeMode} onChange={(v) => set({ incomeMode: v })} options={[{ value: 'hourly', label: 'Hourly pay' }, { value: 'monthly', label: 'Monthly take-home' }]} />
            {b.incomeMode === 'hourly' ? (
              <>
                <MoneyInput label="Hourly wage" value={b.hourly} max={40} step={0.25} onChange={(v) => set({ hourly: v })} />
                <MoneyInput label="Hours per week" suffix="hrs" value={b.hoursPerWeek} max={60} step={1} onChange={(v) => set({ hoursPerWeek: v })} />
                <MoneyInput label="Taxes and deductions" suffix="%" value={b.deductionPct} max={40} step={1} onChange={(v) => set({ deductionPct: Math.min(v, 60) })} hint="About 10–20% is common for this pay range. Your pay stub has the real number." />
                <p className="text-sm text-muted">Gross {usd(r.grossMonthly)} a month → take-home about <strong className="text-ink">{usd(r.takeHome)}</strong>.</p>
              </>
            ) : (
              <MoneyInput label="Monthly take-home pay" value={b.monthlyTakeHome} max={6000} step={25} onChange={(v) => set({ monthlyTakeHome: v })} />
            )}
            <MoneyInput label="Other monthly income" value={b.otherIncome} max={2000} step={25} onChange={(v) => set({ otherIncome: v })} hint="Benefits, a second job or other support." />
          </div>
        </Card>

        <Card>
          <CardTitle icon={<House size={20} />}>Housing</CardTitle>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Housing type">
            {(Object.keys(HOUSING_PRESETS) as (keyof typeof HOUSING_PRESETS)[]).map((k) => (
              <button key={k} type="button" aria-pressed={b.housingPreset === k} onClick={() => preset(k)} className={cx('min-h-[44px] rounded-xl border px-3 text-sm font-semibold', b.housingPreset === k ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface hover:bg-surface-2')}>
                {HOUSING_PRESETS[k].label} · {usd(HOUSING_PRESETS[k].rent)}
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs text-muted">Sample rents for the demo, not market data. Check local listings.</p>
          <div className="grid gap-4">
            <MoneyInput label="Current savings" value={b.currentSavings} max={5000} step={25} onChange={(v) => set({ currentSavings: v })} />
            <MoneyInput label="Security deposit" value={b.moveIn.deposit} max={3000} step={25} onChange={(v) => set({ moveIn: { ...b.moveIn, deposit: v } })} />
            <MoneyInput label="First month’s rent" value={b.moveIn.firstMonth} max={3000} step={25} onChange={(v) => set({ moveIn: { ...b.moveIn, firstMonth: v } })} />
            <MoneyInput label="Application fees" value={b.moveIn.fees} max={400} step={5} onChange={(v) => set({ moveIn: { ...b.moveIn, fees: v } })} />
            <MoneyInput label="Bed, kitchen basics, supplies" value={b.moveIn.basics} max={2000} step={25} onChange={(v) => set({ moveIn: { ...b.moveIn, basics: v } })} />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle icon={<Wallet size={20} />}>Monthly expenses</CardTitle>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {SLICE_ORDER.map((k) => (
            <MoneyInput key={k} label={EXPENSE_META[k].label} hint={EXPENSE_META[k].hint} value={b.expenses[k]} max={EXPENSE_META[k].max} step={EXPENSE_META[k].step} onChange={(v) => { setExp(k, v); if (k === 'rent') set({ housingPreset: 'custom' }); }} />
          ))}
        </div>
      </Card>

      <Notice title="Private by design">
        <span className="inline-flex items-center gap-1"><Lock size={14} /> Your budget stays on this device. It’s never shown in the staff view, and HomeBridge never scores or rates you on it.</span>
      </Notice>
    </div>
  );
}
