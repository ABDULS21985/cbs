import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { AgentState, CallbackRequest, ContactQueue, RoutingRule } from '../types/contactRouting';

export const contactRoutingApi = {
  /** POST /v1/contact-routing/rules */
  createRule: (data: Partial<RoutingRule>) =>
    apiPost<RoutingRule>('/api/v1/contact-routing/rules', data),

  /** GET /v1/contact-routing/rules */
  listActiveRules: (params?: Record<string, unknown>) =>
    apiGet<RoutingRule[]>('/api/v1/contact-routing/rules', params),

  /** POST /v1/contact-routing/route */
  routeContact: () =>
    apiPost<Record<string, unknown>>('/api/v1/contact-routing/route'),

  /** PUT /v1/contact-routing/agents/{agentId}/state */
  updateAgentState: (agentId: string | number, newState: string) =>
    apiPut<AgentState>(`/api/v1/contact-routing/agents/${agentId}/state?newState=${encodeURIComponent(newState)}`),

  /** GET /v1/contact-routing/agents/{agentId} */
  getAgentById: (agentId: string | number) =>
    apiGet<AgentState>(`/api/v1/contact-routing/agents/${agentId}`),

  /** GET /v1/contact-routing/agents/center/{centerId} */
  getAgentPerformance: (centerId: number) =>
    apiGet<AgentState[]>(`/api/v1/contact-routing/agents/center/${centerId}`),

  /** POST /v1/contact-routing/callbacks */
  requestCallback: (data: Partial<CallbackRequest>) =>
    apiPost<CallbackRequest>('/api/v1/contact-routing/callbacks', data),

  /** POST /v1/contact-routing/callbacks/{id}/attempt */
  attemptCallback: (id: number) =>
    apiPost<CallbackRequest>(`/api/v1/contact-routing/callbacks/${id}/attempt`),

  /** GET /v1/contact-routing/queues/center/{centerId} */
  getQueueDashboard: (centerId: number) =>
    apiGet<ContactQueue[]>(`/api/v1/contact-routing/queues/center/${centerId}`),

};
