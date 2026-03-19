// Auto-generated from backend entities

export interface LockboxItem {
  id: number;
  lockboxId: number;
  itemReference: string;
  chequeNumber: string;
  drawerName: string;
  drawerBank: string;
  amount: number;
  currency: string;
  remitterReference: string;
  scannedImageRef: string;
  ocrConfidence: number;
  status: string;
  depositedAt: string;
  exceptionReason: string;
  createdAt: string;
}

