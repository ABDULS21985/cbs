export type ScreeningStatus =
  | 'PENDING'
  | 'SCREENING'
  | 'CLEAR'
  | 'POTENTIAL_MATCH'
  | 'CONFIRMED_MATCH';

export type MatchDisposition = 'PENDING' | 'TRUE_MATCH' | 'FALSE_POSITIVE';

export type WatchlistSource =
  | 'OFAC_SDN'
  | 'UN_CONSOLIDATED'
  | 'EU_CONSOLIDATED'
  | 'PEP'
  | 'UK_HMT'
  | 'LOCAL_REGULATOR'
  | 'INTERNAL'
  | 'ADVERSE_MEDIA';

export interface Watchlist {
  id: number;
  listCode: string;
  listName: string;
  listSource: WatchlistSource;
  entityType: 'INDIVIDUAL' | 'COMPANY';
  primaryName: string;
  aliases: string[];
  dateOfBirth: string | null;
  nationality: string | null;
  countryCodes: string[];
  idDocuments: Array<{ type: string; number: string }>;
  programme: string | null;
  remarks: string | null;
  isActive: boolean;
  listedDate: string | null;
  delistedDate: string | null;
  lastUpdated: string;
  createdAt: string;
}

export interface ScreeningMatch {
  id: number;
  screeningId: number;
  watchlistId: number;
  watchlistName: string;
  watchlistSource: string;
  matchScore: number;
  matchedFields: string[];
  matchType: 'EXACT' | 'FUZZY';
  disposition: MatchDisposition;
  disposedBy: string | null;
  disposedAt: string | null;
  createdAt: string;
}

export interface ScreeningRequest {
  id: number;
  screeningRef: string;
  screeningType: 'ONBOARDING' | 'TRANSACTION' | 'PERIODIC' | 'ADHOC';
  subjectName: string;
  subjectType: 'INDIVIDUAL' | 'COMPANY';
  subjectDob: string | null;
  subjectNationality: string | null;
  subjectIdNumber: string | null;
  customerId: number | null;
  transactionRef: string | null;
  listsScreened: string[];
  matchThreshold: number;
  totalMatches: number;
  trueMatches: number;
  falsePositives: number;
  status: ScreeningStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  screeningTimeMs: number;
  createdAt: string;
  updatedAt: string;
  matches: ScreeningMatch[];
}

export interface ScreeningStats {
  totalScreenings: number;
  clear: number;
  potentialMatch: number;
  confirmedMatch: number;
  pendingReview: number;
  avgScreeningTimeMs: number;
}

export interface ScreenNamePayload {
  screeningType: string;
  subjectName: string;
  subjectType: string;
  subjectDob?: string;
  subjectNationality?: string;
  subjectIdNumber?: string;
  customerId?: number;
  transactionRef?: string;
  listsToScreen?: string[];
  matchThreshold?: number;
}

export interface BatchScreenPayload {
  names: Array<{
    name: string;
    type: string;
    dob?: string;
    nationality?: string;
  }>;
}
