// Auto-generated from backend entities

export interface AgentTransaction {
  id: number;
  agentId: number;
  transactionType: string;
  customerId: number;
  accountId: number;
  amount: number;
  commissionAmount: number;
  currencyCode: string;
  reference: string;
  status: string;
  geoLatitude: number;
  geoLongitude: number;
  createdAt: string;
  version: number;
}

export interface BankingAgent {
  id: number;
  agentCode: string;
  agentName: string;
  agentType: string;
  customerId: number;
  address: string;
  city: string;
  stateProvince: string;
  countryCode: string;
  geoLatitude: number;
  geoLongitude: number;
  floatAccountId: number;
  commissionAccountId: number;
  floatBalance: number;
  minFloatBalance: number;
  commissionModel: string;
  commissionRate: number;
  dailyTxnLimit: number;
  singleTxnLimit: number;
  monthlyTxnLimit: number;
  parentAgentCode: string;
  branchCode: string;
  status: string;
  onboardedDate: string;
  lastTransactionDate: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

