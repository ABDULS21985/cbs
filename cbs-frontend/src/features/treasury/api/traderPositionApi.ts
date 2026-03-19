import { apiPost } from '@/lib/api';
import type { TraderPosition, TraderPositionLimit } from '../types/traderPosition';

export const traderPositionsApi = {
  /** POST /v1/trader-positions/update */
  updatePosition: (data: Partial<TraderPosition>) =>
    apiPost<TraderPosition>('/api/v1/trader-positions/update', data),

  /** POST /v1/trader-positions/limits */
  setLimit: (data: Partial<TraderPositionLimit>) =>
    apiPost<TraderPositionLimit>('/api/v1/trader-positions/limits', data),

};
