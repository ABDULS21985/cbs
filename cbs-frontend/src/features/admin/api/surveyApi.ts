import { apiGet, apiPost } from '@/lib/api';
import type { CustomerSurvey, SurveyResponse } from '../types/survey';

export const surveysApi = {
  /** POST /v1/surveys — create new survey */
  createSurvey: (data: Partial<CustomerSurvey>) =>
    apiPost<CustomerSurvey>('/api/v1/surveys', data),

  /** POST /v1/surveys/{code}/launch */
  launchSurvey: (code: string, data: Partial<CustomerSurvey>) =>
    apiPost<CustomerSurvey>(`/api/v1/surveys/${code}/launch`, data),

  /** POST /v1/surveys/{code}/respond */
  respond: (code: string, data: Partial<SurveyResponse>) =>
    apiPost<SurveyResponse>(`/api/v1/surveys/${code}/respond`, data),

  /** POST /v1/surveys/{code}/respond */
  submitResponse: (code: string, data: Partial<SurveyResponse>) =>
    apiPost<SurveyResponse>(`/api/v1/surveys/${code}/respond`, data),

  /** POST /v1/surveys/{code}/close — alias for close */
  closeSurvey: (code: string) =>
    apiPost<CustomerSurvey>(`/api/v1/surveys/${code}/close`),

  /** GET /v1/surveys/type/{type} */
  getByType: (type: string) =>
    apiGet<CustomerSurvey[]>(`/api/v1/surveys/type/${type}`),

  /** GET /v1/surveys/{code}/responses */
  getResponses: (code: string) =>
    apiGet<SurveyResponse[]>(`/api/v1/surveys/${code}/responses`),

};
