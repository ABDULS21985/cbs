// Auto-generated from backend entities

export interface Counterparty {
  id: number;
  counterpartyCode: string;
  counterpartyName: string;
  counterpartyType: string;
  lei: string;
  bicCode: string;
  country: string;
  creditRating: string;
  ratingAgency: string;
  totalExposureLimit: number;
  currentExposure: number;
  availableLimit: number;
  settlementInstructions: Record<string, unknown>;
  nettingAgreement: boolean;
  isdaAgreement: boolean;
  csaAgreement: boolean;
  kycStatus: string;
  kycReviewDate: string;
  riskCategory: string;
  status: string;
}

