// Demo community calendar: free food, activities, classes and support near the residence.
// All entries are invented for the prototype (labeled "Demo listing" in the app).
import { localDate } from '../lib/defaults';

export type CommunityCategory = 'food' | 'activity' | 'learning' | 'support' | 'jobs';

export interface CommunityEvent {
  id: string;
  title: string;
  category: CommunityCategory;
  /** Next occurrence as a weekday (0 = Sunday) so dates always land in the coming week. */
  weekday: number;
  start: string;
  end: string;
  place: string;
  cost: string;
  summary: string;
  recurring: string;
  goodToKnow: string;
}

export const COMMUNITY_LABEL: Record<CommunityCategory, string> = {
  food: 'Free food',
  activity: 'Activities',
  learning: 'Classes',
  support: 'Support groups',
  jobs: 'Jobs & skills',
};

export const COMMUNITY_EVENTS: CommunityEvent[] = [
  { id: 'c-meal', title: 'Community dinner', category: 'food', weekday: 3, start: '17:30', end: '19:00', place: 'Grace Fellowship Hall · 0.6 mi', cost: 'Free', summary: 'Hot meal, no sign-up. Take-home plates if there’s extra.', recurring: 'Every Wednesday', goodToKnow: 'Everyone welcome; no ID or questions asked.' },
  { id: 'c-pantry', title: 'Fresh produce pop-up', category: 'food', weekday: 6, start: '09:00', end: '11:30', place: 'Rec center parking lot · 1.1 mi', cost: 'Free', summary: 'Bags of fruit and vegetables while supplies last.', recurring: 'Every Saturday', goodToKnow: 'Bring a bag. Arrive early for the best selection.' },
  { id: 'c-breakfast', title: 'Saturday breakfast & coffee', category: 'food', weekday: 6, start: '08:00', end: '09:30', place: 'Neighborhood library annex · 0.4 mi', cost: 'Free', summary: 'Pancakes, coffee and a relaxed place to start the weekend.', recurring: 'Second and fourth Saturdays', goodToKnow: 'Volunteers can share local job leads.' },
  { id: 'c-hoops', title: 'Pickup basketball league', category: 'activity', weekday: 2, start: '18:30', end: '20:00', place: 'Westside Rec gym · 1.3 mi', cost: 'Free', summary: 'Friendly adult games, all skill levels.', recurring: 'Tuesdays and Thursdays', goodToKnow: 'Sign the waiver at the front desk the first time.' },
  { id: 'c-garden', title: 'Community garden workday', category: 'activity', weekday: 0, start: '10:00', end: '12:00', place: 'Oak Street garden · 0.8 mi', cost: 'Free', summary: 'Plant, weed and take home some of what you grow.', recurring: 'Sundays', goodToKnow: 'Gloves and tools provided.' },
  { id: 'c-music', title: 'Open mic night', category: 'activity', weekday: 5, start: '19:00', end: '21:00', place: 'Corner Café · 0.5 mi', cost: 'Free (food for purchase)', summary: 'Music, poetry and spoken word. Perform or just listen.', recurring: 'First Friday of the month', goodToKnow: 'Sign-up sheet opens at 6:30pm.' },
  { id: 'c-computer', title: 'Computer basics & email class', category: 'learning', weekday: 1, start: '14:00', end: '15:30', place: 'Central library, room B · 1.5 mi', cost: 'Free', summary: 'Set up email, use a phone for job apps, stay safe online.', recurring: 'Mondays', goodToKnow: 'Laptops provided. Bring your ID for a library card.' },
  { id: 'c-money', title: 'Money basics workshop', category: 'learning', weekday: 4, start: '18:00', end: '19:30', place: 'Credit union branch · 0.9 mi', cost: 'Free', summary: 'Budgeting, credit and opening a second-chance bank account.', recurring: 'Monthly', goodToKnow: 'Pairs well with the Living Simulator.' },
  { id: 'c-peer', title: 'Peer reentry support circle', category: 'support', weekday: 4, start: '19:00', end: '20:30', place: 'Community center, room 2 · 0.7 mi', cost: 'Free', summary: 'Talk with people who’ve been through reentry. Confidential.', recurring: 'Thursdays', goodToKnow: 'Drop in anytime. Nothing is recorded.' },
  { id: 'c-recovery', title: 'Recovery meeting', category: 'support', weekday: 1, start: '12:00', end: '13:00', place: 'St. Mark’s basement · 0.3 mi', cost: 'Free', summary: 'Open, peer-led recovery support meeting.', recurring: 'Weekdays at noon', goodToKnow: 'Open to anyone who wants to attend.' },
  { id: 'c-jobfair', title: 'Fair-chance hiring fair', category: 'jobs', weekday: 3, start: '10:00', end: '14:00', place: 'Workforce center · 2.0 mi', cost: 'Free', summary: 'Employers who hire people with records, interviewing on the spot.', recurring: 'Quarterly', goodToKnow: 'Bring a few copies of your resume. Interview clothes available.' },
  { id: 'c-resume', title: 'Resume drop-in', category: 'jobs', weekday: 2, start: '13:00', end: '16:00', place: 'Fresh Start Jobs Center · 1.2 mi', cost: 'Free', summary: 'One-on-one help writing or fixing your resume.', recurring: 'Tuesdays', goodToKnow: 'Help explaining gaps in work history.' },
];

/** The next date (today or later) that falls on the event's weekday. */
export function nextDate(weekday: number, from = new Date()) {
  const d = new Date(from);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return localDate(d);
}

export const time12 = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
};
