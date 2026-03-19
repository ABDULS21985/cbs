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

export const branchOpsApi = {
  getBranches: async (): Promise<Branch[]> => {
    return apiGet<Branch[]>('/v1/branches');
  },

  getBranchStats: async (branchId: string): Promise<BranchStats> => {
    return apiGet<BranchStats>(`/v1/branches/${branchId}/stats`);
  },

  getLiveQueue: async (branchId: string): Promise<LiveQueue> => {
    return apiGet<LiveQueue>(`/v1/branches/${branchId}/queue/live`);
  },

  getQueueHistory: async (branchId: string, date: string): Promise<QueueTicket[]> => {
    return apiGet<QueueTicket[]>(`/v1/branches/${branchId}/queue/history`, { date });
  },

  issueTicket: async (branchId: string, serviceType: string, priority?: string, customerName?: string): Promise<QueueTicket> => {
    return apiPost<QueueTicket>(`/v1/branches/${branchId}/queue/issue`, { serviceType, priority, customerName });
  },

  callNext: async (branchId: string, counterId: string): Promise<QueueTicket> => {
    return apiPost<QueueTicket>(`/v1/branches/${branchId}/queue/call-next`, { counterId });
  },

  completeService: async (branchId: string, ticketId: string): Promise<void> => {
    await apiPost<void>(`/v1/branches/${branchId}/queue/${ticketId}/complete`);
  },

  markNoShow: async (branchId: string, ticketId: string): Promise<void> => {
    await apiPost<void>(`/v1/branches/${branchId}/queue/${ticketId}/no-show`);
  },

  getStaffSchedule: async (branchId: string, weekOf: string): Promise<StaffSchedule[]> => {
    return apiGet<StaffSchedule[]>(`/v1/branches/${branchId}/schedule`, { weekOf });
  },

  createSchedule: async (branchId: string, data: ScheduleRequest): Promise<void> => {
    await apiPost<void>(`/v1/branches/${branchId}/schedule`, data);
  },

  swapShift: async (branchId: string, data: SwapShiftRequest): Promise<void> => {
    await apiPost<void>(`/v1/branches/${branchId}/schedule/swap`, data);
  },

  getFacilities: async (branchId: string): Promise<Facility[]> => {
    return apiGet<Facility[]>(`/v1/branches/${branchId}/facilities`);
  },

  addFacility: async (branchId: string, data: FacilityRequest): Promise<Facility> => {
    return apiPost<Facility>(`/v1/branches/${branchId}/facilities`, data);
  },

  getServicePlan: async (branchId: string): Promise<ServicePlanMetric[]> => {
    return apiGet<ServicePlanMetric[]>(`/v1/branches/${branchId}/service-plan`);
  },

  getBranchRankings: async (): Promise<BranchRanking[]> => {
    return apiGet<BranchRanking[]>('/v1/branches/rankings');
  },
};
