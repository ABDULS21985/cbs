import { apiGet, apiPost } from '@/lib/api';
import type { GuidelineAssessment } from '../types/guideline';

export const guidelineAssessmentsApi = {
  /** POST /v1/guideline-assessments/{code}/complete */
  complete: (code: string) =>
    apiPost<GuidelineAssessment>(`/api/v1/guideline-assessments/${code}/complete`),

  /** GET /v1/guideline-assessments/source/{source} */
  getBySource: (source: string) =>
    apiGet<GuidelineAssessment[]>(`/api/v1/guideline-assessments/source/${source}`),

  /** GET /v1/guideline-assessments/rating/{rating} */
  getByRating: (rating: string) =>
    apiGet<GuidelineAssessment[]>(`/api/v1/guideline-assessments/rating/${rating}`),

};
