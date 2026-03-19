import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { AtmJournalEntry, AtmTerminal } from '../types/atm';

export const atmApi = {
  /** POST /v1/atm/terminals */
  register: (data: Partial<AtmTerminal>) =>
    apiPost<AtmTerminal>('/api/v1/atm/terminals', data),

  /** GET /v1/atm/terminals/{terminalId} */
  getTerminal: (terminalId: number) =>
    apiGet<AtmTerminal>(`/api/v1/atm/terminals/${terminalId}`),

  /** GET /v1/atm/terminals/status/{status} */
  getByStatus: (status: string) =>
    apiGet<AtmTerminal[]>(`/api/v1/atm/terminals/status/${status}`),

  /** GET /v1/atm/terminals/branch/{branchCode} */
  getBranchTerminals: (branchCode: string) =>
    apiGet<AtmTerminal[]>(`/api/v1/atm/terminals/branch/${branchCode}`),

  /** PATCH /v1/atm/terminals/{terminalId}/status */
  updateStatus: (terminalId: number) =>
    apiPatch<AtmTerminal>(`/api/v1/atm/terminals/${terminalId}/status`),

  /** GET /v1/atm/terminals/{terminalId}/journal */
  getJournal: (terminalId: number) =>
    apiGet<AtmJournalEntry[]>(`/api/v1/atm/terminals/${terminalId}/journal`),

};
