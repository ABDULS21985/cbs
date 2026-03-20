// Auto-generated from backend entities

export interface LoyaltyAccount {
  id: number;
  customerId: number;
  programId: number;
  loyaltyNumber: string;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lifetimeExpired: number;
  currentTier: string;
  tierQualificationPoints: number;
  tierReviewDate: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoyaltyProgram {
  id: number;
  programCode: string;
  programName: string;
  programType: string;
  pointsCurrencyName: string;
  earnRatePerUnit: number;
  earnRateUnit: number;
  pointValue: number;
  minRedemptionPoints: number;
  expiryMonths: number;
  tierLevels: Record<string, unknown>[];
  isActive: boolean;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: number;
  loyaltyAccountId: number;
  transactionType: string;
  points: number;
  description: string;
  sourceTransactionId: number;
  sourceType: string;
  partnerName: string;
  expiryDate: string;
  createdAt: string;
}

