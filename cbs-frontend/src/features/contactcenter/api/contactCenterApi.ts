import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { ContactCenter, ContactInteraction } from '../types/contactCenterExt';
import type { CallbackRequest } from '../types/contactRouting';

export interface AgentState {
  agentId: string; agentName: string;
  state: 'AVAILABLE' | 'ON_CALL' | 'BUSY' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';
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
  fcr: boolean; sentiment: string;
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
  // ─── Centers ─────────────────────────────────────────────────────────────────
  /** GET /v1/contact-center — list all configured centers */
  getCenters: () =>
    apiGet<ContactCenter[]>('/api/v1/contact-center'),
  /** POST /v1/contact-center — create a new center */
  createCenter: (data: Partial<ContactCenter>) =>
    apiPost<ContactCenter>('/api/v1/contact-center', data),
  /** PUT /v1/contact-center/{id} — update center configuration */
  updateCenter: (id: number, data: Partial<ContactCenter>) =>
    apiPut<ContactCenter>(`/api/v1/contact-center/${id}`, data),
  /** POST /v1/contact-center/{id}/deactivate — deactivate a center */
  deactivateCenter: (id: number) =>
    apiPost<ContactCenter>(`/api/v1/contact-center/${id}/deactivate`),

  // ─── Agents & Queues ─────────────────────────────────────────────────────────
  getMyAgent: () => apiGet<BackendAgentState | null>('/api/v1/contact-center/agents/me').then((a) => a ? mapAgentState(a) : null),
  getAgentStates: () => apiGet<BackendAgentState[]>('/api/v1/contact-center/agents').then((agents) => agents.map(mapAgentState)),
  updateAgentState: (agentId: string, state: string) => apiPut<void>(`/api/v1/contact-routing/agents/${agentId}/state?newState=${encodeURIComponent(state)}`),
  getQueueStatus: () => apiGet<BackendQueueStatus[]>('/api/v1/contact-center/queues').then((queues) => queues.map(mapQueueStatus)),

  getCustomerProfile: (customerId: number) => apiGet<CustomerMiniProfile>(`/api/v1/customers/${customerId}/mini-profile`),
  getCustomerByPhone: (phone: string) => apiGet<CustomerMiniProfile>(`/api/v1/customers/lookup`, { phone }),

  // ─── Interactions ────────────────────────────────────────────────────────────
  /** GET /v1/contact-center/interactions — all interactions */
  getAllInteractions: () =>
    apiGet<ContactInteraction[]>('/api/v1/contact-center/interactions'),
  /** POST /v1/contact-center/interactions — start a new interaction */
  createInteraction: (data: Record<string, unknown>) =>
    apiPost<ContactInteraction>('/api/v1/contact-center/interactions', data),
  /** POST /v1/contact-center/interactions/{id}/assign?agentId=... */
  assignInteraction: (id: string, agentId: string) =>
    apiPost<ContactInteraction>(`/api/v1/contact-center/interactions/${id}/assign?agentId=${encodeURIComponent(agentId)}`),
  /** POST /v1/contact-center/interactions/{id}/complete?disposition=...&sentiment=...&notes=...&fcr=... */
  completeInteraction: (id: string, disposition: string, sentiment?: string, notes?: string, fcr?: boolean) => {
    const params = new URLSearchParams({ disposition });
    if (sentiment) params.set('sentiment', sentiment);
    if (notes) params.set('notes', notes);
    if (fcr !== undefined) params.set('fcr', String(fcr));
    return apiPost<ContactInteraction>(`/api/v1/contact-center/interactions/${id}/complete?${params.toString()}`);
  },
  getInteractionsByCustomer: (customerId: number) =>
    apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/customer/${customerId}`),
  getInteractionsByAgent: (agentId: string | number) =>
    apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/agent/${agentId}`),

  // ─── Callbacks ───────────────────────────────────────────────────────────────
  /** GET /v1/contact-center/callbacks */
  getCallbacks: () =>
    apiGet<CallbackRequest[]>('/api/v1/contact-center/callbacks'),

  // ─── Supervisor ──────────────────────────────────────────────────────────────
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
