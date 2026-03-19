import { apiGet, apiPost, apiPut } from '@/lib/api';

export interface OpRiskStats {
  lossEventsMtd: number;
  totalLossMtd: number;
  openIncidents: number;
  krisBreached: number;
  rcsaDue: number;
  currency: string;
}

export interface LossEvent {
  id: number;
  eventNumber: string;
  eventDate: string;
  category: string;
  subCategory: string;
  description: string;
  grossLoss: number;
  recovery: number;
  netLoss: number;
  currency: string;
  businessUnit: string;
  rootCause?: string;
  correctiveActions?: string;
  lessonsLearned?: string;
  insuranceClaim?: boolean;
  status: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';
  createdAt: string;
}

export interface LossByCategory {
  category: string;
  totalLoss: number;
  eventCount: number;
}

export interface LossTrend {
  month: string;
  amount: number;
  movingAvg: number;
}

export interface Kri {
  id: number;
  name: string;
  currentValue: number;
  unit: string;
  greenThreshold: number;
  amberThreshold: number;
  redThreshold: number;
  status: 'GREEN' | 'AMBER' | 'RED';
  trendData: { date: string; value: number }[];
  lastUpdated: string;
  dataSource: string;
}

export interface RcsaAssessment {
  id: number;
  department: string;
  period: string;
  risksIdentified: number;
  controlsAssessed: number;
  residualRiskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  dueDate: string;
}

export interface Incident {
  id: number;
  incidentNumber: string;
  date: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  impact: string;
  assignedTo: string;
  status: 'LOGGED' | 'ASSESSING' | 'CONTAINING' | 'RESOLVED' | 'POST_MORTEM';
  createdAt: string;
}

export const opriskApi = {
  getStats: () => apiGet<OpRiskStats>('/api/v1/risk/operational/stats'),
  getLossEvents: (filters?: Record<string, unknown>) => apiGet<LossEvent[]>('/api/v1/risk/operational/loss-events', filters),
  getLossEvent: (id: number) => apiGet<LossEvent>(`/api/v1/risk/operational/loss-events/${id}`),
  createLossEvent: (data: Partial<LossEvent>) => apiPost<LossEvent>('/api/v1/risk/operational/loss-events', data),
  updateLossEvent: (id: number, data: Partial<LossEvent>) => apiPut<LossEvent>(`/api/v1/risk/operational/loss-events/${id}`, data),
  getLossByCategory: () => apiGet<LossByCategory[]>('/api/v1/risk/operational/loss-by-category'),
  getLossTrend: () => apiGet<LossTrend[]>('/api/v1/risk/operational/loss-trend'),
  getKris: () => apiGet<Kri[]>('/api/v1/risk/operational/kris'),
  getKri: (id: number) => apiGet<Kri>(`/api/v1/risk/operational/kris/${id}`),
  getRcsaList: () => apiGet<RcsaAssessment[]>('/api/v1/risk/operational/rcsa'),
  getRcsa: (id: number) => apiGet<RcsaAssessment>(`/api/v1/risk/operational/rcsa/${id}`),
  getIncidents: (filters?: Record<string, unknown>) => apiGet<Incident[]>('/api/v1/risk/operational/incidents', filters),
  createIncident: (data: Partial<Incident>) => apiPost<Incident>('/api/v1/risk/operational/incidents', data),
};
