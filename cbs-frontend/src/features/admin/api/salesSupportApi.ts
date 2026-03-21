import { apiGet, apiPost } from '@/lib/api';
import type { SalesCollateral, SalesKnowledgeArticle } from '../types/salesSupport';

export const salesSupportApi = {
  /** POST /v1/sales-support/articles */
  createArticle: (data: Partial<SalesKnowledgeArticle>) =>
    apiPost<SalesKnowledgeArticle>('/api/v1/sales-support/articles', data),

  /** POST /v1/sales-support/articles/{code}/publish */
  createArticle2: (code: string, data: Partial<SalesKnowledgeArticle>) =>
    apiPost<SalesKnowledgeArticle>(`/api/v1/sales-support/articles/${code}/publish`, data),

  /** POST /v1/sales-support/collateral */
  createCollateral: (data: Partial<SalesCollateral>) =>
    apiPost<SalesCollateral>('/api/v1/sales-support/collateral', data),

  /** POST /v1/sales-support/collateral/{code}/publish */
  createCollateral2: (code: string, data: Partial<SalesCollateral>) =>
    apiPost<SalesCollateral>(`/api/v1/sales-support/collateral/${code}/publish`, data),

  /** GET /v1/sales-support/articles */
  searchArticles: (params?: Record<string, unknown>) =>
    apiGet<SalesKnowledgeArticle[]>('/api/v1/sales-support/articles', params),

  /** GET /v1/sales-support/collateral */
  searchCollateral: (params?: Record<string, unknown>) =>
    apiGet<SalesCollateral[]>('/api/v1/sales-support/collateral', params),

  /** POST /v1/sales-support/articles/{code}/view */
  recordView: (code: string) =>
    apiPost<SalesKnowledgeArticle>(`/api/v1/sales-support/articles/${code}/view`),

};
