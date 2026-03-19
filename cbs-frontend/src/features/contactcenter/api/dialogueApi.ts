import { apiGet, apiPost } from '@/lib/api';
import type { DialogueMessage, DialogueSession } from '../types/dialogue';

export const dialogueApi = {
  /** POST /v1/dialogue/{code}/messages */
  addMessage: (code: string, data: Partial<DialogueMessage>) =>
    apiPost<DialogueMessage>(`/api/v1/dialogue/${code}/messages`, data),

  /** POST /v1/dialogue/{code}/escalate */
  escalateToHuman: (code: string) =>
    apiPost<DialogueSession>(`/api/v1/dialogue/${code}/escalate`),

  /** POST /v1/dialogue/{code}/end */
  endSession: (code: string) =>
    apiPost<DialogueSession>(`/api/v1/dialogue/${code}/end`),

  /** GET /v1/dialogue/customer/{id} */
  getCustomerSessions: (id: number) =>
    apiGet<DialogueSession[]>(`/api/v1/dialogue/customer/${id}`),

};
