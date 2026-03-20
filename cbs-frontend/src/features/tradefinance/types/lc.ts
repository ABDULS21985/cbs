// Auto-generated from backend entities

export interface LetterOfCredit {
  id: number;
  lcNumber: string;
  lcType: LcType;
  lcRole: string;
  applicant: { id: number; name: string };
  beneficiaryName: string;
  beneficiaryAddress: string;
  beneficiaryBankCode: string;
  beneficiaryBankName: string;
  issuingBankCode: string;
  advisingBankCode: string;
  confirmingBankCode: string;
  amount: number;
  currencyCode: string;
  tolerancePositivePct: number;
  toleranceNegativePct: number;
  utilizedAmount: number;
  issueDate: string;
  expiryDate: string;
  latestShipmentDate: string;
  tenorDays: number;
  paymentTerms: string;
  incoterms: string;
  portOfLoading: string;
  portOfDischarge: string;
  goodsDescription: string;
  requiredDocuments: string[];
  specialConditions: string[];
  isIrrevocable: boolean;
  isConfirmed: boolean;
  isTransferable: boolean;
  ucpVersion: string;
  marginAccount: { id: number; accountNumber: string };
  settlementAccount: { id: number; accountNumber: string };
  marginPercentage: number;
  marginAmount: number;
  commissionRate: number;
  commissionAmount: number;
  swiftCharges: number;
  status: string;
  metadata: Record<string, unknown>;
}

