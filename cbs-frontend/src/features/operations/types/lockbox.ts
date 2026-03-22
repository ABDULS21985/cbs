// Auto-generated from backend entities

export interface Lockbox {
  id: number;
  lockboxNumber: string;
  customerId: number;
  creditAccountId: number;
  lockboxType: string;
  lockboxAddress: string | null;
  processingCutoffTime: string;
  autoDeposit: boolean;
  ocrEnabled: boolean;
  exceptionHandling: string;
  isActive: boolean;
  createdAt: string;
}

export interface LockboxItem {
  id: number;
  lockboxId: number;
  itemReference: string;
  chequeNumber: string | null;
  drawerName: string | null;
  drawerBank: string | null;
  amount: number;
  currency: string;
  remitterReference: string | null;
  scannedImageRef: string | null;
  ocrConfidence: number | null;
  status: string;
  depositedAt: string | null;
  exceptionReason: string | null;
  createdAt: string;
}

