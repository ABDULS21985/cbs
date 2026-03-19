import { apiGet, apiPost } from '@/lib/api';
import type { ExecutionQuality, OrderExecution } from '../types/orderExecution';

export const orderExecutionsApi = {
  /** POST /v1/order-executions/{ref}/bust */
  bustExecution: (ref: string) =>
    apiPost<OrderExecution>(`/api/v1/order-executions/${ref}/bust`),

  /** POST /v1/order-executions/quality */
  analyzeExecutionQuality: (data: Partial<ExecutionQuality>) =>
    apiPost<ExecutionQuality>('/api/v1/order-executions/quality', data),

  /** GET /v1/order-executions/order/{orderId}/quality */
  getBestExecutionReport: (orderId: number) =>
    apiGet<ExecutionQuality[]>(`/api/v1/order-executions/order/${orderId}/quality`),

};
