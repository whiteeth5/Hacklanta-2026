import type { AppState, Budget, CalendarEvent, Issue, PathwayItem } from '../types';

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
export const localDate = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function defaultBudget(): Budget {
  return {
    incomeMode: 'hourly', hourly: 15.5, hoursPerWeek: 36, deductionPct: 15, monthlyTakeHome: 2000, otherIncome: 0,
    expenses: { rent: 1150, utilities: 140, groceries: 320, transportation: 95, phone: 45, internet: 0, insurance: 15, personal: 60, fees: 60, debt: 0, other: 0 },
    housingPreset: 'studio',
    moveIn: { deposit: 1150, firstMonth: 1150, fees: 75, basics: 400 },
    currentSavings: 650,
  };
}

export function defaultPathway(): PathwayItem[] {
  const P = (section: PathwayItem['section'], text: string, hint?: string, done = false): PathwayItem => ({ id: uid('pw'), section, text, hint, done });
  return [
    P('budget', 'Try the Independent Living Simulator with your real income', 'Your numbers stay on this device.', true),
    P('budget', 'Pick a monthly savings target for move-in costs'),
    P('budget', 'Open a bank or credit union account', 'Many offer “second chance” accounts.'),
    P('documents', 'State ID or driver’s license', 'See ID & documents in Resources.', true),
    P('documents', 'Social Security card'),
    P('documents', 'Birth certificate'),
    P('documents', 'Two recent pay stubs or an offer letter'),
    P('documents', 'Reference letter from house staff or an employer'),
    P('housing', 'List the neighborhoods you’d like to live in', 'Think about distance to work and transit.'),
    P('housing', 'Find landlords with fair-chance screening'),
    P('housing', 'Visit or video-tour at least two places'),
    P('transition', 'Agree on a planned move-out date with staff'),
    P('transition', 'Set up utilities and internet at the new place'),
    P('transition', 'Update your address with your employer and any agencies'),
  ];
}

function seedIssues(): Issue[] {
  const a = isoDaysAgo(6);
  return [
    {
      id: 'iss-window', source: 'resident', roomId: 'mine', category: 'furniture', title: 'Bedroom window won’t latch',
      description: 'The latch slips open when it’s windy. Cold air gets in at night.', severity: 'medium', status: 'scheduled',
      evidence: [{ id: uid('ev'), kind: 'note', text: 'Latch is loose; one screw is missing.', at: a }],
      history: [
        { id: uid('h'), at: a, by: 'resident', text: 'Reported by resident', status: 'submitted' },
        { id: uid('h'), at: isoDaysAgo(5), by: 'staff', text: 'Staff acknowledged', status: 'acknowledged' },
        { id: uid('h'), at: isoDaysAgo(2), by: 'staff', text: 'Handyman scheduled for Thursday', status: 'scheduled' },
      ],
      createdAt: a, updatedAt: isoDaysAgo(2),
    },
    {
      id: 'iss-fridge', source: 'sensor', roomId: 'kitchen', category: 'appliance', title: 'Kitchen temperature spike near fridge',
      description: 'Simulated sensor alert: kitchen reached 84 °F for two hours. Fridge vent was blocked.', severity: 'low', status: 'resolved',
      evidence: [],
      history: [
        { id: uid('h'), at: isoDaysAgo(12), by: 'system', text: 'Created from a simulated sensor alert', status: 'submitted' },
        { id: uid('h'), at: isoDaysAgo(11), by: 'staff', text: 'Cleared the vent; temperature back to normal', status: 'resolved' },
      ],
      createdAt: isoDaysAgo(12), updatedAt: isoDaysAgo(11),
    },
  ];
}

export const daysFromNow = (n: number) => localDate(new Date(Date.now() + n * 86400000));

function seedCalendar(): CalendarEvent[] {
  const E = (title: string, offset: number, time: string, kind: CalendarEvent['kind'], notes = ''): CalendarEvent => ({ id: uid('cal'), title, date: daysFromNow(offset), time, kind, notes, source: 'me', remind: true });
  return [
    E('Meet with caseworker', 2, '10:00', 'appointment', 'Bring pay stubs and the move-in budget.'),
    E('Work shift', 1, '07:00', 'work'),
    E('Work shift', 3, '07:00', 'work'),
    E('Pick up Social Security card', 6, '11:30', 'deadline', 'Social Security office downtown.'),
    E('Apartment viewing', 9, '17:30', 'housing', 'Studio on the 12 bus line.'),
  ];
}

export function initialState(): AppState {
  return {
    version: 2,
    role: 'resident',
    profile: { firstName: 'Marcus', residence: 'Cedar House', room: 'Room 4', moveIn: localDate(new Date(Date.now() - 63 * 86400000)), plannedMonths: 6, programFee: 450 },
    appearance: { palette: 'forest', mode: 'system', textScale: 1, reduceMotion: false },
    events: [],
    runs: [],
    issues: seedIssues(),
    budget: defaultBudget(),
    pathway: defaultPathway(),
    shareProgress: false,
    bookmarks: [],
    welcomeDismissed: false,
    calendar: seedCalendar(),
    going: [],
    docs: [],
  };
}
