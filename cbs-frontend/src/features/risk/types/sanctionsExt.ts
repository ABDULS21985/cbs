// Auto-generated from backend entities

export interface ScreeningRequest {
  id: number;
  screeningRef: string;
  screeningType: string;
  subjectName: string;
  subjectType: string;
  subjectDob: string;
  subjectNationality: string;
  subjectIdNumber: string;
  customerId: number;
  transactionRef: string;
  listsScreened: string[];
  matchThreshold: number;
  totalMatches: number;
  trueMatches: number;
  falsePositives: number;
  status: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewNotes: string;
  screeningTimeMs: number;
  createdAt: string;
  updatedAt?: string;
  version: number;
  matches: ScreeningMatch[];
}

