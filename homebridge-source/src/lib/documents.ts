// Document Helper. Two engines:
//  - "claude": on claude.ai, the page asks Claude (sample capability) with the prompt below.
//  - "builtin": everywhere else, a keyword classifier with plain-language explanations of common
//    reentry documents, plus date extraction. Unit-tested in tests/documents.test.ts.
import type { DocExplanation, KeyDate } from '../types';

export const SAMPLE_DOCS: { id: string; name: string; text: string }[] = [
  {
    id: 'lease',
    name: 'Apartment lease (sample)',
    text: `RESIDENTIAL LEASE AGREEMENT
This Lease is made between Example Properties LLC ("Landlord") and Marcus Reed ("Tenant") for the premises at Unit 2B.
Term: The lease begins on 12/01/2026 and ends on 11/30/2027.
Rent: Tenant shall pay $875 per month, due on the 1st of each month. A late fee of $50 applies if rent is not received by the 5th.
Security Deposit: $875, refundable within 30 days of move-out, less deductions for damage beyond normal wear and tear.
Utilities: Tenant is responsible for electricity and internet. Water and trash are included.
Notice: Tenant must give 60 days written notice before moving out. Guests may not stay more than 14 consecutive days.`,
  },
  {
    id: 'court',
    name: 'Court notice (sample)',
    text: `NOTICE OF HEARING
Sample County Court (demo document) — Case No. 00-DEMO-0001
You are hereby notified that a hearing on the Motion to Modify Payment Schedule is set for 11/18/2026 at 9:00 AM in Courtroom 4C.
Failure to appear may result in the motion being decided without your input.
Bring proof of income and any documents supporting your request. Contact the Clerk of Court with questions.`,
  },
  {
    id: 'paystub',
    name: 'Pay stub (sample)',
    text: `EARNINGS STATEMENT
Employee: Marcus Reed   Pay period: 10/01/2026 - 10/14/2026   Pay date: 10/17/2026
Regular hours: 72.00 @ $15.50 = $1,116.00
Gross pay: $1,116.00
Federal income tax: $71.40   Social Security: $69.19   Medicare: $16.18   State tax: $41.85
Net pay: $917.38
YTD gross: $4,464.00`,
  },
  {
    id: 'utility',
    name: 'Utility disconnection notice (sample)',
    text: `FINAL NOTICE — PAST DUE BALANCE
Account 4471-209. Your balance of $186.42 is past due.
To avoid disconnection of electric service, payment must be received by 10/28/2026.
If you are unable to pay, contact us about payment arrangements or energy assistance programs before the due date.
A reconnection fee of $35 may apply if service is disconnected.`,
  },
];

const KINDS: { type: string; words: RegExp; purpose: string; summary: string; actions: string[]; questions: string[]; caution: string }[] = [
  {
    type: 'Lease or rental agreement', words: /\blease|landlord|tenant|security deposit|premises|rent shall/i,
    purpose: 'A lease is the contract for renting a home. It sets your rent, how long you can live there, and the rules for both you and the landlord.',
    summary: 'This looks like a rental agreement that sets rent, the lease term, a deposit and house rules.',
    actions: ['Check the rent amount, due date and late fee match what you were told.', 'Note which utilities you pay; add them to the Living Simulator.', 'Keep a copy and take photos of the unit before you move in.'],
    questions: ['Is the deposit refundable, and what can be deducted?', 'How much notice do I need to give before moving out?', 'Are there rules about guests that affect me?'],
    caution: 'Read it fully before signing. A tenant-rights hotline or legal aid clinic can review it for free.',
  },
  {
    type: 'Court notice', words: /\bcourt|hearing|case no|motion|clerk of court|failure to appear|docket/i,
    purpose: 'A court notice tells you about a hearing or deadline in a case. Missing it can have serious consequences.',
    summary: 'This appears to be a notice of a court date or deadline.',
    actions: ['Put the hearing date and time on your calendar now.', 'Gather the documents it asks you to bring.', 'Arrange transportation and time off work early.'],
    questions: ['Do I need a lawyer for this hearing?', 'Can the date be moved if I have work?', 'What happens if I can’t attend?'],
    caution: 'This is not legal advice. Contact the court clerk or a legal aid clinic if anything is unclear.',
  },
  {
    type: 'Pay stub', words: /\bgross pay|net pay|earnings statement|pay period|ytd|withholding/i,
    purpose: 'A pay stub shows what you earned, what was taken out for taxes, and what you actually received. Landlords often ask for two recent ones.',
    summary: 'This is a record of one paycheck: hours, gross pay, deductions and take-home pay.',
    actions: ['Use the net pay in the Living Simulator to see your real budget.', 'Save it for housing applications (landlords often ask for two recent stubs).', 'Check the hours and rate are correct.'],
    questions: ['Are my withholdings right for my situation?', 'Will I get a W-2 at the end of the year?'],
    caution: 'Pay stubs contain personal information. Share them only with people who need them.',
  },
  {
    type: 'Utility bill or shutoff notice', words: /\bdisconnect|past due|utility|electric service|final notice|kwh|account number|reconnection/i,
    purpose: 'A utility notice tells you how much you owe and, if it’s a final notice, when service could be shut off.',
    summary: 'This looks like a past-due utility notice with a payment deadline.',
    actions: ['Add the payment deadline to your calendar.', 'Call the utility before the deadline to ask about a payment plan.', 'Look at Utility assistance in Resources (for example LIHEAP).'],
    questions: ['Can I set up a payment arrangement?', 'Is there a medical or weather protection that delays shutoff?'],
    caution: 'Contact them before the deadline; options usually shrink after service is cut.',
  },
  {
    type: 'Benefits letter', words: /\bbenefit|eligib|snap|medicaid|approved|denied|recertif|case worker|caseworker/i,
    purpose: 'A benefits letter tells you whether you were approved, for how much, and when you must renew or respond.',
    summary: 'This appears to be a letter about public benefits.',
    actions: ['Note any renewal or response deadline.', 'Keep it with your important documents.', 'If you disagree with a decision, look for appeal instructions and the deadline.'],
    questions: ['When do I need to recertify?', 'What should I report if my income changes?'],
    caution: 'Deadlines in benefits letters are strict. Ask the agency or a benefits clinic if unsure.',
  },
  {
    type: 'House rules or program agreement', words: /\bcurfew|house rules|resident agreement|program fee|chores|transitional|halfway/i,
    purpose: 'A program agreement explains the rules, fees and expectations for living in the house.',
    summary: 'This looks like a residence or program agreement.',
    actions: ['Note the program fee and when it’s due.', 'Check what happens if a rule is broken and how disputes are handled.', 'Ask staff to explain anything unclear.'],
    questions: ['How are repairs reported and handled?', 'What notice is needed before move-out?'],
    caution: 'You’re entitled to understand what you sign. Ask for time to read it.',
  },
  {
    type: 'Identity document or application', words: /\bbirth certificate|social security|state id|driver.?s license|identification card|vital records/i,
    purpose: 'Identity documents prove who you are. You’ll need them for jobs, leases, banking and benefits.',
    summary: 'This relates to an ID or identity document.',
    actions: ['Store the original somewhere safe; carry a copy when possible.', 'Check off the matching item on your Pathway.', 'See ID & documents in Resources for fee help.'],
    questions: ['How long until the new document arrives?', 'Is there a fee waiver?'],
    caution: 'Never share your Social Security number unless you know why it’s needed.',
  },
];

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** Pull dates like 11/18/2026, 2026-11-18 or November 18, 2026 with a few words of context. */
export function extractDates(text: string): KeyDate[] {
  const out: KeyDate[] = [];
  const push = (y: number, m: number, d: number, idx: number) => {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (out.some((o) => o.date === iso)) return;
    const start = text.lastIndexOf('\n', idx) + 1;
    const end = text.indexOf('\n', idx);
    const line = text.slice(start, end === -1 ? undefined : end).replace(/\s+/g, ' ').trim();
    out.push({ date: iso, what: line.length > 110 ? line.slice(0, 107) + '…' : line });
  };
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) push(+m[3], +m[1], +m[2], m.index ?? 0);
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) push(+m[1], +m[2], +m[3], m.index ?? 0);
  for (const m of text.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi)) push(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2], m.index ?? 0);
  return out.slice(0, 8);
}

export function explainBuiltin(name: string, text: string, id: string): DocExplanation {
  const scored = KINDS.map((k) => ({ k, n: (text.match(new RegExp(k.words.source, 'gi')) ?? []).length })).sort((a, b) => b.n - a.n);
  const best = scored[0].n > 0 ? scored[0].k : null;
  return {
    id, name, at: new Date().toISOString(), engine: 'builtin',
    docType: best?.type ?? 'Unrecognized document',
    summary: best?.summary ?? 'HomeBridge couldn’t tell what kind of document this is from its wording.',
    purpose: best?.purpose ?? 'Try pasting more of the text, or ask staff, a caseworker or a legal aid clinic to look at it with you.',
    keyDates: extractDates(text),
    actions: best?.actions ?? ['Look for a title, a sender and any dates or amounts.', 'Keep it with your important papers until you know what it is.'],
    questions: best?.questions ?? ['Who sent this, and do I need to respond?'],
    caution: best?.caution ?? 'If it mentions a deadline, a court or money owed, get help soon.',
  };
}

export function claudePrompt(text: string) {
  return `You help a resident of transitional housing (someone recently home from incarceration) understand a document they received. Use plain, respectful language at about a 6th-grade reading level. Do not give legal advice; suggest who could help when it matters. Never invent facts that are not in the document.

Reply with only one JSON object with these keys:
{"docType": string (e.g. "Lease", "Court notice"), "summary": string (2 sentences, what this document says), "purpose": string (what this kind of document is for and why it matters), "keyDates": [{"date": "YYYY-MM-DD", "what": string}] (only dates stated in the document), "actions": [string] (2-4 concrete next steps), "questions": [string] (2-3 questions worth asking someone), "caution": string (one sentence; empty if none)}

Document:
"""
${text.slice(0, 12000)}
"""`;
}

/** Coerce whatever JSON Claude returned into a safe explanation. */
export function fromClaude(name: string, id: string, raw: unknown): DocExplanation {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, d = '') => (typeof v === 'string' ? v.slice(0, 600) : d);
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 5).map((x) => (x as string).slice(0, 300)) : []);
  const dates = Array.isArray(o.keyDates)
    ? (o.keyDates as unknown[]).flatMap((d) => {
        const x = d as Record<string, unknown>;
        return typeof x?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? [{ date: x.date, what: str(x.what, 'Date in document').slice(0, 140) }] : [];
      }).slice(0, 8)
    : [];
  return {
    id, name, at: new Date().toISOString(), engine: 'claude',
    docType: str(o.docType, 'Document'), summary: str(o.summary), purpose: str(o.purpose),
    keyDates: dates, actions: arr(o.actions), questions: arr(o.questions), caution: str(o.caution),
  };
}
