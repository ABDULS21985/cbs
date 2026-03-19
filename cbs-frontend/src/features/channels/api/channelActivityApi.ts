import { apiGet, apiPost } from '@/lib/api';
import type { ChannelActivityLog, ChannelActivitySummary } from '../types/channelActivity';

export const channelActivityApi = {
  /** POST /v1/channel-activity/log */
  log: (data: Partial<ChannelActivityLog>) =>
    apiPost<ChannelActivityLog>('/api/v1/channel-activity/log', data),

  /** GET /v1/channel-activity/customer/{id} */
  getCustomerActivity: (id: number) =>
    apiGet<ChannelActivityLog[]>(`/api/v1/channel-activity/customer/${id}`),

  /** POST /v1/channel-activity/summarize */
  summarize: () =>
    apiPost<ChannelActivitySummary>('/api/v1/channel-activity/summarize'),

};
