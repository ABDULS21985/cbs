import { apiGet, apiPost } from '@/lib/api';
import type { ProgramExecution, TradingStrategy } from '../types/programTrading';

export const programTradingApi = {
  /** POST /v1/program-trading/strategies */
  defineStrategy: (data: Partial<TradingStrategy>) =>
    apiPost<TradingStrategy>('/api/v1/program-trading/strategies', data),

  /** POST /v1/program-trading/strategies/{code}/execute */
  launchExecution: (code: string, data: Partial<ProgramExecution>) =>
    apiPost<ProgramExecution>(`/api/v1/program-trading/strategies/${code}/execute`, data),

  /** POST /v1/program-trading/executions/{ref}/pause */
  pauseExecution: (ref: string) =>
    apiPost<ProgramExecution>(`/api/v1/program-trading/executions/${ref}/pause`),

  /** POST /v1/program-trading/executions/{ref}/resume */
  resumeExecution: (ref: string) =>
    apiPost<ProgramExecution>(`/api/v1/program-trading/executions/${ref}/resume`),

  /** POST /v1/program-trading/executions/{ref}/cancel */
  cancelExecution: (ref: string) =>
    apiPost<ProgramExecution>(`/api/v1/program-trading/executions/${ref}/cancel`),

  /** GET /v1/program-trading/strategies/{code}/slippage */
  getSlippageReport: (code: string) =>
    apiGet<ProgramExecution[]>(`/api/v1/program-trading/strategies/${code}/slippage`),

};
