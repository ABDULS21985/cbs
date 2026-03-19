import { apiGet } from '@/lib/api';
import type { ModelLifecycleEvent } from '../types/modelOps';

export const modelOpsApi = {
  /** GET /v1/model-ops/model/{code} */
  record: (code: string) =>
    apiGet<ModelLifecycleEvent>(`/api/v1/model-ops/model/${code}`),

  /** GET /v1/model-ops/alerts */
  getAlerts: (params?: Record<string, unknown>) =>
    apiGet<ModelLifecycleEvent[]>('/api/v1/model-ops/alerts', params),

};
