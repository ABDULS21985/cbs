import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { GuidedFlow, HelpArticle } from '../types/help';

export const helpApi = {
  /** GET /v1/help/articles — list all articles */
  listArticles: () =>
    apiGet<HelpArticle[]>('/api/v1/help/articles'),

  /** POST /v1/help/articles */
  createArticle: (data: Partial<HelpArticle>) =>
    apiPost<HelpArticle>('/api/v1/help/articles', data),

  /** POST /v1/help/articles/{code}/publish */
  publishArticle: (code: string) =>
    apiPost<HelpArticle>(`/api/v1/help/articles/${code}/publish`),

  /** POST /v1/help/articles/{code}/view */
  recordView: (code: string) =>
    apiPost<HelpArticle>(`/api/v1/help/articles/${code}/view`),

  /** POST /v1/help/articles/{code}/helpfulness?helpful=... */
  recordHelpfulness: (code: string, helpful: boolean) =>
    apiPostParams<HelpArticle>(`/api/v1/help/articles/${code}/helpfulness`, { helpful }),

  /** GET /v1/help/articles/search?category=...&productFamily=... */
  searchArticles: (params?: Record<string, unknown>) =>
    apiGet<HelpArticle[]>('/api/v1/help/articles/search', params),

  /** GET /v1/help/flows — list all guided flows */
  listFlows: () =>
    apiGet<GuidedFlow[]>('/api/v1/help/flows'),

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
