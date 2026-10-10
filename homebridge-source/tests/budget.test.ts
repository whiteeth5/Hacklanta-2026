import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBudget } from '../src/lib/budget';
import { defaultBudget } from '../src/lib/defaults';
import { EVENTS, readings, roomLevel, waterCost, canSeeRoom, ROOMS } from '../src/lib/residence';

const close = (a: number, b: number, eps = 0.6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('hourly income converts to monthly take-home', () => {
  const r = computeBudget({ ...defaultBudget(), hourly: 15.5, hoursPerWeek: 36, deductionPct: 15, otherIncome: 0 });
  // 15.5 × 36 × 52/12 = 2418 gross; × 0.85 = 2055.3
  close(r.grossMonthly, 2418);
  close(r.takeHome, 2055.3);
});

test('leftover, rent share and status update with inputs', () => {
  const b = defaultBudget();
  const r = computeBudget(b);
  close(r.leftover, r.income - r.expenses, 0.01);
  assert.equal(r.status === 'surplus' || r.status === 'tight', true);
  const short = computeBudget({ ...b, expenses: { ...b.expenses, rent: 2400 } });
  assert.equal(short.status, 'shortfall');
  assert.equal(short.monthsToMoveIn, null);
});

test('months to move-in uses the gap over monthly leftover', () => {
  const b = { ...defaultBudget(), incomeMode: 'monthly' as const, monthlyTakeHome: 2000, otherIncome: 0, currentSavings: 500 };
  b.expenses = { rent: 700, utilities: 60, groceries: 300, transportation: 95, phone: 45, internet: 0, insurance: 0, personal: 50, fees: 50, debt: 0, other: 0 };
  b.moveIn = { deposit: 700, firstMonth: 700, fees: 50, basics: 300 };
  const r = computeBudget(b);
  close(r.leftover, 700, 0.01);
  assert.equal(r.moveInGap, 1250);
  assert.equal(r.monthsToMoveIn, 2);
  assert.equal(r.projection[12].savings, 500 + 700 * 12);
});

test('bad inputs are treated as zero, never NaN', () => {
  const r = computeBudget({ ...defaultBudget(), hourly: NaN, hoursPerWeek: -5, otherIncome: Infinity });
  assert.equal(r.income, 0);
  assert.equal(r.rentShare, 0);
});

test('leak event changes readings and room level; water cost math', () => {
  const rs = readings([{ id: 'e', kind: 'leak_laundry', at: '' }]);
  assert.equal(roomLevel('laundry', rs), 'alert');
  assert.equal(roomLevel('kitchen', rs), 'normal');
  const w = waterCost(EVENTS.leak_laundry, 24);
  assert.equal(w.gallons, 60);
  close(w.cost, 0.72, 0.001);
});

test('privacy: nobody sees another resident’s room; staff never see the resident’s own room', () => {
  const room3 = ROOMS.find((r) => r.id === 'room3')!;
  const mine = ROOMS.find((r) => r.id === 'mine')!;
  assert.equal(canSeeRoom(room3, 'resident'), false);
  assert.equal(canSeeRoom(room3, 'staff'), false);
  assert.equal(canSeeRoom(mine, 'staff'), false);
  assert.equal(canSeeRoom(mine, 'resident'), true);
});
