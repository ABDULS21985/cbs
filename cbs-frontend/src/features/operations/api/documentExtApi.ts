import { apiGet, apiPost } from '@/lib/api';
import type { Document, TradeDocument } from '../types/document';

export const documentsApi = {
  /** POST /documents/{id}/verify */
  verifyDocument: (id: number) =>
    apiPost<TradeDocument>(`/api/documents/${id}/verify`),

  /** GET /documents/lc/{lcId} */
  getLcDocuments: (lcId: number) =>
    apiGet<TradeDocument[]>(`/api/documents/lc/${lcId}`),

  /** GET /v1/documents/customer/{customerId} */
  getCustomerDocs: (customerId: number) =>
    apiGet<Document[]>(`/api/v1/documents/customer/${customerId}`),

};
