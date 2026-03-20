import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { ContactInteraction } from '../types/contactCenterExt';

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

interface BackendAgentState {
  agentId: string;
  agentName: string;
  currentState: AgentState['state'];
  currentInteractionId: number | null;
  dailyHandled?: number | null;
  dailyAvgHandleTime?: number | null;
  dailyFirstContactResolution?: number | null;
  qualityScore?: number | null;
}

interface BackendQueueStatus {
  queueName: string;
  queueType: string;
  currentWaiting?: number | null;
  longestWaitSeconds?: number | null;
  slaTargetSeconds?: number | null;
  slaAchievementPct?: number | null;
  agentsAssigned?: number | null;
  agentsAvailable?: number | null;
}

function mapAgentState(agent: BackendAgentState): AgentState {
  return {
    agentId: agent.agentId,
    agentName: agent.agentName,
    state: agent.currentState ?? 'OFFLINE',
    currentInteractionId: agent.currentInteractionId != null ? String(agent.currentInteractionId) : null,
    callsToday: agent.dailyHandled ?? 0,
    avgHandleTimeSec: agent.dailyAvgHandleTime ?? 0,
    fcrPct: agent.dailyFirstContactResolution ?? 0,
    qualityScore: agent.qualityScore ?? 0,
  };
}

function mapQueueStatus(queue: BackendQueueStatus): QueueStatus {
  return {
    queueName: queue.queueName,
    queueType: queue.queueType,
    waiting: queue.currentWaiting ?? 0,
    longestWaitSec: queue.longestWaitSeconds ?? 0,
    slaTargetSec: queue.slaTargetSeconds ?? 0,
    slaPct: queue.slaAchievementPct ?? 0,
    agentsTotal: queue.agentsAssigned ?? 0,
    agentsAvailable: queue.agentsAvailable ?? 0,
  };
}

export const contactCenterApi = {
  // Agent & Queue — no .catch() so React Query exposes isError properly
  getAgentStates: () => apiGet<BackendAgentState[]>('/api/v1/contact-center/agents').then((agents) => agents.map(mapAgentState)),
  updateAgentState: (agentId: string, state: string) => apiPut<void>(`/api/v1/contact-routing/agents/${agentId}/state?newState=${encodeURIComponent(state)}`),
  getQueueStatus: () => apiGet<BackendQueueStatus[]>('/api/v1/contact-center/queues').then((queues) => queues.map(mapQueueStatus)),

  getCustomerProfile: (customerId: number) => apiGet<CustomerMiniProfile>(`/api/v1/customers/${customerId}/mini-profile`),
  getCustomerByPhone: (phone: string) => apiGet<CustomerMiniProfile>(`/api/v1/customers/lookup`, { phone }),
  saveDisposition: (interactionId: string, data: CallDisposition) => apiPost<void>(`/api/v1/contact-center/interactions/${interactionId}/dispose`, data),
  scheduleCallback: (data: { customerId: number; phone: string; preferredTime: string; reason: string }) => apiPost<void>('/api/v1/contact-center/callbacks', data),

  // Interactions (consolidated from contactCenterExtApi.ts — renamed from assign2/byCustomer2)
  createInteraction: (data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>('/api/v1/contact-center/interactions', data),
  assignInteraction: (id: number) =>
    apiPost<Record<string, unknown>>(`/api/v1/contact-center/interactions/${id}/assign`),
  completeInteraction: (id: number) =>
    apiPost<Record<string, unknown>>(`/api/v1/contact-center/interactions/${id}/complete`),
  getInteractionsByCustomer: (customerId: number) =>
    apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/customer/${customerId}`),
  getInteractionsByAgent: (agentId: string | number) =>
    apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/agent/${agentId}`),
  sendSupervisorMessage: (agentId: string, agentName: string, subject: string, body: string) =>
    apiPost<Record<string, unknown>>('/api/v1/notifications/send-direct', {
      channel: 'IN_APP',
      recipientAddress: agentId,
      recipientName: agentName,
      subject,
      body,
      eventType: 'SUPERVISOR_MESSAGE',
    }),
};
