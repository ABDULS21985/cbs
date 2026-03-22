import { apiGet, apiPost } from '@/lib/api';
import type { AgentTransaction, BankingAgent } from '../types/agentBanking';

export const agentsApi = {
  /** GET /v1/agents — list all agents with optional status filter */
  getAll: (params?: { status?: string; page?: number; size?: number }) =>
    apiGet<BankingAgent[]>('/api/v1/agents', params),

  /** GET /v1/agents/{agentCode} */
  getAgent: (agentCode: string) =>
    apiGet<BankingAgent>(`/api/v1/agents/${agentCode}`),

  /** POST /v1/agents — onboard a new agent */
  onboard: (data: Partial<BankingAgent>) =>
    apiPost<BankingAgent>('/api/v1/agents', data),

  /** POST /v1/agents/{agentCode}/transact */
  transact: (agentCode: string, params: {
    transactionType: string; amount: number;
    customerId?: number; accountId?: number;
    currencyCode?: string;
  }) =>
    apiPost<AgentTransaction>(`/api/v1/agents/${agentCode}/transact`, undefined, { params }),

  /** POST /v1/agents/{agentCode}/float-topup */
  topUpFloat: (agentCode: string, amount: number) =>
    apiPost<BankingAgent>(`/api/v1/agents/${agentCode}/float-topup`, undefined, {
      params: { amount },
    }),

  /** GET /v1/agents/{agentId}/transactions */
  getTransactions: (agentId: number, page = 0, size = 20) =>
    apiGet<AgentTransaction[]>(`/api/v1/agents/${agentId}/transactions`, { page, size }),

};
