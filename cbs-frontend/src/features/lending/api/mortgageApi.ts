import api, { apiGet } from '@/lib/api';
import type { MortgageLoan, LtvPoint } from '../types/mortgage';

interface BackendMortgageLoan {
  id: number;
  mortgageNumber: string;
  customerId: number;
  accountId: number;
  mortgageType?: string | null;
  repaymentType?: string | null;
  rateType?: string | null;
  propertyAddress: string;
  propertyType: string;
  propertyValuation?: number | null;
  principalAmount?: number | null;
  currentBalance?: number | null;
  currency?: string | null;
  ltvAtOrigination?: number | null;
  currentLtv?: number | null;
  interestRate?: number | null;
  termMonths?: number | null;
  remainingMonths?: number | null;
  monthlyPayment?: number | null;
  titleInsuranceRef?: string | null;
  buildingInsuranceRef?: string | null;
  fixedRateEndDate?: string | null;
  reversionRate?: number | null;
  earlyRepaymentCharge?: number | null;
  ercEndDate?: string | null;
  status: string;
  completionDate?: string | null;
  firstPaymentDate?: string | null;
  maturityDate?: string | null;
  annualOverpaymentPct?: number | null;
  overpaymentsYtd?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface MortgageDocument {
  id: number;
  documentRef: string;
  documentType: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number | null;
  storagePath: string;
  description?: string | null;
  verificationStatus: string;
  createdAt: string;
}

export interface MortgageDocumentUploadInput {
  file: File;
  type: string;
  description?: string;
}

type MortgageLoanView = MortgageLoan & Partial<BackendMortgageLoan>;

function mapMortgage(loan: BackendMortgageLoan): MortgageLoanView {
  const propertyValue = loan.propertyValuation ?? 0;
  const outstandingBalance = loan.currentBalance ?? 0;
  const ltv = loan.currentLtv ?? loan.ltvAtOrigination ?? 0;

  return {
    ...loan,
    loanNumber: loan.mortgageNumber,
    customerName: `Customer ${loan.customerId}`,
    propertyAddress: loan.propertyAddress,
    propertyType: (loan.propertyType as MortgageLoan['propertyType']) ?? 'RESIDENTIAL',
    disbursedAmount: loan.principalAmount ?? outstandingBalance,
    ltv,
    rate: loan.interestRate ?? 0,
    tenorMonths: loan.termMonths ?? 0,
    outstandingBalance,
    dpd: loan.status === 'ARREARS' ? 30 : loan.status === 'DEFAULT' ? 91 : 0,
    status: loan.status,
    currency: loan.currency ?? 'NGN',
    propertyValue,
    propertyTitle: loan.titleInsuranceRef ?? loan.buildingInsuranceRef ?? loan.mortgageNumber,
    insuranceStatus: loan.titleInsuranceRef || loan.buildingInsuranceRef ? 'ACTIVE' : 'PENDING',
    disbursementType: 'LUMP_SUM',
  };
}

export const mortgageApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<BackendMortgageLoan[]>('/api/v1/mortgages', params).then((loans) => loans.map(mapMortgage)),

  getById: (id: number) => apiGet<BackendMortgageLoan>(`/api/v1/mortgages/${id}`).then(mapMortgage),

  getLtvHistory: (id: number) => apiGet<LtvPoint[]>(`/api/v1/mortgages/${id}/ltv-history`),

  listDocuments: (id: number) =>
    apiGet<MortgageDocument[]>(`/api/v1/mortgages/${id}/documents`),

  uploadDocument: async (id: number, input: MortgageDocumentUploadInput) => {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('type', input.type);
    if (input.description?.trim()) {
      formData.append('description', input.description.trim());
    }
    const { data } = await api.post(`/api/v1/mortgages/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data as MortgageDocument;
  },
};
