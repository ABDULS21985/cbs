import { apiGet, apiPost } from '@/lib/api';

export interface LetterOfCredit {
  id: number; lcNumber: string; lcType: string;
  applicantName: string; beneficiaryName: string;
  amount: number; currency: string;
  issueDate: string; expiryDate: string;
  goodsDescription: string; status: string;
}

export interface BankGuarantee {
  id: number; bgNumber: string; bgType: string;
  applicantName: string; beneficiaryName: string;
  amount: number; currency: string;
  issueDate: string; expiryDate: string;
  claimStatus: string; status: string;
}

export interface DocumentaryCollection {
  id: number; collectionRef: string;
  drawerName: string; draweeName: string;
  amount: number; currency: string; status: string;
}

export const tradeFinanceApi = {
  getLcs: (filters?: Record<string, unknown>) => apiGet<LetterOfCredit[]>('/api/v1/trade-finance/lc', filters),
  getLc: (id: number) => apiGet<LetterOfCredit>(`/api/v1/trade-finance/lc/${id}`),
  createLc: (data: Record<string, unknown>) => apiPost<LetterOfCredit>('/api/v1/trade-finance/lc', data),

  getGuarantees: (filters?: Record<string, unknown>) => apiGet<BankGuarantee[]>('/api/v1/trade-finance/guarantees', filters),
  getGuarantee: (id: number) => apiGet<BankGuarantee>(`/api/v1/trade-finance/guarantees/${id}`),

  getCollections: () => apiGet<DocumentaryCollection[]>('/api/v1/trade-finance/collections'),
};
