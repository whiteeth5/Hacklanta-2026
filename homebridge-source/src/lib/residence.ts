// The residence floor plan, its simulated sensors, and the simulated events the Impact Engine reacts to.
import type { ActiveEvent, EventKind, IssueCategory, Role, Room, SensorKind } from '../types';

/** Floor plan in a 100 × 64 unit grid. */
export const ROOMS: Room[] = [
  { id: 'mine', name: 'Your / room', scope: 'mine', x: 0, y: 0, w: 28, h: 30, sensors: ['temperature', 'humidity'], icon: 'bed' },
  { id: 'room3', name: 'Room 3', scope: 'private', x: 28, y: 0, w: 26, h: 30, sensors: [], icon: 'bed' },
  { id: 'bath', name: 'Shared / bathroom', scope: 'shared', x: 54, y: 0, w: 22, h: 30, sensors: ['humidity', 'leak'], icon: 'bath' },
  { id: 'laundry', name: 'Laundry', scope: 'shared', x: 76, y: 0, w: 24, h: 30, sensors: ['leak', 'humidity'], icon: 'laundry' },
  { id: 'living', name: 'Common / room', scope: 'shared', x: 0, y: 30, w: 40, h: 34, sensors: ['temperature', 'air'], icon: 'sofa' },
  { id: 'kitchen', name: 'Kitchen', scope: 'shared', x: 40, y: 30, w: 36, h: 34, sensors: ['air', 'leak', 'temperature'], icon: 'kitchen' },
  { id: 'office', name: 'Staff / office', scope: 'staff', x: 76, y: 30, w: 24, h: 34, sensors: ['temperature'], icon: 'office' },
];

export const roomById = (id: string) => { const r = ROOMS.find((x) => x.id === id)!; return { ...r, name: r.name.replace(' / ', ' ') }; };
export const roomName = (r: Room) => r.name.replace(' / ', ' ');

/** What each role may see in detail. Other residents' rooms never show readings to anyone in this app. */
export function canSeeRoom(room: Room, role: Role) {
  if (room.scope === 'private') return false;
  if (room.scope === 'mine') return role === 'resident';
  if (room.scope === 'staff') return role === 'staff';
  return true;
}

export const SENSOR_LABEL: Record<SensorKind, { name: string; unit: string; detects: string; notDetect: string }> = {
  temperature: { name: 'Temperature', unit: '°F', detects: 'Air temperature near the sensor.', notDetect: 'Not a fire or smoke detector.' },
  humidity: { name: 'Humidity', unit: '% RH', detects: 'Moisture in the air.', notDetect: 'Can’t see mold or hidden leaks. High humidity is a clue, not a diagnosis.' },
  air: { name: 'Air quality (PM2.5)', unit: 'µg/m³', detects: 'Fine particles, such as cooking smoke.', notDetect: 'Does not measure carbon monoxide or gas.' },
  leak: { name: 'Leak sensor', unit: 'wet / dry', detects: 'Water touching the sensor pad on the floor.', notDetect: 'Only senses water at its own spot.' },
};

export interface Reading {
  roomId: string;
  kind: SensorKind;
  value: number | string;
  unit: string;
  level: 'normal' | 'watch' | 'alert' | 'offline';
  at: string;
}

const has = (events: ActiveEvent[], k: EventKind) => events.some((e) => e.kind === k);

/** Deterministic simulated readings (stable across reloads within an hour). */
export function readings(events: ActiveEvent[], now = new Date()): Reading[] {
  const at = now.toISOString();
  const seed = now.getHours();
  const jitter = (n: number) => ((seed * 7 + n * 13) % 5) / 2;
  const out: Reading[] = [];
  for (const room of ROOMS) {
    room.sensors.forEach((kind, i) => {
      const unit = SENSOR_LABEL[kind].unit;
      if (has(events, 'sensor_offline') && room.id === 'living' && kind === 'air') {
        out.push({ roomId: room.id, kind, value: '—', unit, level: 'offline', at });
        return;
      }
      if (kind === 'temperature') {
        const v = room.id === 'mine' && has(events, 'heat_mine') ? 88 : Math.round(70 + jitter(i + room.x));
        out.push({ roomId: room.id, kind, value: v, unit, level: v >= 85 ? 'alert' : v >= 80 ? 'watch' : 'normal', at });
      } else if (kind === 'humidity') {
        let v = Math.round(42 + jitter(i + room.y) * 2);
        if (room.id === 'bath' && has(events, 'humidity_bath')) v = 78;
        if (room.id === 'laundry' && has(events, 'leak_laundry')) v = 66;
        if (room.id === 'bath' && has(events, 'leak_bath')) v = 64;
        out.push({ roomId: room.id, kind, value: v, unit, level: v >= 70 ? 'alert' : v >= 60 ? 'watch' : 'normal', at });
      } else if (kind === 'air') {
        const v = room.id === 'kitchen' && has(events, 'air_kitchen') ? 61 : Math.round(6 + jitter(i) * 2);
        out.push({ roomId: room.id, kind, value: v, unit, level: v > 35 ? 'alert' : v > 12 ? 'watch' : 'normal', at });
      } else {
        const wet = (room.id === 'laundry' && has(events, 'leak_laundry')) || (room.id === 'bath' && has(events, 'leak_bath'));
        out.push({ roomId: room.id, kind, value: wet ? 'Wet' : 'Dry', unit, level: wet ? 'alert' : 'normal', at });
      }
    });
  }
  return out;
}

export function roomLevel(roomId: string, rs: Reading[]): Reading['level'] {
  const r = rs.filter((x) => x.roomId === roomId);
  if (r.some((x) => x.level === 'alert')) return 'alert';
  if (r.some((x) => x.level === 'offline')) return 'offline';
  if (r.some((x) => x.level === 'watch')) return 'watch';
  return 'normal';
}

// ---------- Impact model ----------
export interface CostLine {
  label: string;
  low: number;
  high: number;
  who: string;
}

export interface EventDef {
  kind: EventKind;
  roomId: string;
  button: string;
  title: string;
  severity: 'urgent' | 'warning' | 'info';
  category: IssueCategory;
  what: string;
  notMeaning: string;
  residentSteps: string[];
  costs: CostLine[];
  assumptions: string[];
  residentImpact: string;
  resourceTags: string[];
  /** Water lost per hour while unaddressed (gallons), used to compute running cost. */
  flowGalPerHour?: number;
}

export const WATER_RATE_PER_GAL = 0.012;

export const EVENTS: Record<EventKind, EventDef> = {
  leak_laundry: {
    kind: 'leak_laundry', roomId: 'laundry', button: 'Simulate a water leak in the laundry', title: 'Water detected under the washing machine',
    severity: 'urgent', category: 'plumbing',
    what: 'The leak sensor pad behind the washer is wet, and humidity in the laundry room is rising.',
    notMeaning: 'The sensor can’t tell where the water comes from or how much is behind the walls. A person needs to look.',
    residentSteps: ['If it’s safe, close the washer’s water valves (behind the machine) and stop any running load.', 'Keep away from outlets and cords if water is near them.', 'Move your belongings off the floor if any are nearby.', 'Staff have been notified. Add a photo or note to the report if you can.'],
    flowGalPerHour: 2.5,
    costs: [
      { label: 'Plumber visit if fixed within 24 hours', low: 150, high: 400, who: 'Building operator' },
      { label: 'Floor and drywall repair if left 3+ days', low: 1000, high: 3500, who: 'Building operator' },
      { label: 'Mold cleanup if left a week or more', low: 1500, high: 6000, who: 'Building operator' },
    ],
    assumptions: ['Leak rate of about 2.5 gallons an hour, from the simulated meter change.', 'Water priced at $0.012 a gallon (about $12 per 1,000 gallons).', 'Repair ranges are illustrative industry ballparks, not quotes.'],
    residentImpact: 'You are not expected to pay for building plumbing. Check your house agreement; residents are usually responsible only for damage they cause. Your main risk is belongings left on a wet floor.',
    resourceTags: ['legal', 'id_documents'],
  },
  leak_bath: {
    kind: 'leak_bath', roomId: 'bath', button: 'Simulate a leak in the shared bathroom', title: 'Water detected beside the toilet',
    severity: 'urgent', category: 'plumbing',
    what: 'The leak pad next to the toilet is wet.',
    notMeaning: 'It may be a loose supply line, an overflow or a spill. The sensor can’t tell which.',
    residentSteps: ['If water is still running, turn the valve behind the toilet clockwise to close it.', 'Put a towel down and keep the door open for airflow.', 'Staff have been notified.'],
    flowGalPerHour: 1.5,
    costs: [
      { label: 'Supply line or wax ring fix', low: 120, high: 350, who: 'Building operator' },
      { label: 'Subfloor repair if water soaks in', low: 800, high: 2500, who: 'Building operator' },
    ],
    assumptions: ['About 1.5 gallons an hour.', 'Water at $0.012 a gallon.', 'Illustrative ranges, not quotes.'],
    residentImpact: 'No cost expected for you. Reporting quickly is what keeps repairs small.',
    resourceTags: ['legal'],
  },
  humidity_bath: {
    kind: 'humidity_bath', roomId: 'bath', button: 'Simulate high humidity in the bathroom', title: 'Bathroom humidity has stayed above 70%',
    severity: 'warning', category: 'moisture',
    what: 'Humidity in the shared bathroom has been above 70% for several hours.',
    notMeaning: 'It doesn’t mean there is mold. It’s an early warning that moisture isn’t clearing.',
    residentSteps: ['Run the exhaust fan during and 20 minutes after showers.', 'Leave the door open when the room is free.', 'If the fan doesn’t work, add that to the report.'],
    costs: [
      { label: 'Exhaust fan repair or replacement', low: 150, high: 350, who: 'Building operator' },
      { label: 'Mold cleanup if moisture continues for weeks', low: 500, high: 2500, who: 'Building operator' },
    ],
    assumptions: ['Illustrative ranges, not quotes.'],
    residentImpact: 'No cost expected for you.',
    resourceTags: ['health'],
  },
  heat_mine: {
    kind: 'heat_mine', roomId: 'mine', button: 'Simulate high heat in your room', title: 'Your room is 88 °F',
    severity: 'urgent', category: 'heating_cooling',
    what: 'The temperature in your room has been above 85 °F.',
    notMeaning: 'The sensor measures air temperature only. It does not detect fire.',
    residentSteps: ['Move to the common room if it’s cooler, and drink water.', 'Use a fan if you have one.', 'If you feel dizzy, confused or very unwell, call 911.', 'Share this alert with staff if you want them to check the cooling.'],
    costs: [
      { label: 'Window AC or vent repair', low: 200, high: 600, who: 'Building operator' },
      { label: 'Box fan (optional, personal)', low: 25, high: 40, who: 'You, if you choose' },
    ],
    assumptions: ['Illustrative ranges, not quotes.'],
    residentImpact: 'This alert is private to you. Staff only see it if you choose to share it.',
    resourceTags: ['health'],
  },
  air_kitchen: {
    kind: 'air_kitchen', roomId: 'kitchen', button: 'Simulate smoky air in the kitchen', title: 'Fine particles are high in the kitchen',
    severity: 'warning', category: 'safety',
    what: 'PM2.5 jumped to about 61 µg/m³, which usually means cooking smoke.',
    notMeaning: 'This monitor does not detect carbon monoxide or gas leaks.',
    residentSteps: ['Turn on the range hood and open a window.', 'If you smell gas, leave and call 911 from outside.'],
    costs: [{ label: 'Range hood filter replacement', low: 20, high: 80, who: 'Building operator' }],
    assumptions: ['Illustrative ranges, not quotes.'],
    residentImpact: 'No cost expected for you.',
    resourceTags: [],
  },
  sensor_offline: {
    kind: 'sensor_offline', roomId: 'living', button: 'Simulate a sensor going offline', title: 'The common room air sensor stopped reporting',
    severity: 'info', category: 'other',
    what: 'No data received for 30 minutes.',
    notMeaning: 'It doesn’t mean anything is wrong with the air.',
    residentSteps: ['Nothing for you to do. Staff will check the batteries.'],
    costs: [{ label: 'Replacement batteries', low: 5, high: 15, who: 'Building operator' }],
    assumptions: [],
    residentImpact: 'No cost expected for you.',
    resourceTags: [],
  },
};

/** Water wasted and its cost if a leak runs for `hours`. */
export function waterCost(def: EventDef, hours: number) {
  const gallons = (def.flowGalPerHour ?? 0) * hours;
  return { gallons: Math.round(gallons), cost: Math.round(gallons * WATER_RATE_PER_GAL * 100) / 100 };
}
