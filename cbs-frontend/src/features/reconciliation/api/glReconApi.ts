import { apiGet, apiPost } from '@/lib/api';
import type { SubledgerReconRun } from '../types/nostro';

export const glReconApi = {
  /**
   * POST /v1/gl/reconciliation — Run sub-ledger reconciliation.
   * Admin only.
   */
  runReconciliation: (params: {
    subledgerType: string;
    glCode: string;
    reconDate: string;
    branchCode?: string;
    currencyCode?: string;
  }) => {
    const qp = new URLSearchParams();
    qp.set('subledgerType', params.subledgerType);
    qp.set('glCode', params.glCode);
    qp.set('reconDate', params.reconDate);
    if (params.branchCode) qp.set('branchCode', params.branchCode);
    if (params.currencyCode) qp.set('currencyCode', params.currencyCode);
    return apiPost<SubledgerReconRun>(`/api/v1/gl/reconciliation?${qp.toString()}`);
  },

  /**
   * GET /v1/gl/reconciliation/{date} — Get reconciliation results for a date.
   */
  getReconResultsByDate: (date: string) =>
    apiGet<SubledgerReconRun[]>(`/api/v1/gl/reconciliation/${date}`),

  /**
   * GET /v1/gl/reconciliation — List all reconciliation runs (paginated).
   */
  listReconRuns: (params?: { page?: number; size?: number }) =>
    apiGet<SubledgerReconRun[]>('/api/v1/gl/reconciliation', params),
};
