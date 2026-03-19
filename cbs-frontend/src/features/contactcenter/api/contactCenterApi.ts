import { apiGet, apiPost } from '@/lib/api';

export interface AgentState {
  agentId: string; agentName: string;
  state: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';
  currentInteractionId: string | null;
  callsToday: number; avgHandleTimeSec: number; fcrPct: number;
  qualityScore: number;
}

export interface QueueStatus {
  queueName: string; queueType: string;
  waiting: number; longestWaitSec: number;
  slaTargetSec: number; slaPct: number;
  agentsTotal: number; agentsAvailable: number;
}

export interface CustomerMiniProfile {
  customerId: number; customerName: string; segment: string;
  riskRating: string; memberSince: string;
  accounts: { type: string; number: string; balance: number; status: string }[];
  recentInteractions: { date: string; channel: string; summary: string }[];
  alerts: { type: string; message: string; severity: string }[];
}

export interface CallDisposition {
  category: string; subCategory: string;
  disposition: string; notes: string;
  fcr: boolean;
}

export const contactCenterApi = {
  getAgentStates: () => apiGet<AgentState[]>('/api/v1/contact-center/agents').catch(() => []),
  updateAgentState: (agentId: string, state: string) => apiPost<void>(`/api/v1/contact-center/agents/${agentId}/state`, { state }),

  getQueueStatus: () => apiGet<QueueStatus[]>('/api/v1/contact-center/queues').catch(() => []),

  getCustomerProfile: (customerId: number) => apiGet<CustomerMiniProfile>(`/api/v1/customers/${customerId}/mini-profile`),
  getCustomerByPhone: (phone: string) => apiGet<CustomerMiniProfile>(`/api/v1/customers/lookup`, { phone }),

  saveDisposition: (interactionId: string, data: CallDisposition) => apiPost<void>(`/api/v1/contact-center/interactions/${interactionId}/dispose`, data),
  scheduleCallback: (data: { customerId: number; phone: string; preferredTime: string; reason: string }) => apiPost<void>('/api/v1/contact-center/callbacks', data),
};
