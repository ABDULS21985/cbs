// Auto-generated from backend entities

export interface Document {
  id: number;
  documentRef: string;
  documentType: DocumentType;
  customerId: number;
  accountId: number;
  loanAccountId: number;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  storagePath: string;
  checksum: string;
  description: string;
  tags: string[];
  expiryDate: string;
  verificationStatus: string;
  verifiedBy: string;
  verifiedAt: string;
  rejectionReason: string;
  isActive: boolean;
}

export interface TradeDocument {
  id: number;
  documentRef: string;
  documentCategory: TradeDocCategory;
  lcId: number;
  collectionId: number;
  customerId: number;
  fileName: string;
  fileType: string;
  storagePath: string;
  fileSizeBytes: number;
  extractedData: Record<string, unknown>;
  extractionConfidence: number;
  extractionStatus: string;
  verificationStatus: string;
  verifiedBy: string;
  discrepancyNotes: string;
}

