import { apiGet, apiPost } from '@/lib/api';
import type { ContactCenter, ContactInteraction } from '../types/contactCenterExt';

export const contactCenterApi = {
  /** POST /v1/contact-center/interactions */
  create: (data: Partial<ContactCenter>) =>
    apiPost<ContactCenter>('/api/v1/contact-center/interactions', data),

  /** POST /v1/contact-center/interactions/{id}/assign */
  assign: (id: number) =>
    apiPost<ContactInteraction>(`/api/v1/contact-center/interactions/${id}/assign`),

  /** POST /v1/contact-center/interactions/{id}/complete */
  assign2: (id: number) =>
    apiPost<ContactInteraction>(`/api/v1/contact-center/interactions/${id}/complete`),

  /** GET /v1/contact-center/interactions/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/customer/${customerId}`),

  /** GET /v1/contact-center/interactions/agent/{agentId} */
  byCustomer2: (agentId: number) =>
    apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/agent/${agentId}`),

};
