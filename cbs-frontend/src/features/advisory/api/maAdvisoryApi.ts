import { apiPost } from '@/lib/api';
import type { MaEngagement } from '../types/maAdvisory';

export const maAdvisoryApi = {
  /** POST /v1/ma-advisory/{code}/terminate */
  terminate: (code: string) =>
    apiPost<MaEngagement>(`/api/v1/ma-advisory/${code}/terminate`),

};
