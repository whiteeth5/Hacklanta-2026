// Reentry Resource Navigator data.
// "demo" entries are invented for the prototype: not real organizations, numbers (555-01xx is reserved
// for fiction) or links. "national" entries are real public services; local availability is not verified.
import type { Resource, ResourceCategory } from '../types';

export const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  housing: 'Housing assistance',
  employment: 'Employment',
  food: 'Food support',
  transportation: 'Transportation',
  id_documents: 'ID & documents',
  utilities: 'Utility assistance',
  legal: 'Legal help',
  health: 'Health & wellbeing',
};

const D = (r: Omit<Resource, 'verification'>): Resource => ({ ...r, verification: 'demo' });

export const RESOURCES: Resource[] = [
  { id: 'n-211', name: '211 helpline', category: 'housing', verification: 'national', summary: 'Free, confidential referrals to local housing, food, utility and reentry help.', eligibility: 'Anyone.', hours: 'Many regions answer 24 hours', phone: '211', website: 'https://www.211.org', area: 'Most of the US', tags: ['housing', 'food', 'utilities', 'employment', 'transportation'] },
  { id: 'n-ssa', name: 'Social Security card replacement', category: 'id_documents', verification: 'national', summary: 'Request a replacement Social Security card, often needed for jobs and leases.', eligibility: 'Set by the Social Security Administration. You’ll need proof of identity.', hours: 'Online, or by appointment', phone: '', website: 'https://www.ssa.gov/number-card', area: 'Nationwide', tags: ['id_documents', 'employment'] },
  { id: 'n-liheap', name: 'LIHEAP energy assistance', category: 'utilities', verification: 'national', summary: 'Federal help with heating and cooling bills, applied for through local agencies.', eligibility: 'Set by each state. The program decides, not HomeBridge.', hours: 'Seasonal in many states', phone: '', website: 'https://www.acf.hhs.gov/ocs/programs/liheap', area: 'All states', tags: ['utilities'] },
  { id: 'n-lifeline', name: 'Lifeline phone & internet discount', category: 'utilities', verification: 'national', summary: 'Lowers the monthly cost of phone or internet service.', eligibility: 'Set by the FCC. The program decides.', hours: 'Online', phone: '', website: 'https://www.fcc.gov/lifeline-consumers', area: 'Nationwide', tags: ['utilities', 'employment'] },

  D({ id: 'd-house-1', name: 'Second Chance Housing Navigators', category: 'housing', summary: 'Matches people with records to landlords that accept them, and helps with applications.', eligibility: 'Adults leaving transitional housing in the service area.', hours: 'Mon–Fri 9am–5pm', phone: '(404) 555-0120', website: 'https://example.org/second-chance-housing', area: 'Metro area', tags: ['housing', 'pathway'] }),
  D({ id: 'd-house-2', name: 'Move-In Ready Deposit Fund', category: 'housing', summary: 'One-time help with a security deposit or first month’s rent.', eligibility: 'Signed lease or approval letter required. The fund decides.', hours: 'Applications reviewed weekly', phone: '(404) 555-0121', website: 'https://example.org/move-in-fund', area: 'Metro area', tags: ['housing', 'budget'] }),
  D({ id: 'd-emp-1', name: 'Fresh Start Jobs Center', category: 'employment', summary: 'Job leads with fair-chance employers, resume help and interview clothes.', eligibility: 'Anyone; focus on people with records.', hours: 'Mon–Thu 8:30am–4:30pm', phone: '(404) 555-0130', website: 'https://example.org/fresh-start-jobs', area: 'Downtown', tags: ['employment', 'budget'] }),
  D({ id: 'd-emp-2', name: 'Skilled Trades Pre-Apprenticeship', category: 'employment', summary: '8-week paid training in construction trades with job placement.', eligibility: '18+, able to start within 30 days. Program decides.', hours: 'Cohorts start monthly', phone: '(404) 555-0131', website: 'https://example.org/trades', area: 'Westside', tags: ['employment'] }),
  D({ id: 'd-food-1', name: 'Neighborhood Community Pantry', category: 'food', summary: 'Weekly groceries with fresh produce. No appointment needed.', eligibility: 'Open to all residents of the area.', hours: 'Tue & Thu 10am–2pm', phone: '(404) 555-0140', website: 'https://example.org/pantry', area: 'Eastside', tags: ['food', 'budget'] }),
  D({ id: 'd-food-2', name: 'Benefits Sign-Up Clinic', category: 'food', summary: 'Help applying for food benefits and checking what else you may qualify for.', eligibility: 'Anyone. Agencies decide eligibility.', hours: 'Wed 1pm–6pm walk-in', phone: '(404) 555-0141', website: 'https://example.org/benefits-clinic', area: 'Library branch', tags: ['food', 'budget'] }),
  D({ id: 'd-trans-1', name: 'Reduced-Fare Transit Pass Program', category: 'transportation', summary: 'Discounted monthly transit passes for people starting work.', eligibility: 'Proof of a job offer or training enrollment.', hours: 'Mon–Fri 9am–4pm', phone: '(404) 555-0150', website: 'https://example.org/transit-pass', area: 'Transit service area', tags: ['transportation', 'employment', 'budget'] }),
  D({ id: 'd-id-1', name: 'ID Recovery Day', category: 'id_documents', summary: 'Covers fees and paperwork for state IDs and birth certificates.', eligibility: 'People who lost documents or are leaving incarceration.', hours: 'Second Saturday, 10am–2pm', phone: '(404) 555-0160', website: 'https://example.org/id-day', area: 'Community center', tags: ['id_documents', 'pathway'] }),
  D({ id: 'd-util-1', name: 'First Utility Account Help Desk', category: 'utilities', summary: 'Help opening utility accounts, avoiding deposits and setting up payment plans.', eligibility: 'Anyone setting up a first account.', hours: 'Mon–Thu 9am–4pm', phone: '(404) 555-0170', website: 'https://example.org/utility-help', area: 'Metro area', tags: ['utilities', 'pathway'] }),
  D({ id: 'd-legal-1', name: 'Record Restriction Legal Clinic', category: 'legal', summary: 'Free help checking whether parts of your record can be restricted or sealed.', eligibility: 'Income limits may apply. The clinic decides.', hours: 'First Tuesday, 5pm–8pm', phone: '(404) 555-0180', website: 'https://example.org/record-clinic', area: 'Downtown', tags: ['legal', 'housing', 'employment'] }),
  D({ id: 'd-legal-2', name: 'Tenant Rights Hotline', category: 'legal', summary: 'Explains housing agreements, repairs and what to do if you’re asked to leave.', eligibility: 'Renters and residents of shared housing. General information, not legal advice.', hours: 'Mon–Fri 10am–4pm', phone: '(404) 555-0181', website: 'https://example.org/tenant-hotline', area: 'Statewide', tags: ['legal', 'housing'] }),
  D({ id: 'd-health-1', name: 'Community Health Clinic', category: 'health', summary: 'Primary care, mental health and recovery support on a sliding scale.', eligibility: 'Anyone; fees based on income.', hours: 'Mon–Sat 8am–6pm', phone: '(404) 555-0190', website: 'https://example.org/clinic', area: 'Southside', tags: ['health'] }),
];
