import { apiGet, apiPost } from '@/lib/api';
import type { CustomerSurvey, SurveyResponse } from '../types/survey';

export const surveysApi = {
  /** POST /v1/surveys/{code}/launch */
  create: (code: string, data: Partial<CustomerSurvey>) =>
    apiPost<CustomerSurvey>(`/api/v1/surveys/${code}/launch`, data),

  /** POST /v1/surveys/{code}/respond */
  respond: (code: string, data: Partial<SurveyResponse>) =>
    apiPost<SurveyResponse>(`/api/v1/surveys/${code}/respond`, data),

  /** POST /v1/surveys/{code}/close */
  respond2: (code: string, data: Partial<SurveyResponse>) =>
    apiPost<SurveyResponse>(`/api/v1/surveys/${code}/close`, data),

  /** GET /v1/surveys/type/{type} */
  getByType: (type: string) =>
    apiGet<CustomerSurvey[]>(`/api/v1/surveys/type/${type}`),

  /** GET /v1/surveys/{code}/responses */
  getByType2: (code: string) =>
    apiGet<CustomerSurvey[]>(`/api/v1/surveys/${code}/responses`),

};
