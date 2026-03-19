// Auto-generated from backend entities

export interface CustomerBundleEnrollment {
  id: number;
  customerId: number;
  bundleId: number;
  enrolledProducts: string[];
  enrollmentDate: string;
  status: string;
  discountApplied: number;
  createdAt: string;
}

export interface ProductBundle {
  id: number;
  bundleCode: string;
  bundleName: string;
  bundleType: string;
  description: string;
  includedProducts: string[];
  bundleDiscountPct: number;
  bundleMonthlyFee: number;
  minProductsRequired: number;
  crossSellIncentive: string;
  status: string;
  createdAt: string;
}

