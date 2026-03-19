// Auto-generated from backend entities

export interface FinancialInstrument {
  id: number;
  instrumentCode: string;
  isin: string;
  cusip: string;
  sedol: string;
  ticker: string;
  instrumentName: string;
  instrumentType: string;
  assetClass: string;
  issuerName: string;
  issuerCountry: string;
  currency: string;
  faceValue: number;
  couponRate: number;
  couponFrequency: string;
  maturityDate: string;
  issueDate: string;
  creditRating: string;
  ratingAgency: string;
  exchange: string;
  dayCountConvention: string;
  settlementDays: number;
  isActive: boolean;
}

