import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { DialogueMessage, DialogueSession } from '../types/dialogue';

export const dialogueApi = {
  /** POST /v1/dialogue — start a new session */
  startSession: (data: Partial<DialogueSession>) =>
    apiPost<DialogueSession>('/api/v1/dialogue', data),

  /** GET /v1/dialogue/sessions — list all sessions */
  listSessions: (params?: Record<string, unknown>) =>
    apiGet<DialogueSession[]>('/api/v1/dialogue/sessions', params),

  /** POST /v1/dialogue/{code}/messages */
  addMessage: (code: string, data: Partial<DialogueMessage>) =>
    apiPost<DialogueMessage>(`/api/v1/dialogue/${code}/messages`, data),

  /** GET /v1/dialogue/{code}/messages — get messages for a session */
  getMessages: (code: string) =>
    apiGet<DialogueMessage[]>(`/api/v1/dialogue/${code}/messages`),

  /** POST /v1/dialogue/{code}/escalate?agentId=... */
  escalateToHuman: (code: string, agentId: string) =>
    apiPostParams<DialogueSession>(`/api/v1/dialogue/${code}/escalate`, { agentId }),

  /** POST /v1/dialogue/{code}/end?resolutionStatus=... */
  endSession: (code: string, resolutionStatus: string = 'RESOLVED') =>
    apiPostParams<DialogueSession>(`/api/v1/dialogue/${code}/end`, { resolutionStatus }),

  /** GET /v1/dialogue/customer/{id} */
  getCustomerSessions: (id: number) =>
    apiGet<DialogueSession[]>(`/api/v1/dialogue/customer/${id}`),
};
