export interface MortgageLoan {
  id: number;
  loanNumber: string;
  customerId: number;
  customerName: string;
  propertyAddress: string;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND';
  disbursedAmount: number;
  ltv: number; // percent
  rate: number;
  tenorMonths: number;
  outstandingBalance: number;
  dpd: number;
  status: string;
  currency: string;
  propertyValue: number;
  propertyTitle: string;
  propertySize?: string;
  insuranceStatus: string;
  disbursementType: 'LUMP_SUM' | 'MILESTONE';
  disbursementMilestones?: DisbursementMilestone[];
}

export interface DisbursementMilestone {
  id: number;
  name: string; // FOUNDATION, ROOF, COMPLETION, FINAL
  scheduledDate: string;
  disbursedDate?: string;
  amount: number;
  status: 'PENDING' | 'DISBURSED' | 'APPROVED';
}

export interface LtvPoint {
  date: string;
  ltv: number;
  outstanding: number;
  propertyValue: number;
}

export interface MortgageCalculatorResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
}
