import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_DOCS, explainBuiltin, extractDates, fromClaude } from '../src/lib/documents';
import { nextDate } from '../src/data/community';

test('built-in reader recognizes each sample document', () => {
  const want: Record<string, string> = { lease: 'Lease or rental agreement', court: 'Court notice', paystub: 'Pay stub', utility: 'Utility bill or shutoff notice' };
  for (const d of SAMPLE_DOCS) assert.equal(explainBuiltin(d.name, d.text, 'x').docType, want[d.id], d.id);
});

test('dates are extracted in ISO form with context', () => {
  const ds = extractDates('Hearing set for 11/18/2026 at 9:00 AM.\nPay by October 28, 2026 or 2026-12-01.');
  assert.deepEqual(ds.map((d) => d.date), ['2026-11-18', '2026-12-01', '2026-10-28']);
  assert.ok(ds[0].what.includes('Hearing'));
  assert.deepEqual(extractDates('13/45/2026 and 02/30/1999'), []);
});

test('unknown text gets a safe fallback', () => {
  const r = explainBuiltin('x', 'hello there', 'id');
  assert.equal(r.docType, 'Unrecognized document');
  assert.ok(r.actions.length > 0);
});

test('Claude JSON is coerced and bad fields dropped', () => {
  const r = fromClaude('n', 'i', { docType: 'Lease', summary: 'S', keyDates: [{ date: '2026-12-01', what: 'Start' }, { date: 'soon', what: 'x' }], actions: ['A', 5], questions: 'nope' });
  assert.equal(r.keyDates.length, 1);
  assert.deepEqual(r.actions, ['A']);
  assert.deepEqual(r.questions, []);
  assert.equal(fromClaude('n', 'i', null).docType, 'Document');
});

test('community next date falls within a week', () => {
  const from = new Date('2026-10-09T12:00:00'); // Friday
  assert.equal(nextDate(5, from), '2026-10-09');
  assert.equal(nextDate(1, from), '2026-10-12');
});
