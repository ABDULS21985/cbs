import { apiGet, apiPost } from '@/lib/api';
import type { SyndicateDrawdown, SyndicateParticipant, SyndicatedLoanFacility } from '../types/syndicatedLoan';

export const syndicatedLoansApi = {
  /** POST /v1/syndicated-loans/{code}/participants */
  addParticipant: (code: string, data: Partial<SyndicateParticipant>) =>
    apiPost<SyndicateParticipant>(`/api/v1/syndicated-loans/${code}/participants`, data),

  /** POST /v1/syndicated-loans/{code}/drawdowns */
  requestDrawdown: (code: string, data: Partial<SyndicateDrawdown>) =>
    apiPost<SyndicateDrawdown>(`/api/v1/syndicated-loans/${code}/drawdowns`, data),

  /** POST /v1/syndicated-loans/drawdowns/{ref}/fund */
  fundDrawdown: (ref: string) =>
    apiPost<SyndicateDrawdown>(`/api/v1/syndicated-loans/drawdowns/${ref}/fund`),

  /** GET /v1/syndicated-loans/role/{role} */
  getByRole: (role: string) =>
    apiGet<SyndicatedLoanFacility[]>(`/api/v1/syndicated-loans/role/${role}`),

  /** GET /v1/syndicated-loans/{code}/participants */
  getParticipants: (code: string) =>
    apiGet<SyndicateParticipant[]>(`/api/v1/syndicated-loans/${code}/participants`),

  /** GET /v1/syndicated-loans/{code}/drawdowns */
  getDrawdowns: (code: string) =>
    apiGet<SyndicateDrawdown[]>(`/api/v1/syndicated-loans/${code}/drawdowns`),

};
