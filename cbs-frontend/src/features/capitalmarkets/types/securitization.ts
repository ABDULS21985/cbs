// Auto-generated from backend entities

export interface SecuritizationVehicle {
  id: number;
  vehicleCode: string;
  vehicleName: string;
  vehicleType: string;
  underlyingAssetType: string;
  currency: string;
  totalPoolBalance: number;
  numberOfAssets: number;
  weightedAvgCoupon: number;
  weightedAvgMaturity: number;
  tranches: Map<String, Object[];
  totalIssued: number;
  creditEnhancementPct: number;
  delinquency30dPct: number;
  delinquency60dPct: number;
  delinquency90dPct: number;
  cumulativeLossPct: number;
  prepaymentRateCpr: number;
  status: string;
  issueDate: string;
  maturityDate: string;
  trusteeName: string;
  ratingAgency: string;
  createdAt: string;
  updatedAt?: string;
}

