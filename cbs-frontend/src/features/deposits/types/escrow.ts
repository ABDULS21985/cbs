// Must match com.cbs.escrow.entity enums exactly
export type EscrowType = 'ESCROW' | 'TRUST' | 'RETENTION' | 'COLLATERAL_CASH';
export type EscrowStatus = 'DRAFT' | 'ACTIVE' | 'PARTIALLY_RELEASED' | 'FULLY_RELEASED' | 'EXPIRED' | 'CANCELLED';

export interface EscrowRelease {
  id: number;
  releaseAmount: number;
  releaseToAccountId: number | null;
  releaseToAccountNumber: string | null;
  releaseReason: string;
  approvedBy: string | null;
  approvalDate: string | null;
  transactionRef: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface EscrowMandate {
  id: number;
  mandateNumber: string;
  accountId: number;
  accountNumber: string;
  customerId: number;
  customerDisplayName: string;
  escrowType: EscrowType;
  purpose: string;
  depositorName: string | null;
  beneficiaryName: string | null;
  releaseConditions: string[];
  requiresMultiSign: boolean;
  requiredSignatories: number | null;
  mandatedAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  currencyCode: string;
  effectiveDate: string;
  expiryDate: string | null;
  status: EscrowStatus;
  releases: EscrowRelease[];
  createdAt: string;
}

export interface CreateEscrowRequest {
  accountId: number;
  escrowType: EscrowType;
  purpose: string;
  depositorCustomerId?: number;
  beneficiaryCustomerId?: number;
  releaseConditions?: string[];
  requiresMultiSign?: boolean;
  requiredSignatories?: number;
  mandatedAmount: number;
  currencyCode?: string;
  expiryDate?: string;
}
