// Auto-generated from backend entities

export interface MortgageLoan {
  id: number;
  mortgageNumber: string;
  loanApplicationId: number;
  customerId: number;
  accountId: number;
  mortgageType: string;
  repaymentType: string;
  rateType: string;
  propertyAddress: string;
  propertyType: string;
  propertyValuation: number;
  valuationDate: string;
  valuationType: string;
  purchasePrice: number;
  principalAmount: number;
  currentBalance: number;
  currency: string;
  ltvAtOrigination: number;
  currentLtv: number;
  interestRate: number;
  baseRateReference: string;
  marginOverBase: number;
  fixedRateEndDate: string;
  reversionRate: number;
  termMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  titleInsuranceRef: string;
  buildingInsuranceRef: string;
  stampDutyAmount: number;
  arrangementFee: number;
  earlyRepaymentCharge: number;
  ercEndDate: string;
  status: string;
  completionDate: string;
  firstPaymentDate: string;
  maturityDate: string;
  isPortable: boolean;
  portedFromProperty: string;
  annualOverpaymentPct: number;
  overpaymentsYtd: number;
  createdAt: string;
  updatedAt?: string;
}

