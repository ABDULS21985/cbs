import { apiGet, apiPost } from '@/lib/api';
import type { MarginCall, CollateralPosition } from '../types/creditMargin';

export const creditMarginApi = {
  listMarginCalls: () => apiGet<MarginCall[]>('/api/v1/credit-margin/margin-calls').catch(() => []),
  listCollateralPositions: () => apiGet<CollateralPosition[]>('/api/v1/credit-margin/collateral').catch(() => []),
  issueMarginCall: (data: Partial<MarginCall>) => apiPost<MarginCall>('/api/v1/credit-margin/margin-calls', data),
  acknowledgeCall: (ref: string) => apiPost<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}/acknowledge`),
  settleCall: (ref: string, agreedAmount: number, collateralType: string) =>
    apiPost<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}/settle`, { agreedAmount, collateralType }),
  recordCollateral: (data: Partial<CollateralPosition>) => apiPost<CollateralPosition>('/api/v1/credit-margin/collateral', data),
  getByCounterparty: (code: string) => apiGet<MarginCall[]>(`/api/v1/credit-margin/margin-calls/counterparty/${code}`).catch(() => []),
  getOpenCalls: () => apiGet<MarginCall[]>('/api/v1/credit-margin/margin-calls/open').catch(() => []),
  getCallByRef: (ref: string) => apiGet<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}`),
};
