// ─── Types ────────────────────────────────────────────────────────────────────

export type ReconciliationStatus = 'MATCHED' | 'PARTIAL' | 'UNMATCHED';

export interface ReconciliationEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  status: ReconciliationStatus;
  matchedRef?: string;
  matchConfidence?: number; // 0-100
}

export interface ReconciliationSession {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  reconciliationDate: string;
  ourBalance: number;
  bankBalance: number;
  difference: number;
  ourEntries: ReconciliationEntry[];
  bankEntries: ReconciliationEntry[];
  matchedCount: number;
  ourUnmatchedCount: number;
  bankUnmatchedCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PENDING';
  createdAt: string;
}

export interface NostroAccount {
  id: string;
  number: string;
  name: string;
  currency: string;
  correspondentBank: string;
}

export interface MatchPair {
  ourEntryId: string;
  bankEntryId: string;
  confidence: number;
  matchType: 'EXACT' | 'FUZZY' | 'ONE_TO_MANY';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const NOSTRO_ACCOUNTS: NostroAccount[] = [
  { id: 'NA-001', number: '036-0100234', name: 'First Bank Nostro – USD', currency: 'USD', correspondentBank: 'First Bank of Nigeria' },
  { id: 'NA-002', number: '058-0200456', name: 'GTBank Nostro – GBP', currency: 'GBP', correspondentBank: 'Guaranty Trust Bank' },
  { id: 'NA-003', number: '011-0300789', name: 'UBA Nostro – EUR', currency: 'EUR', correspondentBank: 'United Bank for Africa' },
  { id: 'NA-004', number: '057-0401234', name: 'Zenith Nostro – NGN', currency: 'NGN', correspondentBank: 'Zenith Bank' },
  { id: 'NA-005', number: '033-0501567', name: 'Stanbic Nostro – USD', currency: 'USD', correspondentBank: 'Stanbic IBTC Bank' },
];

const MOCK_OUR_ENTRIES: ReconciliationEntry[] = [
  // Matched (10)
  { id: 'OE-001', date: '2026-03-01', reference: 'TXN-20260301-001', description: 'SWIFT Transfer – Receivable A', amount: 4_500_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'BK-20260301-001', matchConfidence: 100 },
  { id: 'OE-002', date: '2026-03-02', reference: 'TXN-20260302-002', description: 'SWIFT Transfer – Receivable B', amount: 1_250_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'BK-20260302-002', matchConfidence: 100 },
  { id: 'OE-003', date: '2026-03-03', reference: 'TXN-20260303-003', description: 'Foreign Exchange Settlement', amount: 8_000_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'BK-20260303-003', matchConfidence: 100 },
  { id: 'OE-004', date: '2026-03-04', reference: 'TXN-20260304-004', description: 'Correspondent Bank Charges', amount: 75_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'BK-20260304-004', matchConfidence: 99 },
  { id: 'OE-005', date: '2026-03-05', reference: 'TXN-20260305-005', description: 'Trade Finance Receipt – LC Settlement', amount: 12_000_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'BK-20260305-005', matchConfidence: 100 },
  { id: 'OE-006', date: '2026-03-06', reference: 'TXN-20260306-006', description: 'Outward Remittance – Corporate Client', amount: 3_200_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'BK-20260306-006', matchConfidence: 98 },
  { id: 'OE-007', date: '2026-03-07', reference: 'TXN-20260307-007', description: 'Interest Earned – Money Market', amount: 280_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'BK-20260307-007', matchConfidence: 100 },
  { id: 'OE-008', date: '2026-03-08', reference: 'TXN-20260308-008', description: 'Inward Wire Transfer – USD/NGN', amount: 6_750_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'BK-20260308-008', matchConfidence: 100 },
  { id: 'OE-009', date: '2026-03-10', reference: 'TXN-20260310-009', description: 'Regulatory Reserve Payment', amount: 2_100_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'BK-20260310-009', matchConfidence: 97 },
  { id: 'OE-010', date: '2026-03-12', reference: 'TXN-20260312-010', description: 'Inter-Bank Settlement – NIBSS', amount: 950_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'BK-20260312-010', matchConfidence: 100 },
  // Partial (3)
  { id: 'OE-011', date: '2026-03-13', reference: 'TXN-20260313-011', description: 'FX Spot Purchase – Partial Match', amount: 5_400_000, type: 'DEBIT', status: 'PARTIAL', matchedRef: 'BK-20260313-011', matchConfidence: 72 },
  { id: 'OE-012', date: '2026-03-14', reference: 'TXN-20260314-012', description: 'Trade Settlement – Split Leg 1', amount: 1_800_000, type: 'CREDIT', status: 'PARTIAL', matchedRef: 'BK-20260314-012A', matchConfidence: 65 },
  { id: 'OE-013', date: '2026-03-15', reference: 'TXN-20260315-013', description: 'Correspondent Charges – Query Amount', amount: 42_500, type: 'DEBIT', status: 'PARTIAL', matchedRef: 'BK-20260315-013', matchConfidence: 58 },
  // Unmatched (5)
  { id: 'OE-014', date: '2026-03-16', reference: 'TXN-20260316-014', description: 'Unrecognised Inward Credit', amount: 3_600_000, type: 'CREDIT', status: 'UNMATCHED' },
  { id: 'OE-015', date: '2026-03-17', reference: 'TXN-20260317-015', description: 'Outward SWIFT – Pending Confirmation', amount: 7_200_000, type: 'DEBIT', status: 'UNMATCHED' },
  { id: 'OE-016', date: '2026-03-18', reference: 'TXN-20260318-016', description: 'Duplicate Charge – Under Review', amount: 120_000, type: 'DEBIT', status: 'UNMATCHED' },
  { id: 'OE-017', date: '2026-03-18', reference: 'TXN-20260318-017', description: 'Interest Accrual – Disputed Period', amount: 390_000, type: 'CREDIT', status: 'UNMATCHED' },
  { id: 'OE-018', date: '2026-03-19', reference: 'TXN-20260319-018', description: 'Reversed Debit – Awaiting Bank Confirmation', amount: 215_000, type: 'DEBIT', status: 'UNMATCHED' },
];

const MOCK_BANK_ENTRIES: ReconciliationEntry[] = [
  // Matched (10)
  { id: 'BE-001', date: '2026-03-01', reference: 'BK-20260301-001', description: 'CR SWIFT REF TXN-20260301-001', amount: 4_500_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'TXN-20260301-001', matchConfidence: 100 },
  { id: 'BE-002', date: '2026-03-02', reference: 'BK-20260302-002', description: 'CR SWIFT REF TXN-20260302-002', amount: 1_250_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'TXN-20260302-002', matchConfidence: 100 },
  { id: 'BE-003', date: '2026-03-03', reference: 'BK-20260303-003', description: 'DR FX SETTLEMENT REF TXN-003', amount: 8_000_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'TXN-20260303-003', matchConfidence: 100 },
  { id: 'BE-004', date: '2026-03-04', reference: 'BK-20260304-004', description: 'DR CHARGES REF TXN-004', amount: 75_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'TXN-20260304-004', matchConfidence: 99 },
  { id: 'BE-005', date: '2026-03-05', reference: 'BK-20260305-005', description: 'CR TRADE FINANCE LC SETTLEMENT', amount: 12_000_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'TXN-20260305-005', matchConfidence: 100 },
  { id: 'BE-006', date: '2026-03-06', reference: 'BK-20260306-006', description: 'DR OUTWARD REMITTANCE', amount: 3_200_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'TXN-20260306-006', matchConfidence: 98 },
  { id: 'BE-007', date: '2026-03-07', reference: 'BK-20260307-007', description: 'CR INTEREST MONEY MARKET', amount: 280_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'TXN-20260307-007', matchConfidence: 100 },
  { id: 'BE-008', date: '2026-03-08', reference: 'BK-20260308-008', description: 'CR INWARD WIRE USD/NGN', amount: 6_750_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'TXN-20260308-008', matchConfidence: 100 },
  { id: 'BE-009', date: '2026-03-10', reference: 'BK-20260310-009', description: 'DR REGULATORY RESERVE', amount: 2_100_000, type: 'DEBIT', status: 'MATCHED', matchedRef: 'TXN-20260310-009', matchConfidence: 97 },
  { id: 'BE-010', date: '2026-03-12', reference: 'BK-20260312-010', description: 'CR NIBSS SETTLEMENT', amount: 950_000, type: 'CREDIT', status: 'MATCHED', matchedRef: 'TXN-20260312-010', matchConfidence: 100 },
  // Partial (3)
  { id: 'BE-011', date: '2026-03-13', reference: 'BK-20260313-011', description: 'DR FX SPOT PURCHASE – AMT DIFF', amount: 5_380_000, type: 'DEBIT', status: 'PARTIAL', matchedRef: 'TXN-20260313-011', matchConfidence: 72 },
  { id: 'BE-012', date: '2026-03-14', reference: 'BK-20260314-012A', description: 'CR TRADE SETTLEMENT PART', amount: 1_750_000, type: 'CREDIT', status: 'PARTIAL', matchedRef: 'TXN-20260314-012', matchConfidence: 65 },
  { id: 'BE-013', date: '2026-03-15', reference: 'BK-20260315-013', description: 'DR CORRESPONDENT CHARGES', amount: 45_000, type: 'DEBIT', status: 'PARTIAL', matchedRef: 'TXN-20260315-013', matchConfidence: 58 },
  // Unmatched (5)
  { id: 'BE-014', date: '2026-03-16', reference: 'BK-20260316-014', description: 'Bank-side posting – No internal ref', amount: 880_000, type: 'CREDIT', status: 'UNMATCHED' },
  { id: 'BE-015', date: '2026-03-17', reference: 'BK-20260317-015', description: 'Bank Charge – Unrecorded in Books', amount: 55_000, type: 'DEBIT', status: 'UNMATCHED' },
  { id: 'BE-016', date: '2026-03-17', reference: 'BK-20260317-016', description: 'FX Conversion Difference', amount: 18_500, type: 'DEBIT', status: 'UNMATCHED' },
  { id: 'BE-017', date: '2026-03-18', reference: 'BK-20260318-017', description: 'Suspense Credit – Under Investigation', amount: 2_400_000, type: 'CREDIT', status: 'UNMATCHED' },
  { id: 'BE-018', date: '2026-03-19', reference: 'BK-20260319-018', description: 'Penalty Interest – Not in Ledger', amount: 63_000, type: 'DEBIT', status: 'UNMATCHED' },
];

const MOCK_SESSION: ReconciliationSession = {
  id: 'SESSION-20260319-NA001',
  accountId: 'NA-001',
  accountNumber: '036-0100234',
  accountName: 'First Bank Nostro – USD',
  reconciliationDate: '2026-03-19',
  ourBalance: 28_622_500,
  bankBalance: 28_459_000,
  difference: 163_500,
  ourEntries: MOCK_OUR_ENTRIES,
  bankEntries: MOCK_BANK_ENTRIES,
  matchedCount: 10,
  ourUnmatchedCount: 5,
  bankUnmatchedCount: 5,
  status: 'IN_PROGRESS',
  createdAt: '2026-03-19T08:00:00Z',
};

// ─── API Functions ────────────────────────────────────────────────────────────

function delay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getNostroAccounts(): Promise<NostroAccount[]> {
  await delay();
  return [...NOSTRO_ACCOUNTS];
}

export async function getReconciliationSession(
  accountId: string,
  _date: string,
): Promise<ReconciliationSession> {
  await delay(800);
  return { ...MOCK_SESSION, accountId };
}

export async function uploadStatement(_accountId: string, _file: File): Promise<{ entriesCount: number; dateRange: { from: string; to: string }; totalAmount: number }> {
  await delay(1200);
  return {
    entriesCount: 18,
    dateRange: { from: '2026-03-01', to: '2026-03-19' },
    totalAmount: 28_459_000,
  };
}

export async function runAutoMatch(sessionId: string): Promise<ReconciliationSession> {
  await delay(1500);
  // Simulate running auto-match – no real changes to mock data
  return { ...MOCK_SESSION, id: sessionId };
}

export async function createManualMatch(
  sessionId: string,
  ourEntryIds: string[],
  bankEntryIds: string[],
): Promise<{ matched: MatchPair[] }> {
  await delay(700);
  const pairs: MatchPair[] = ourEntryIds.flatMap((ourId) =>
    bankEntryIds.map((bankId) => ({
      ourEntryId: ourId,
      bankEntryId: bankId,
      confidence: 100,
      matchType: ourEntryIds.length > 1 || bankEntryIds.length > 1 ? 'ONE_TO_MANY' : 'EXACT',
    } as MatchPair)),
  );
  console.log(`[reconciliationApi] createManualMatch session=${sessionId}`, pairs);
  return { matched: pairs };
}

export async function writeOffEntry(
  sessionId: string,
  entryId: string,
  reason: string,
): Promise<{ success: boolean }> {
  await delay(600);
  console.log(`[reconciliationApi] writeOffEntry session=${sessionId} entry=${entryId} reason=${reason}`);
  return { success: true };
}

export async function getReconciliationHistory(
  accountId: string,
): Promise<Array<{ date: string; status: ReconciliationSession['status']; difference: number; matchedCount: number }>> {
  await delay(500);
  console.log(`[reconciliationApi] getReconciliationHistory account=${accountId}`);
  return [
    { date: '2026-03-18', status: 'COMPLETED', difference: 0, matchedCount: 15 },
    { date: '2026-03-17', status: 'COMPLETED', difference: 0, matchedCount: 12 },
    { date: '2026-03-16', status: 'COMPLETED', difference: 45_000, matchedCount: 11 },
    { date: '2026-03-15', status: 'COMPLETED', difference: 0, matchedCount: 14 },
    { date: '2026-03-14', status: 'COMPLETED', difference: 200_000, matchedCount: 10 },
  ];
}
