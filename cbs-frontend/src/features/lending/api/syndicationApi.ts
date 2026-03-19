import { apiGet } from '@/lib/api';

export interface SyndicatedLoan {
  id: number; facilityRef: string; borrowerName: string;
  totalFacility: number; ourShare: number; ourSharePct: number;
  role: string; participantCount: number;
  tenor: string; pricing: string; currency: string; status: string;
}

export interface Participant {
  name: string; share: number; sharePct: number; role: string;
}

export interface ProjectFinance {
  id: number; projectRef: string; projectName: string; sector: string;
  totalFacility: number; drawn: number;
  milestonePhase: string; milestoneCount: number; completedMilestones: number;
  status: string;
}

export interface ProjectMilestone {
  phase: string; description: string; budget: number; actualCost: number;
  completionPct: number; status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

export const syndicationApi = {
  getSyndicatedLoans: () => apiGet<SyndicatedLoan[]>('/api/v1/syndication').catch(() => []),
  getSyndicatedLoan: (id: number) => apiGet<SyndicatedLoan>(`/api/v1/syndication/${id}`),
  getParticipants: (id: number) => apiGet<Participant[]>(`/api/v1/syndication/${id}/participants`).catch(() => []),

  getProjects: () => apiGet<ProjectFinance[]>('/api/v1/project-finance').catch(() => []),
  getProject: (id: number) => apiGet<ProjectFinance>(`/api/v1/project-finance/${id}`),
  getMilestones: (id: number) => apiGet<ProjectMilestone[]>(`/api/v1/project-finance/${id}/milestones`).catch(() => []),
};
