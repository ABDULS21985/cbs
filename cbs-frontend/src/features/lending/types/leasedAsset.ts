// Auto-generated from backend entities

export interface LeasedAsset {
  id: number;
  assetCode: string;
  leaseContractId: number;
  assetType: string;
  description: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  yearOfManufacture: number;
  originalCost: number;
  currentBookValue: number;
  residualValue: number;
  depreciationMethod: string;
  monthlyDepreciation: number;
  currentLocation: string;
  condition: string;
  lastInspectionDate: string;
  nextInspectionDue: string;
  insurancePolicyRef: string;
  insuranceExpiry: string;
  returnCondition: string;
  returnInspectionRef: string;
  returnedAt: string;
  status: string;
}

