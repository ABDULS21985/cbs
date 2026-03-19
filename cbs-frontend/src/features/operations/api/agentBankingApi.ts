import { apiGet, apiPost } from '@/lib/api';
import type { AgentTransaction, BankingAgent } from '../types/agentBanking';

export const agentsApi = {
  /** GET /v1/agents/{agentCode} */
  getAgent: (agentCode: string) =>
    apiGet<BankingAgent>(`/api/v1/agents/${agentCode}`),

  /** POST /v1/agents/{agentCode}/transact */
  transact: (agentCode: string) =>
    apiPost<AgentTransaction>(`/api/v1/agents/${agentCode}/transact`),

  /** POST /v1/agents/{agentCode}/float-topup */
  topUpFloat: (agentCode: string) =>
    apiPost<BankingAgent>(`/api/v1/agents/${agentCode}/float-topup`),

  /** GET /v1/agents/{agentId}/transactions */
  getTransactions: (agentId: number) =>
    apiGet<AgentTransaction[]>(`/api/v1/agents/${agentId}/transactions`),

};
