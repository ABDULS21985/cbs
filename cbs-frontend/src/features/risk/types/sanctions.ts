export type MatchStatus = 'PENDING' | 'CONFIRMED_HIT' | 'FALSE_POSITIVE' | 'NEEDS_MORE_INFO';

export interface SanctionsMatch {
  id: number;
  matchNumber: string;
  customerId: number;
  customerName: string;
  matchType: 'NAME' | 'DOB' | 'PASSPORT' | 'ADDRESS' | 'COMBINED';
  watchlist: string;
  matchScore: number;
  entityMatched: string;
  screenedAt: string;
  status: MatchStatus;
  customerDob?: string;
  customerNationality?: string;
  customerPassport?: string;
  customerAddress?: string;
  entityDob?: string;
  entityNationality?: string;
  entityPassport?: string;
  entityAddress?: string;
  matchingFields?: string[];
}

export interface SanctionsStats {
  screenedToday: number;
  pendingMatches: number;
  confirmedHits: number;
  falsePositiveRate: number;
}

export interface Watchlist {
  id: number;
  code: string;
  name: string;
  lastUpdated: string;
  entryCount: number;
  autoUpdateSchedule: string;
  status: 'ACTIVE' | 'UPDATING' | 'ERROR';
}

export interface BatchScreeningResult {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  processedRecords: number;
  newMatches: number;
  completedAt?: string;
}
