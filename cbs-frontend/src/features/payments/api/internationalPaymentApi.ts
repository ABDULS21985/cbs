import { apiGet, apiPost, apiUpload } from '@/lib/api';
import { mapFxRate, type BackendFxRate, type FxRate } from './paymentApi';

export interface InternationalCharges {
  transferFee: number;
  swiftCharge: number;
  correspondentFee: number;
  correspondentFeeCurrency: string;
  regulatoryLevy: number;
  totalChargesLocal: number;
  totalChargesForeign: number;
  totalChargesForeignCurrency: string;
}

export interface ComplianceCheck {
  checkType: string;
  label: string;
  status: 'CLEAR' | 'FLAG' | 'BLOCK';
  message: string;
}

export interface InternationalTransferRequest {
  fromAccountId: number;
  sendingCurrency: string;
  sendingAmount: number;
  receivingCurrency: string;
  beneficiaryName: string;
  beneficiaryAccountIban: string;
  beneficiaryBankName: string;
  beneficiarySwiftBic: string;
  beneficiaryBankAddress?: string;
  beneficiaryCountry: string;
  purpose: string;
  purposeDescription: string;
  sourceOfFunds: string;
  chargeType: 'OUR' | 'SHA' | 'BEN';
  supportingDocumentId?: number;
}

export interface InternationalTransferResponse {
  id: number;
  transactionRef: string;
  status: 'PROCESSING' | 'SENT_TO_CORRESPONDENT' | 'CREDITED' | 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL';
  sendingAmount: number;
  sendingCurrency: string;
  receivingAmount: number;
  receivingCurrency: string;
  exchangeRate: number;
  charges: InternationalCharges;
  complianceChecks: ComplianceCheck[];
  swiftMessage?: string;
  timeline: TransferTimelineEntry[];
  createdAt: string;
}

export interface TransferTimelineEntry {
  status: string;
  label: string;
  timestamp?: string;
  isComplete: boolean;
  isCurrent: boolean;
}

export const internationalPaymentApi = {
  getFxRate: async (fromCurrency: string, toCurrency: string): Promise<FxRate | null> => {
    const rates = await apiGet<BackendFxRate[] | BackendFxRate>('/api/v1/fx/rate', { fromCurrency, toCurrency });
    const rawRate = Array.isArray(rates) ? rates[0] : rates;
    return rawRate ? mapFxRate(rawRate) : null;
  },
  previewCharges: (amount: number, currency: string, chargeType: string) =>
    apiGet<InternationalCharges>('/api/v1/payments/international/charges', {
      amount,
      sourceCurrency: currency,
      targetCurrency: 'USD',
      chargeType,
    }),
  runComplianceChecks: (data: Partial<InternationalTransferRequest>) =>
    apiPost<ComplianceCheck[]>('/api/v1/payments/international/compliance-check', data),
  initiateTransfer: (data: InternationalTransferRequest) =>
    apiPost<InternationalTransferResponse>('/api/v1/payments/international', data),
  getTransfer: (id: number) =>
    apiGet<InternationalTransferResponse>(`/api/v1/payments/international/${id}`),
  uploadDocument: (file: File) =>
    apiUpload<{ id: number; filename: string }>('/api/v1/payments/international/upload-document', file),
  searchSwiftCodes: (query: string) =>
    apiGet<{ bic: string; bankName: string; country: string; city: string }[]>('/api/v1/banks/swift', { query }),
  getPurposes: () =>
    apiGet<{ code: string; label: string }[]>('/api/v1/payments/international/purposes'),
};

export type { FxRate };
