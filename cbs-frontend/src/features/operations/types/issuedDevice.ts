// Auto-generated from backend entities

export interface IssuedDevice {
  id: number;
  deviceCode: string;
  customerId: number;
  deviceType: string;
  deviceIdentifier: string;
  linkedAccountId: number;
  issuedBranchId: number;
  deliveryMethod: string;
  deliveryAddress: string;
  activationStatus: string;
  activatedAt: string;
  expiryDate: string;
  replacementReason: string;
  replacedByCode: string;
  issuedAt: string;
}

