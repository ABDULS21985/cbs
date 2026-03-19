// Auto-generated from backend entities

export interface FactoringFacility {
  id: number;
  facilityCode: string;
  facilityType: string;
  sellerCustomerId: number;
  sellerName: string;
  buyerCustomerIds: Record<string, unknown>;
  currency: string;
  facilityLimit: number;
  utilizedAmount: number;
  availableAmount: number;
  advanceRatePct: number;
  discountRatePct: number;
  serviceFeeRatePct: number;
  collectionPeriodDays: number;
  dilutionReservePct: number;
  maxInvoiceAge: number;
  maxConcentrationPct: number;
  creditInsuranceProvider: string;
  creditInsurancePolicyRef: string;
  notificationRequired: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
}

export interface FactoringTransaction {
  id: number;
  facilityId: number;
  invoiceRef: string;
  invoiceDate: string;
  invoiceAmount: number;
  buyerName: string;
  buyerId: number;
  advanceAmount: number;
  discountAmount: number;
  netProceedsToSeller: number;
  collectionDueDate: string;
  actualCollectionDate: string;
  collectedAmount: number;
  dilutionAmount: number;
  recourseExercised: boolean;
  recourseAmount: number;
  serviceFeeCharged: number;
  status: string;
}

