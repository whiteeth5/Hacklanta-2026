// Browser walkthrough of the demo priorities. Usage: node tests/e2e.mjs dist/index.html <shots-dir>
import { chromium } from 'playwright';
import path from 'node:path';

const file = 'file://' + path.resolve(process.argv[2] ?? 'dist/index.html');
const shots = process.argv[3] ?? 'shots';
const browser = await chromium.launch();
const errors = [];
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`);

async function page(viewport = { width: 1366, height: 900 }, scheme = 'light') {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g/.test(m.text())) errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(file);
  return p;
}
const nav = (p, name) => p.getByRole('navigation', { name: 'Main' }).first().getByRole('button', { name, exact: true }).click();
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

{
  const p = await page();
  check('Dashboard loads', await p.getByRole('heading', { name: 'Your home base' }).isVisible());
  await p.screenshot({ path: `${shots}/01-dashboard.png`, fullPage: true });

  // HomeTwin: select a room by keyboard
  await p.getByRole('button', { name: /^Kitchen\. Status/ }).first().focus();
  await p.keyboard.press('Enter');
  check('HomeTwin room selection', await p.getByRole('heading', { name: 'Kitchen', exact: true }).first().isVisible());
  await p.getByRole('button', { name: /^Room 3\. Private/ }).first().click();
  check('Other resident room stays private', await p.getByText('HomeBridge never shows readings or details from other residents’ rooms.').isVisible());

  // Impact engine
  await p.getByRole('button', { name: 'Simulate a water leak' }).click();
  await p.waitForTimeout(3600);
  check('Engine run shows all steps', await p.getByRole('heading', { name: 'Help that fits this situation' }).isVisible());
  check('Engine estimates impact', await p.getByText('Likely repair').isVisible());
  await p.getByLabel(/If no one fixes it for/).fill('96');
  check('Impact slider recalculates', (await p.getByText(/240 gal/).count()) > 0);
  await p.screenshot({ path: `${shots}/02-engine.png`, fullPage: true });
  await p.getByRole('button', { name: 'Open report' }).click();
  check('Sensor report created & labeled', await p.getByText('simulated sensor alert', { exact: false }).first().isVisible());

  // Staff view: update status
  await p.getByRole('group', { name: 'Switch view' }).getByRole('button', { name: 'Staff' }).click();
  await nav(p, 'Repairs');
  await p.getByRole('button', { name: /Water detected under the washing machine/ }).first().click();
  await p.getByLabel('Status', { exact: true }).selectOption('in_progress');
  await p.getByRole('button', { name: 'Save status' }).click();
  check('Staff updates status', await p.getByText('In progress', { exact: true }).first().isVisible());
  check('Staff nav hides private tools', (await p.getByRole('navigation', { name: 'Main' }).first().getByRole('button', { name: 'Living Simulator' }).count()) === 0);
  await nav(p, 'Dashboard');
  check('Staff dashboard', await p.getByRole('heading', { name: 'House overview' }).isVisible());
  await p.screenshot({ path: `${shots}/03-staff.png`, fullPage: true });
  await p.getByRole('group', { name: 'Switch view' }).getByRole('button', { name: 'Resident' }).click();

  // Simulator live update
  await nav(p, 'Living Simulator');
  const before = await p.locator('[aria-live="polite"]').filter({ hasText: '$' }).first().innerText();
  await p.getByRole('button', { name: /Share with a roommate/ }).click();
  const after = await p.locator('[aria-live="polite"]').filter({ hasText: '$' }).first().innerText();
  check('Simulator updates live', before !== after, `${before} → ${after}`);
  await p.getByLabel('Hourly wage', { exact: true }).fill('12');
  const after2 = await p.locator('[aria-live="polite"]').filter({ hasText: '$' }).first().innerText();
  check('Income edit updates budget', after2 !== after, `${after} → ${after2}`);
  await p.screenshot({ path: `${shots}/04-simulator.png`, fullPage: true });

  // Maintenance resident report
  await nav(p, 'Repairs');
  await p.getByRole('button', { name: 'New report' }).click();
  await p.getByLabel('Short title').fill('Shower drain is slow');
  await p.getByRole('button', { name: 'Submit report' }).click();
  check('Resident report created', await p.getByRole('heading', { name: 'Shower drain is slow' }).isVisible());
  await p.getByLabel('Note').fill('Water pools for 10 minutes.');
  await p.getByRole('button', { name: 'Add note' }).click();
  check('Evidence note added', (await p.getByText('Water pools for 10 minutes.').count()) > 0);

  // Resources
  await nav(p, 'Resources');
  await p.getByLabel('Search resources').fill('deposit');
  await p.getByRole('button', { name: 'Bookmark Move-In Ready Deposit Fund' }).click();
  await p.getByLabel('Search resources').fill('');
  await p.getByRole('button', { name: /^Bookmarked \(/ }).click();
  check('Search + bookmark', await p.getByRole('heading', { name: 'Move-In Ready Deposit Fund' }).isVisible());

  // Pathway
  await nav(p, 'Pathway');
  await p.getByRole('checkbox', { name: 'Social Security card' }).click();
  check('Pathway check off', (await p.getByRole('checkbox', { name: 'Social Security card' }).getAttribute('aria-checked')) === 'true');
  await p.getByLabel('Add your own step to Documents').fill('Get a library card');
  await p.getByRole('button', { name: 'Add step to Documents' }).click();
  check('Pathway custom step', await p.getByText('Get a library card').isVisible());

  // Community -> calendar
  await nav(p, 'Community');
  await p.getByRole('button', { name: 'Free food', exact: true }).click();
  await p.getByRole('article').filter({ hasText: 'Community dinner' }).getByRole('button', { name: 'Add to calendar' }).click();
  check('Community event added to calendar', await p.getByRole('article').filter({ hasText: 'Community dinner' }).getByRole('button', { name: 'On your calendar' }).isVisible());
  await p.screenshot({ path: `${shots}/06-community.png`, fullPage: true });

  // Calendar: add a date
  await nav(p, 'Calendar');
  await p.getByRole('button', { name: 'Add a date' }).click();
  await p.getByLabel('What is it?').fill('Court date');
  await p.getByLabel('Type').selectOption('court');
  await p.getByLabel('Date', { exact: true }).fill(new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10));
  await p.getByRole('button', { name: 'Save' }).click();
  check('Calendar date saved', (await p.getByText('Court date').count()) > 0);
  check('Community event on calendar', (await p.getByText('Community dinner').count()) > 0);
  await p.screenshot({ path: `${shots}/07-calendar.png`, fullPage: true });

  // Document helper (built-in reader offline)
  await nav(p, 'Document Helper');
  await p.getByRole('button', { name: 'Court notice', exact: true }).click();
  await p.getByRole('button', { name: 'Explain this document' }).click();
  check('Document explained', await p.getByText('Court notice', { exact: true }).first().isVisible() && await p.getByText('Dates that matter', { exact: true }).isVisible());
  await p.getByRole('button', { name: 'Add to calendar' }).first().click();
  check('Document date to calendar', await p.getByRole('button', { name: 'Added' }).first().isVisible());
  await p.getByRole('button', { name: 'Save explanation' }).click();
  check('Explanation saved', await p.getByRole('heading', { name: 'Saved explanations' }).isVisible());
  await p.screenshot({ path: `${shots}/08-documents.png`, fullPage: true });

  // Palettes
  await nav(p, 'Settings');
  for (const name of ['Ocean Blue', 'Lavender', 'Sunset', 'High Contrast', 'Warm Neutral']) {
    await p.getByRole('radio', { name: new RegExp(name) }).click();
  }
  const pal = await p.evaluate(() => document.documentElement.dataset.palette + ' ' + getComputedStyle(document.documentElement).getPropertyValue('--primary'));
  check('Palette applies', pal.startsWith('warm') && pal.includes('#7a4b2a'), pal);
  await p.getByText('Dark', { exact: true }).click();
  check('Dark mode applies', await p.evaluate(() => document.documentElement.dataset.mode === 'dark'));
  await p.screenshot({ path: `${shots}/05-settings-dark-warm.png`, fullPage: true });
  await p.reload();
  check('Palette persists after reload', await p.evaluate(() => document.documentElement.dataset.palette === 'warm'));

  await nav(p, 'Settings');
  await p.getByRole('button', { name: 'Reset demo' }).click();
  await p.getByRole('button', { name: 'Yes, reset' }).click();
  check('Reset demo', await p.evaluate(() => document.documentElement.dataset.palette === 'forest'));
  await p.context().close();
}

for (const [scheme, pal] of [['light', 'Ocean Blue'], ['dark', 'Sunset']]) {
  const p = await page({ width: 390, height: 844 }, scheme);
  check(`Mobile ${scheme} no horizontal scroll (dashboard)`, await noHScroll(p));
  await p.screenshot({ path: `${shots}/10-mobile-${scheme}.png`, fullPage: true });
  await p.getByRole('button', { name: 'More pages' }).click();
  await p.getByRole('dialog', { name: 'More pages' }).getByRole('button', { name: 'Settings' }).click();
  await p.getByRole('radio', { name: new RegExp(pal) }).click();
  for (const v of ['Twin', 'Engine', 'Budget']) {
    await p.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: { Twin: 'HomeTwin', Engine: 'Impact Engine', Budget: 'Living Simulator' }[v], exact: true }).click();
    check(`Mobile ${scheme} ${v} no horizontal scroll`, await noHScroll(p));
  }
  await p.screenshot({ path: `${shots}/11-mobile-sim-${scheme}.png`, fullPage: true });
  await p.context().close();
}

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
console.log(errors.length ? `Console errors:\n${[...new Set(errors)].join('\n')}` : 'No console errors');
