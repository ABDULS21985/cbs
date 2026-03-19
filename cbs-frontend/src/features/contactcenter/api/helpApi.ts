import { apiGet, apiPost } from '@/lib/api';
import type { GuidedFlow, HelpArticle } from '../types/help';

export const helpApi = {
  /** POST /v1/help/articles */
  createArticle: (data: Partial<HelpArticle>) =>
    apiPost<HelpArticle>('/api/v1/help/articles', data),

  /** POST /v1/help/articles/{code}/publish */
  publishArticle: (code: string) =>
    apiPost<HelpArticle>(`/api/v1/help/articles/${code}/publish`),

  /** POST /v1/help/articles/{code}/view */
  recordView: (code: string) =>
    apiPost<HelpArticle>(`/api/v1/help/articles/${code}/view`),

  /** POST /v1/help/articles/{code}/helpfulness */
  recordHelpfulness: (code: string) =>
    apiPost<HelpArticle>(`/api/v1/help/articles/${code}/helpfulness`),

  /** GET /v1/help/articles/search */
  searchArticles: (params?: Record<string, unknown>) =>
    apiGet<HelpArticle[]>('/api/v1/help/articles/search', params),

  /** POST /v1/help/flows */
  createFlow: (data: Partial<GuidedFlow>) =>
    apiPost<GuidedFlow>('/api/v1/help/flows', data),

  /** POST /v1/help/flows/{code}/activate */
  activateFlow: (code: string) =>
    apiPost<GuidedFlow>(`/api/v1/help/flows/${code}/activate`),

  /** POST /v1/help/flows/{code}/start */
  startFlow: (code: string) =>
    apiPost<GuidedFlow>(`/api/v1/help/flows/${code}/start`),

};
