// Auto-generated from backend entities

export interface PosLoan {
  id: number;
  posLoanNumber: string;
  customerId: number;
  accountId: number;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  itemDescription: string;
  purchaseAmount: number;
  downPayment: number;
  financedAmount: number;
  currency: string;
  interestRate: number;
  isZeroInterest: boolean;
  merchantSubsidyPct: number;
  termMonths: number;
  monthlyPayment: number;
  deferredPaymentMonths: number;
  promotionalRate: number;
  promotionalEndDate: string;
  revertRate: number;
  status: string;
  disbursedToMerchant: boolean;
  disbursementDate: string;
  maturityDate: string;
  settlementDate: string;
  createdAt: string;
  updatedAt?: string;
}

