import { apiGet, apiPost } from '@/lib/api';

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  status: string;
}

export interface BranchStats {
  customersServedToday: number;
  avgWaitMinutes: number;
  avgServiceMinutes: number;
  staffOnDuty: number;
  totalStaff: number;
  revenueToday: number;
  transactionsToday: number;
  queueWaitTrend: { hour: number; avgWait: number }[];
  serviceMix: { service: string; count: number; percentage: number }[];
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'FULL_DAY' | 'OFF' | 'ON_LEAVE';

export interface StaffSchedule {
  staffId: string;
  staffName: string;
  role: string;
  schedule: Record<string, ShiftType>;
}

export interface Counter {
  id: string;
  name: string;
  type: 'TELLER' | 'CSO' | 'MANAGER';
  staffName: string;
  currentTicket: string;
  currentService: string;
  serviceStartedAt: string;
  status: 'SERVING' | 'IDLE' | 'BREAK';
}

export interface QueueTicket {
  id: string;
  ticketNumber: string;
  serviceType: string;
  customerName?: string;
  priority: 'NORMAL' | 'PRIORITY' | 'VIP';
  issuedAt: string;
  calledAt?: string;
  servedAt?: string;
  waitMinutes?: number;
  serviceMinutes?: number;
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'NO_SHOW';
}

export interface LiveQueue {
  waitingCount: number;
  longestWaitMinutes: number;
  nextTicket: string;
  counters: Counter[];
  waitingTickets: QueueTicket[];
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  condition: 'GOOD' | 'FAIR' | 'POOR';
  lastInspection: string;
  nextInspectionDue: string;
  insuranceExpiry: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
}

export interface ServicePlanMetric {
  metric: string;
  target: number;
  actual: number;
  unit: string;
  achievementPct: number;
  status: 'MET' | 'AT_RISK' | 'MISSED';
}

export interface BranchRanking {
  rank: number;
  branchId: string;
  branchName: string;
  score: number;
  transactionsToday: number;
  avgWait: number;
  satisfactionScore: number;
}

export interface ScheduleRequest {
  staffId: string;
  weekOf: string;
  schedule: Record<string, ShiftType>;
}

export interface SwapShiftRequest {
  staffId1: string;
  staffId2: string;
  date1: string;
  date2: string;
  reason: string;
}

export interface FacilityRequest {
  name: string;
  type: string;
  condition: 'GOOD' | 'FAIR' | 'POOR';
  lastInspection: string;
  nextInspectionDue: string;
  insuranceExpiry: string;
}

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ---- Demo data ----

const MOCK_BRANCHES: Branch[] = [
  { id: 'br-001', name: 'Victoria Island Branch', code: 'VIB', city: 'Lagos', state: 'Lagos', status: 'ACTIVE' },
  { id: 'br-002', name: 'Abuja Central Branch', code: 'ACB', city: 'Abuja', state: 'FCT', status: 'ACTIVE' },
  { id: 'br-003', name: 'Kano Main Branch', code: 'KMB', city: 'Kano', state: 'Kano', status: 'ACTIVE' },
  { id: 'br-004', name: 'Port Harcourt Branch', code: 'PHB', city: 'Port Harcourt', state: 'Rivers', status: 'ACTIVE' },
  { id: 'br-005', name: 'Ibadan Central Branch', code: 'ICB', city: 'Ibadan', state: 'Oyo', status: 'ACTIVE' },
];

const MOCK_BRANCH_STATS: BranchStats = {
  customersServedToday: 142,
  avgWaitMinutes: 8.4,
  avgServiceMinutes: 5.2,
  staffOnDuty: 12,
  totalStaff: 18,
  revenueToday: 14_820_500,
  transactionsToday: 218,
  queueWaitTrend: [
    { hour: 8, avgWait: 3.2 },
    { hour: 9, avgWait: 7.8 },
    { hour: 10, avgWait: 12.1 },
    { hour: 11, avgWait: 14.3 },
    { hour: 12, avgWait: 9.6 },
    { hour: 13, avgWait: 6.2 },
    { hour: 14, avgWait: 8.9 },
    { hour: 15, avgWait: 11.4 },
    { hour: 16, avgWait: 7.1 },
  ],
  serviceMix: [
    { service: 'Cash Deposit', count: 54, percentage: 24.8 },
    { service: 'Cash Withdrawal', count: 61, percentage: 28.0 },
    { service: 'Account Opening', count: 18, percentage: 8.3 },
    { service: 'Enquiry', count: 32, percentage: 14.7 },
    { service: 'Account Maintenance', count: 21, percentage: 9.6 },
    { service: 'Loan', count: 14, percentage: 6.4 },
    { service: 'FX', count: 12, percentage: 5.5 },
    { service: 'Other', count: 6, percentage: 2.8 },
  ],
};

const MOCK_COUNTERS: Counter[] = [
  {
    id: 'cnt-001', name: 'Counter 1', type: 'TELLER',
    staffName: 'Amina Yusuf', currentTicket: 'A047', currentService: 'Cash Withdrawal',
    serviceStartedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), status: 'SERVING',
  },
  {
    id: 'cnt-002', name: 'Counter 2', type: 'TELLER',
    staffName: 'Emeka Okafor', currentTicket: 'B023', currentService: 'Cash Deposit',
    serviceStartedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(), status: 'SERVING',
  },
  {
    id: 'cnt-003', name: 'Counter 3', type: 'TELLER',
    staffName: 'Chidinma Eze', currentTicket: '', currentService: '',
    serviceStartedAt: '', status: 'IDLE',
  },
  {
    id: 'cnt-004', name: 'CSO Desk 1', type: 'CSO',
    staffName: 'Fatima Bello', currentTicket: 'C011', currentService: 'Account Opening',
    serviceStartedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(), status: 'SERVING',
  },
  {
    id: 'cnt-005', name: 'CSO Desk 2', type: 'CSO',
    staffName: 'Tunde Adeyemi', currentTicket: '', currentService: '',
    serviceStartedAt: '', status: 'BREAK',
  },
  {
    id: 'cnt-006', name: 'Manager Desk', type: 'MANAGER',
    staffName: 'Ibrahim Sule', currentTicket: 'M003', currentService: 'Loan Application',
    serviceStartedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), status: 'SERVING',
  },
];

const MOCK_WAITING_TICKETS: QueueTicket[] = [
  { id: 'tkt-001', ticketNumber: 'A048', serviceType: 'Cash Deposit', priority: 'NORMAL', issuedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(), waitMinutes: 9, status: 'WAITING' },
  { id: 'tkt-002', ticketNumber: 'A049', serviceType: 'Cash Withdrawal', priority: 'PRIORITY', customerName: 'Senior Citizen', issuedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(), waitMinutes: 6, status: 'WAITING' },
  { id: 'tkt-003', ticketNumber: 'B024', serviceType: 'Cash Deposit', priority: 'NORMAL', issuedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), waitMinutes: 12, status: 'WAITING' },
  { id: 'tkt-004', ticketNumber: 'C012', serviceType: 'Account Maintenance', priority: 'VIP', customerName: 'Alhaji Musa Tanko', issuedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), waitMinutes: 4, status: 'WAITING' },
  { id: 'tkt-005', ticketNumber: 'A050', serviceType: 'Enquiry', priority: 'NORMAL', issuedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), waitMinutes: 3, status: 'WAITING' },
];

const MOCK_HISTORY_TICKETS: QueueTicket[] = [
  { id: 'tkt-h001', ticketNumber: 'A001', serviceType: 'Cash Deposit', priority: 'NORMAL', issuedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(), calledAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(), servedAt: new Date(Date.now() - 105 * 60 * 1000).toISOString(), waitMinutes: 10, serviceMinutes: 4, status: 'COMPLETED' },
  { id: 'tkt-h002', ticketNumber: 'A002', serviceType: 'Cash Withdrawal', priority: 'NORMAL', issuedAt: new Date(Date.now() - 115 * 60 * 1000).toISOString(), calledAt: new Date(Date.now() - 104 * 60 * 1000).toISOString(), servedAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(), waitMinutes: 11, serviceMinutes: 6, status: 'COMPLETED' },
  { id: 'tkt-h003', ticketNumber: 'B001', serviceType: 'Enquiry', priority: 'PRIORITY', issuedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(), calledAt: new Date(Date.now() - 102 * 60 * 1000).toISOString(), waitMinutes: 8, status: 'NO_SHOW' },
  { id: 'tkt-h004', ticketNumber: 'C001', serviceType: 'Account Opening', priority: 'NORMAL', issuedAt: new Date(Date.now() - 105 * 60 * 1000).toISOString(), calledAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(), servedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(), waitMinutes: 10, serviceMinutes: 18, status: 'COMPLETED' },
  { id: 'tkt-h005', ticketNumber: 'A003', serviceType: 'Cash Deposit', priority: 'VIP', customerName: 'Dr. Ngozi Okonjo', issuedAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(), calledAt: new Date(Date.now() - 98 * 60 * 1000).toISOString(), servedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(), waitMinutes: 2, serviceMinutes: 3, status: 'COMPLETED' },
  { id: 'tkt-h006', ticketNumber: 'A004', serviceType: 'Cash Withdrawal', priority: 'NORMAL', issuedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(), calledAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(), servedAt: new Date(Date.now() - 81 * 60 * 1000).toISOString(), waitMinutes: 10, serviceMinutes: 5, status: 'COMPLETED' },
];

const MOCK_LIVE_QUEUE: LiveQueue = {
  waitingCount: MOCK_WAITING_TICKETS.length,
  longestWaitMinutes: 12,
  nextTicket: 'A048',
  counters: MOCK_COUNTERS,
  waitingTickets: MOCK_WAITING_TICKETS,
};

const STAFF_NAMES = [
  'Amina Yusuf', 'Emeka Okafor', 'Chidinma Eze', 'Fatima Bello', 'Tunde Adeyemi',
  'Ibrahim Sule', 'Aisha Mohammed', 'Chukwuemeka Obi', 'Ngozi Adaeze', 'Musa Tanko',
];

const STAFF_ROLES = ['Teller', 'Teller', 'CSO', 'CSO', 'Teller', 'Branch Manager', 'Teller', 'Teller', 'CSO', 'Teller'];

function getWeekDates(weekOf: string): string[] {
  const start = new Date(weekOf);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function generateMockSchedule(weekOf: string): StaffSchedule[] {
  const dates = getWeekDates(weekOf);
  const shifts: ShiftType[] = ['MORNING', 'AFTERNOON', 'FULL_DAY', 'MORNING', 'AFTERNOON', 'OFF', 'OFF'];
  return STAFF_NAMES.map((name, i) => {
    const schedule: Record<string, ShiftType> = {};
    dates.forEach((date, di) => {
      const shift = shifts[(i + di) % shifts.length];
      schedule[date] = shift;
    });
    return { staffId: `staff-${String(i + 1).padStart(3, '0')}`, staffName: name, role: STAFF_ROLES[i], schedule };
  });
}

const MOCK_FACILITIES: Facility[] = [
  { id: 'fac-001', name: 'Main Generator', type: 'Power Equipment', condition: 'GOOD', lastInspection: '2026-01-15', nextInspectionDue: '2026-04-15', insuranceExpiry: '2026-12-31', status: 'ACTIVE' },
  { id: 'fac-002', name: 'ATM Machine #1', type: 'Banking Equipment', condition: 'GOOD', lastInspection: '2026-02-20', nextInspectionDue: '2026-05-20', insuranceExpiry: '2026-08-31', status: 'ACTIVE' },
  { id: 'fac-003', name: 'ATM Machine #2', type: 'Banking Equipment', condition: 'FAIR', lastInspection: '2026-01-10', nextInspectionDue: '2026-03-15', insuranceExpiry: '2026-06-30', status: 'MAINTENANCE' },
  { id: 'fac-004', name: 'CCTV System', type: 'Security Equipment', condition: 'GOOD', lastInspection: '2026-03-01', nextInspectionDue: '2026-06-01', insuranceExpiry: '2027-03-01', status: 'ACTIVE' },
  { id: 'fac-005', name: 'Safe Vault', type: 'Security Equipment', condition: 'GOOD', lastInspection: '2026-01-20', nextInspectionDue: '2026-07-20', insuranceExpiry: '2026-11-30', status: 'ACTIVE' },
  { id: 'fac-006', name: 'Air Conditioning Unit', type: 'HVAC', condition: 'POOR', lastInspection: '2025-11-15', nextInspectionDue: '2026-02-15', insuranceExpiry: '2026-05-31', status: 'MAINTENANCE' },
  { id: 'fac-007', name: 'Fire Suppression System', type: 'Safety Equipment', condition: 'GOOD', lastInspection: '2026-02-10', nextInspectionDue: '2026-08-10', insuranceExpiry: '2026-09-30', status: 'ACTIVE' },
  { id: 'fac-008', name: 'Currency Counter Machine', type: 'Banking Equipment', condition: 'FAIR', lastInspection: '2026-01-25', nextInspectionDue: '2026-04-25', insuranceExpiry: '2026-12-31', status: 'ACTIVE' },
];

const MOCK_SERVICE_PLAN: ServicePlanMetric[] = [
  { metric: 'Customer Satisfaction', target: 90, actual: 87, unit: '%', achievementPct: 96.7, status: 'AT_RISK' },
  { metric: 'Avg Wait Time', target: 10, actual: 8.4, unit: 'min', achievementPct: 100, status: 'MET' },
  { metric: 'Transactions/Day', target: 200, actual: 218, unit: 'txns', achievementPct: 109, status: 'MET' },
  { metric: 'Revenue Target', target: 12_000_000, actual: 14_820_500, unit: 'NGN', achievementPct: 123.5, status: 'MET' },
  { metric: 'Account Openings', target: 25, actual: 18, unit: 'accounts', achievementPct: 72, status: 'MISSED' },
  { metric: 'Staff Attendance', target: 95, actual: 88, unit: '%', achievementPct: 92.6, status: 'AT_RISK' },
  { metric: 'Loan Disbursements', target: 10, actual: 14, unit: 'loans', achievementPct: 140, status: 'MET' },
];

const MOCK_RANKINGS: BranchRanking[] = [
  { rank: 1, branchId: 'br-001', branchName: 'Victoria Island Branch', score: 94.2, transactionsToday: 218, avgWait: 8.4, satisfactionScore: 4.7 },
  { rank: 2, branchId: 'br-002', branchName: 'Abuja Central Branch', score: 89.5, transactionsToday: 195, avgWait: 9.1, satisfactionScore: 4.5 },
  { rank: 3, branchId: 'br-004', branchName: 'Port Harcourt Branch', score: 85.1, transactionsToday: 178, avgWait: 11.2, satisfactionScore: 4.3 },
  { rank: 4, branchId: 'br-005', branchName: 'Ibadan Central Branch', score: 81.7, transactionsToday: 162, avgWait: 12.8, satisfactionScore: 4.2 },
  { rank: 5, branchId: 'br-003', branchName: 'Kano Main Branch', score: 78.3, transactionsToday: 144, avgWait: 14.5, satisfactionScore: 4.0 },
];

let ticketCounter = 51;

export const branchOpsApi = {
  getBranches: async (): Promise<Branch[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 350));
      return MOCK_BRANCHES;
    }
    return apiGet<Branch[]>('/v1/branches');
  },

  getBranchStats: async (branchId: string): Promise<BranchStats> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return { ...MOCK_BRANCH_STATS, staffOnDuty: branchId === 'br-001' ? 12 : 9 };
    }
    return apiGet<BranchStats>(`/v1/branches/${branchId}/stats`);
  },

  getLiveQueue: async (branchId: string): Promise<LiveQueue> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      void branchId;
      return MOCK_LIVE_QUEUE;
    }
    return apiGet<LiveQueue>(`/v1/branches/${branchId}/queue/live`);
  },

  getQueueHistory: async (branchId: string, date: string): Promise<QueueTicket[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      void branchId;
      void date;
      return MOCK_HISTORY_TICKETS;
    }
    return apiGet<QueueTicket[]>(`/v1/branches/${branchId}/queue/history`, { date });
  },

  issueTicket: async (branchId: string, serviceType: string, priority?: string, customerName?: string): Promise<QueueTicket> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      void branchId;
      const num = ticketCounter++;
      const prefix = serviceType.startsWith('Cash') ? 'A' : serviceType.startsWith('Account') ? 'C' : 'B';
      return {
        id: `tkt-new-${num}`,
        ticketNumber: `${prefix}${String(num).padStart(3, '0')}`,
        serviceType,
        customerName,
        priority: (priority as QueueTicket['priority']) ?? 'NORMAL',
        issuedAt: new Date().toISOString(),
        status: 'WAITING',
      };
    }
    return apiPost<QueueTicket>(`/v1/branches/${branchId}/queue/issue`, { serviceType, priority, customerName });
  },

  callNext: async (branchId: string, counterId: string): Promise<QueueTicket> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      void branchId;
      void counterId;
      return MOCK_WAITING_TICKETS[0];
    }
    return apiPost<QueueTicket>(`/v1/branches/${branchId}/queue/call-next`, { counterId });
  },

  completeService: async (branchId: string, ticketId: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      void branchId;
      void ticketId;
      return;
    }
    await apiPost<void>(`/v1/branches/${branchId}/queue/${ticketId}/complete`);
  },

  markNoShow: async (branchId: string, ticketId: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      void branchId;
      void ticketId;
      return;
    }
    await apiPost<void>(`/v1/branches/${branchId}/queue/${ticketId}/no-show`);
  },

  getStaffSchedule: async (branchId: string, weekOf: string): Promise<StaffSchedule[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 450));
      void branchId;
      return generateMockSchedule(weekOf);
    }
    return apiGet<StaffSchedule[]>(`/v1/branches/${branchId}/schedule`, { weekOf });
  },

  createSchedule: async (branchId: string, data: ScheduleRequest): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      void branchId;
      void data;
      return;
    }
    await apiPost<void>(`/v1/branches/${branchId}/schedule`, data);
  },

  swapShift: async (branchId: string, data: SwapShiftRequest): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      void branchId;
      void data;
      return;
    }
    await apiPost<void>(`/v1/branches/${branchId}/schedule/swap`, data);
  },

  getFacilities: async (branchId: string): Promise<Facility[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      void branchId;
      return MOCK_FACILITIES;
    }
    return apiGet<Facility[]>(`/v1/branches/${branchId}/facilities`);
  },

  addFacility: async (branchId: string, data: FacilityRequest): Promise<Facility> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      void branchId;
      return { id: `fac-new-${Date.now()}`, ...data, status: 'ACTIVE' };
    }
    return apiPost<Facility>(`/v1/branches/${branchId}/facilities`, data);
  },

  getServicePlan: async (branchId: string): Promise<ServicePlanMetric[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      void branchId;
      return MOCK_SERVICE_PLAN;
    }
    return apiGet<ServicePlanMetric[]>(`/v1/branches/${branchId}/service-plan`);
  },

  getBranchRankings: async (): Promise<BranchRanking[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_RANKINGS;
    }
    return apiGet<BranchRanking[]>('/v1/branches/rankings');
  },
};
