// Independent Living Simulator math. Pure and unit-tested (tests/budget.test.ts).
import type { Budget, ExpenseKey } from '../types';

export const WEEKS_PER_MONTH = 52 / 12; // 4.333…

export const EXPENSE_META: Record<ExpenseKey, { label: string; hint: string; max: number; step: number }> = {
  rent: { label: 'Rent', hint: 'Monthly rent for the place you’re picturing.', max: 2500, step: 10 },
  utilities: { label: 'Utilities', hint: 'Electricity, water, gas. Often $100–$200 for a small place.', max: 400, step: 5 },
  groceries: { label: 'Groceries', hint: 'Food you cook at home.', max: 800, step: 5 },
  transportation: { label: 'Transportation', hint: 'Transit pass, rides, or car costs.', max: 900, step: 5 },
  phone: { label: 'Phone', hint: 'Prepaid or monthly plan.', max: 150, step: 5 },
  internet: { label: 'Internet', hint: '$0 if included or you use free Wi-Fi.', max: 120, step: 5 },
  insurance: { label: 'Insurance', hint: 'Renters or health insurance.', max: 400, step: 5 },
  personal: { label: 'Personal & household', hint: 'Toiletries, laundry, cleaning supplies.', max: 300, step: 5 },
  fees: { label: 'Court, supervision or program fees', hint: 'Any fees or restitution you pay each month.', max: 500, step: 5 },
  debt: { label: 'Debt or support payments', hint: 'Loans, child support, other obligations.', max: 1000, step: 5 },
  other: { label: 'Other', hint: 'Anything else you plan for.', max: 500, step: 5 },
};

export const HOUSING_PRESETS: Record<'shared' | 'studio' | 'one_bed', { label: string; rent: number; utilities: number }> = {
  shared: { label: 'Room in a shared house', rent: 700, utilities: 60 },
  studio: { label: 'Studio apartment', rent: 1150, utilities: 140 },
  one_bed: { label: 'One-bedroom apartment', rent: 1400, utilities: 170 },
};

export interface BudgetResult {
  grossMonthly: number;
  takeHome: number;
  income: number;
  expenses: number;
  leftover: number;
  rentShare: number;
  status: 'surplus' | 'tight' | 'shortfall';
  moveInTotal: number;
  moveInGap: number;
  monthsToMoveIn: number | null;
  projection: { month: number; savings: number }[];
  breakdown: { key: ExpenseKey; label: string; amount: number }[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function computeBudget(b: Budget): BudgetResult {
  const grossMonthly = clean(b.hourly) * clean(b.hoursPerWeek) * WEEKS_PER_MONTH;
  const deduction = Math.min(Math.max(clean(b.deductionPct), 0), 60) / 100;
  const takeHome = b.incomeMode === 'hourly' ? grossMonthly * (1 - deduction) : clean(b.monthlyTakeHome);
  const income = takeHome + clean(b.otherIncome);
  const breakdown = (Object.keys(EXPENSE_META) as ExpenseKey[]).map((key) => ({ key, label: EXPENSE_META[key].label, amount: clean(b.expenses[key]) }));
  const expenses = breakdown.reduce((a, x) => a + x.amount, 0);
  const leftover = income - expenses;
  const rentShare = income > 0 ? clean(b.expenses.rent) / income : 0;
  const status: BudgetResult['status'] = leftover < 0 ? 'shortfall' : leftover < income * 0.05 ? 'tight' : 'surplus';
  const moveInTotal = clean(b.moveIn.deposit) + clean(b.moveIn.firstMonth) + clean(b.moveIn.fees) + clean(b.moveIn.basics);
  const moveInGap = Math.max(moveInTotal - clean(b.currentSavings), 0);
  const monthsToMoveIn = moveInGap === 0 ? 0 : leftover > 0 ? Math.ceil(moveInGap / leftover) : null;
  const projection = Array.from({ length: 13 }, (_, m) => ({ month: m, savings: r2(clean(b.currentSavings) + Math.max(leftover, 0) * m) }));
  return {
    grossMonthly: r2(grossMonthly), takeHome: r2(takeHome), income: r2(income), expenses: r2(expenses), leftover: r2(leftover),
    rentShare, status, moveInTotal: r2(moveInTotal), moveInGap: r2(moveInGap), monthsToMoveIn, projection, breakdown,
  };
}

export const usd = (n: number, cents = false) =>
  (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
