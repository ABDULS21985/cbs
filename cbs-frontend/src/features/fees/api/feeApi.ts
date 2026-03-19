export type FeeCategory = 'ACCOUNT_MAINTENANCE' | 'TRANSACTION' | 'CARD' | 'LOAN' | 'TRADE' | 'OTHER';
export type FeeCalcType = 'FLAT' | 'PERCENTAGE' | 'TIERED' | 'SLAB';
export type FeeSchedule = 'PER_TRANSACTION' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type WaiverAuthority = 'OFFICER' | 'MANAGER' | 'ADMIN';

export interface FeeTier {
  fromAmount: number;
  toAmount: number;
  rate: number;
  flatFee: number;
}

export interface FeeDefinition {
  id: string;
  code: string;
  name: string;
  category: FeeCategory;
  calcType: FeeCalcType;
  flatAmount?: number;
  percentage?: number;
  minFee?: number;
  maxFee?: number;
  onAmount?: 'DEBIT' | 'CREDIT' | 'BALANCE';
  tiers?: FeeTier[];
  vatApplicable: boolean;
  vatRate?: number;
  schedule: FeeSchedule;
  waiverAuthority: WaiverAuthority;
  glIncomeAccount: string;
  glReceivableAccount: string;
  applicableProducts: string[];
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  createdAt: string;
}

export interface FeeCharge {
  id: string;
  feeId: string;
  feeName: string;
  accountId: string;
  accountNumber: string;
  customerName: string;
  amount: number;
  vatAmount: number;
  date: string;
  status: 'CHARGED' | 'WAIVED' | 'PENDING' | 'REVERSED';
  waivedBy?: string;
  waivedReason?: string;
  transactionRef?: string;
}

export interface FeeWaiver {
  id: string;
  chargeId: string;
  feeId: string;
  accountId: string;
  amount: number;
  reason: string;
  requestedBy: string;
  authorizedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface BulkFeeJob {
  id: string;
  feeId: string;
  feeName: string;
  affectedAccounts: number;
  totalAmount: number;
  processedCount: number;
  failedCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  scheduledDate: string;
  createdAt: string;
}

export interface PreviewChargeResult {
  customerId: string;
  customerName: string;
  eventType: string;
  transactionAmount: number;
  applicableFees: {
    feeId: string;
    feeName: string;
    calculatedAmount: number;
    vatAmount: number;
    breakdown: string;
  }[];
  totalFees: number;
  totalVat: number;
  totalCharge: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MOCK_FEES: FeeDefinition[] = [
  {
    id: 'fee-001',
    code: 'ACC-MAINT-001',
    name: 'Monthly Account Maintenance',
    category: 'ACCOUNT_MAINTENANCE',
    calcType: 'FLAT',
    flatAmount: 500,
    vatApplicable: true,
    vatRate: 7.5,
    schedule: 'MONTHLY',
    waiverAuthority: 'OFFICER',
    glIncomeAccount: '4100001',
    glReceivableAccount: '1300001',
    applicableProducts: ['SAVINGS_CLASSIC', 'SAVINGS_PREMIUM'],
    status: 'ACTIVE',
    description: 'Monthly maintenance fee charged on all savings accounts',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'fee-002',
    code: 'TXN-XFER-001',
    name: 'Interbank Transfer Fee',
    category: 'TRANSACTION',
    calcType: 'TIERED',
    tiers: [
      { fromAmount: 1, toAmount: 5000, rate: 1.5, flatFee: 0 },
      { fromAmount: 5001, toAmount: 50000, rate: 1.0, flatFee: 0 },
      { fromAmount: 50001, toAmount: 1000000, rate: 0.5, flatFee: 0 },
    ],
    minFee: 50,
    maxFee: 2000,
    onAmount: 'DEBIT',
    vatApplicable: true,
    vatRate: 7.5,
    schedule: 'PER_TRANSACTION',
    waiverAuthority: 'MANAGER',
    glIncomeAccount: '4100002',
    glReceivableAccount: '1300002',
    applicableProducts: ['SAVINGS_CLASSIC', 'SAVINGS_PREMIUM', 'CURRENT_BUSINESS'],
    status: 'ACTIVE',
    description: 'Fee charged on interbank electronic fund transfers (NIP/NEFT)',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'fee-003',
    code: 'CARD-ISS-001',
    name: 'Debit Card Issuance Fee',
    category: 'CARD',
    calcType: 'FLAT',
    flatAmount: 1000,
    vatApplicable: true,
    vatRate: 7.5,
    schedule: 'PER_TRANSACTION',
    waiverAuthority: 'MANAGER',
    glIncomeAccount: '4100003',
    glReceivableAccount: '1300003',
    applicableProducts: ['SAVINGS_CLASSIC', 'SAVINGS_PREMIUM', 'CURRENT_BUSINESS', 'CURRENT_PREMIUM'],
    status: 'ACTIVE',
    description: 'One-time fee for issuance of Verve/MasterCard debit card',
    createdAt: '2024-01-20T09:00:00Z',
  },
  {
    id: 'fee-004',
    code: 'LOAN-PROC-001',
    name: 'Loan Processing Fee',
    category: 'LOAN',
    calcType: 'PERCENTAGE',
    percentage: 1.5,
    minFee: 5000,
    maxFee: 150000,
    onAmount: 'DEBIT',
    vatApplicable: false,
    schedule: 'PER_TRANSACTION',
    waiverAuthority: 'ADMIN',
    glIncomeAccount: '4100004',
    glReceivableAccount: '1300004',
    applicableProducts: ['PERSONAL_LOAN', 'BUSINESS_LOAN', 'MORTGAGE'],
    status: 'ACTIVE',
    description: '1.5% of loan principal charged at disbursement',
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'fee-005',
    code: 'ACC-MAINT-CURR',
    name: 'Current Account Quarterly Maintenance',
    category: 'ACCOUNT_MAINTENANCE',
    calcType: 'FLAT',
    flatAmount: 2000,
    vatApplicable: true,
    vatRate: 7.5,
    schedule: 'QUARTERLY',
    waiverAuthority: 'MANAGER',
    glIncomeAccount: '4100001',
    glReceivableAccount: '1300001',
    applicableProducts: ['CURRENT_BUSINESS', 'CURRENT_PREMIUM'],
    status: 'ACTIVE',
    description: 'Quarterly maintenance fee for current accounts',
    createdAt: '2024-02-10T09:00:00Z',
  },
  {
    id: 'fee-006',
    code: 'TXN-ATM-001',
    name: 'ATM Withdrawal Fee (Off-us)',
    category: 'TRANSACTION',
    calcType: 'SLAB',
    tiers: [
      { fromAmount: 1, toAmount: 20000, rate: 0, flatFee: 65 },
      { fromAmount: 20001, toAmount: 50000, rate: 0, flatFee: 65 },
      { fromAmount: 50001, toAmount: 150000, rate: 0, flatFee: 65 },
    ],
    vatApplicable: true,
    vatRate: 7.5,
    schedule: 'PER_TRANSACTION',
    waiverAuthority: 'OFFICER',
    glIncomeAccount: '4100002',
    glReceivableAccount: '1300002',
    applicableProducts: ['SAVINGS_CLASSIC', 'SAVINGS_PREMIUM', 'CURRENT_BUSINESS'],
    status: 'ACTIVE',
    description: 'CBN-mandated ₦65 flat fee per off-us ATM withdrawal',
    createdAt: '2024-02-15T09:00:00Z',
  },
  {
    id: 'fee-007',
    code: 'TRADE-LC-001',
    name: 'Letter of Credit Issuance',
    category: 'TRADE',
    calcType: 'PERCENTAGE',
    percentage: 0.25,
    minFee: 10000,
    maxFee: 500000,
    onAmount: 'DEBIT',
    vatApplicable: false,
    schedule: 'PER_TRANSACTION',
    waiverAuthority: 'ADMIN',
    glIncomeAccount: '4100005',
    glReceivableAccount: '1300005',
    applicableProducts: ['CURRENT_PREMIUM', 'TRADE_FINANCE'],
    status: 'ACTIVE',
    description: '0.25% of LC value charged at issuance',
    createdAt: '2024-03-01T09:00:00Z',
  },
  {
    id: 'fee-008',
    code: 'CARD-MAINT-001',
    name: 'Annual Card Maintenance',
    category: 'CARD',
    calcType: 'FLAT',
    flatAmount: 1200,
    vatApplicable: true,
    vatRate: 7.5,
    schedule: 'ANNUAL',
    waiverAuthority: 'OFFICER',
    glIncomeAccount: '4100003',
    glReceivableAccount: '1300003',
    applicableProducts: ['SAVINGS_CLASSIC', 'SAVINGS_PREMIUM', 'CURRENT_BUSINESS'],
    status: 'ACTIVE',
    description: 'Annual card maintenance and insurance fee',
    createdAt: '2024-03-05T09:00:00Z',
  },
  {
    id: 'fee-009',
    code: 'SMS-ALERT-001',
    name: 'SMS Alert Subscription',
    category: 'OTHER',
    calcType: 'FLAT',
    flatAmount: 50,
    vatApplicable: false,
    schedule: 'MONTHLY',
    waiverAuthority: 'OFFICER',
    glIncomeAccount: '4100006',
    glReceivableAccount: '1300006',
    applicableProducts: ['SAVINGS_CLASSIC', 'SAVINGS_PREMIUM', 'CURRENT_BUSINESS', 'CURRENT_PREMIUM'],
    status: 'ACTIVE',
    description: 'Monthly SMS alert subscription fee',
    createdAt: '2024-03-10T09:00:00Z',
  },
  {
    id: 'fee-010',
    code: 'LOAN-EARLY-001',
    name: 'Loan Early Repayment Penalty',
    category: 'LOAN',
    calcType: 'PERCENTAGE',
    percentage: 2.0,
    minFee: 2000,
    onAmount: 'DEBIT',
    vatApplicable: false,
    schedule: 'PER_TRANSACTION',
    waiverAuthority: 'ADMIN',
    glIncomeAccount: '4100004',
    glReceivableAccount: '1300004',
    applicableProducts: ['PERSONAL_LOAN', 'MORTGAGE'],
    status: 'INACTIVE',
    description: '2% penalty on outstanding balance for early repayment within 12 months',
    createdAt: '2024-04-01T09:00:00Z',
  },
];

const MOCK_CHARGES: FeeCharge[] = [
  {
    id: 'chg-001',
    feeId: 'fee-001',
    feeName: 'Monthly Account Maintenance',
    accountId: 'acc-001',
    accountNumber: '0123456789',
    customerName: 'Amara Okonkwo',
    amount: 500,
    vatAmount: 37.5,
    date: '2024-03-01T00:00:00Z',
    status: 'CHARGED',
    transactionRef: 'TXN-20240301-001',
  },
  {
    id: 'chg-002',
    feeId: 'fee-002',
    feeName: 'Interbank Transfer Fee',
    accountId: 'acc-002',
    accountNumber: '0234567890',
    customerName: 'TechVentures Nigeria Ltd',
    amount: 1200,
    vatAmount: 90,
    date: '2024-03-05T11:30:00Z',
    status: 'CHARGED',
    transactionRef: 'TXN-20240305-042',
  },
  {
    id: 'chg-003',
    feeId: 'fee-003',
    feeName: 'Debit Card Issuance Fee',
    accountId: 'acc-003',
    accountNumber: '0345678901',
    customerName: 'Ibrahim Musa',
    amount: 1000,
    vatAmount: 75,
    date: '2024-03-08T14:00:00Z',
    status: 'WAIVED',
    waivedBy: 'Tunde Adesanya',
    waivedReason: 'Customer loyalty — 5 years with no waiver history',
  },
  {
    id: 'chg-004',
    feeId: 'fee-001',
    feeName: 'Monthly Account Maintenance',
    accountId: 'acc-004',
    accountNumber: '0456789012',
    customerName: 'Chidi Enterprises',
    amount: 500,
    vatAmount: 37.5,
    date: '2024-03-01T00:00:00Z',
    status: 'PENDING',
  },
  {
    id: 'chg-005',
    feeId: 'fee-006',
    feeName: 'ATM Withdrawal Fee (Off-us)',
    accountId: 'acc-001',
    accountNumber: '0123456789',
    customerName: 'Amara Okonkwo',
    amount: 65,
    vatAmount: 4.88,
    date: '2024-03-10T09:15:00Z',
    status: 'CHARGED',
    transactionRef: 'TXN-20240310-007',
  },
  {
    id: 'chg-006',
    feeId: 'fee-004',
    feeName: 'Loan Processing Fee',
    accountId: 'acc-005',
    accountNumber: '0567890123',
    customerName: 'Fatima Al-Hassan',
    amount: 15000,
    vatAmount: 0,
    date: '2024-03-12T10:00:00Z',
    status: 'CHARGED',
    transactionRef: 'TXN-20240312-015',
  },
  {
    id: 'chg-007',
    feeId: 'fee-002',
    feeName: 'Interbank Transfer Fee',
    accountId: 'acc-001',
    accountNumber: '0123456789',
    customerName: 'Amara Okonkwo',
    amount: 500,
    vatAmount: 37.5,
    date: '2024-03-15T16:45:00Z',
    status: 'REVERSED',
    transactionRef: 'TXN-20240315-089',
  },
];

const MOCK_WAIVERS: FeeWaiver[] = [
  {
    id: 'wvr-001',
    chargeId: 'chg-004',
    feeId: 'fee-001',
    accountId: 'acc-004',
    amount: 500,
    reason: 'Customer requested waiver due to account inactivity period',
    requestedBy: 'Emeka Nwosu',
    status: 'PENDING',
    createdAt: '2024-03-14T10:00:00Z',
  },
  {
    id: 'wvr-002',
    chargeId: 'chg-001',
    feeId: 'fee-001',
    accountId: 'acc-001',
    amount: 500,
    reason: 'High-value customer retention — premium segment upgrade',
    requestedBy: 'Bola Adeyemi',
    authorizedBy: 'Ngozi Eze',
    status: 'APPROVED',
    createdAt: '2024-03-10T09:00:00Z',
  },
];

const MOCK_BULK_JOBS: BulkFeeJob[] = [
  {
    id: 'bulk-001',
    feeId: 'fee-001',
    feeName: 'Monthly Account Maintenance',
    affectedAccounts: 12450,
    totalAmount: 6225000,
    processedCount: 12450,
    failedCount: 0,
    status: 'COMPLETED',
    scheduledDate: '2024-03-01T00:00:00Z',
    createdAt: '2024-02-28T18:00:00Z',
  },
  {
    id: 'bulk-002',
    feeId: 'fee-005',
    feeName: 'Current Account Quarterly Maintenance',
    affectedAccounts: 3200,
    totalAmount: 6400000,
    processedCount: 3187,
    failedCount: 13,
    status: 'COMPLETED',
    scheduledDate: '2024-01-01T00:00:00Z',
    createdAt: '2023-12-29T18:00:00Z',
  },
];

// ─── API Functions ───────────────────────────────────────────────────────────

export async function getFeeDefinitions(): Promise<FeeDefinition[]> {
  await delay(500);
  return [...MOCK_FEES];
}

export async function getFeeById(id: string): Promise<FeeDefinition> {
  await delay(400);
  const fee = MOCK_FEES.find((f) => f.id === id);
  if (!fee) throw new Error(`Fee definition ${id} not found`);
  return { ...fee };
}

export async function createFeeDefinition(data: Omit<FeeDefinition, 'id' | 'createdAt'>): Promise<FeeDefinition> {
  await delay(800);
  const newFee: FeeDefinition = {
    ...data,
    id: `fee-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  MOCK_FEES.push(newFee);
  return newFee;
}

export async function updateFeeDefinition(id: string, data: Partial<FeeDefinition>): Promise<FeeDefinition> {
  await delay(700);
  const idx = MOCK_FEES.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error(`Fee definition ${id} not found`);
  MOCK_FEES[idx] = { ...MOCK_FEES[idx], ...data };
  return { ...MOCK_FEES[idx] };
}

export async function getFeeChargeHistory(feeId?: string): Promise<FeeCharge[]> {
  await delay(500);
  if (feeId) return MOCK_CHARGES.filter((c) => c.feeId === feeId);
  return [...MOCK_CHARGES];
}

export async function createFeeWaiver(data: {
  chargeId: string;
  feeId: string;
  accountId: string;
  amount: number;
  reason: string;
  requestedBy: string;
}): Promise<FeeWaiver> {
  await delay(600);
  const waiver: FeeWaiver = {
    ...data,
    id: `wvr-${Date.now()}`,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  MOCK_WAIVERS.push(waiver);
  return waiver;
}

export async function getPendingWaivers(): Promise<FeeWaiver[]> {
  await delay(400);
  return MOCK_WAIVERS.filter((w) => w.status === 'PENDING');
}

export async function approveWaiver(waiverId: string, authorizedBy: string): Promise<FeeWaiver> {
  await delay(500);
  const idx = MOCK_WAIVERS.findIndex((w) => w.id === waiverId);
  if (idx === -1) throw new Error(`Waiver ${waiverId} not found`);
  MOCK_WAIVERS[idx] = { ...MOCK_WAIVERS[idx], status: 'APPROVED', authorizedBy };
  return { ...MOCK_WAIVERS[idx] };
}

export async function rejectWaiver(waiverId: string, authorizedBy: string): Promise<FeeWaiver> {
  await delay(500);
  const idx = MOCK_WAIVERS.findIndex((w) => w.id === waiverId);
  if (idx === -1) throw new Error(`Waiver ${waiverId} not found`);
  MOCK_WAIVERS[idx] = { ...MOCK_WAIVERS[idx], status: 'REJECTED', authorizedBy };
  return { ...MOCK_WAIVERS[idx] };
}

export async function previewCharge(
  customerId: string,
  eventType: string,
  amount: number,
): Promise<PreviewChargeResult> {
  await delay(700);

  const eventFeeMap: Record<string, string[]> = {
    ATM_WITHDRAWAL: ['fee-006'],
    TRANSFER: ['fee-002'],
    ACCOUNT_MAINTENANCE: ['fee-001'],
    CARD_ISSUANCE: ['fee-003'],
    LOAN_DISBURSEMENT: ['fee-004'],
    LC_ISSUANCE: ['fee-007'],
  };

  const feeIds = eventFeeMap[eventType] || ['fee-001'];
  const customerNames: Record<string, string> = {
    'cust-001': 'Amara Okonkwo',
    'cust-002': 'TechVentures Nigeria Ltd',
    'cust-003': 'Ibrahim Musa',
    'cust-004': 'Chidi Enterprises',
    'cust-005': 'Fatima Al-Hassan',
  };

  const applicableFees = feeIds
    .map((id) => MOCK_FEES.find((f) => f.id === id))
    .filter(Boolean)
    .map((fee) => {
      let calculatedAmount = 0;
      let breakdown = '';

      if (fee!.calcType === 'FLAT') {
        calculatedAmount = fee!.flatAmount || 0;
        breakdown = `Flat fee: ₦${calculatedAmount.toLocaleString()}`;
      } else if (fee!.calcType === 'PERCENTAGE') {
        calculatedAmount = (amount * (fee!.percentage || 0)) / 100;
        if (fee!.minFee) calculatedAmount = Math.max(calculatedAmount, fee!.minFee);
        if (fee!.maxFee) calculatedAmount = Math.min(calculatedAmount, fee!.maxFee);
        breakdown = `${fee!.percentage}% of ₦${amount.toLocaleString()} = ₦${calculatedAmount.toLocaleString()}`;
      } else if (fee!.calcType === 'SLAB') {
        const tier = fee!.tiers?.find((t) => amount >= t.fromAmount && amount <= t.toAmount);
        calculatedAmount = tier?.flatFee || fee!.tiers?.[0]?.flatFee || 0;
        breakdown = `Slab match: ₦${calculatedAmount.toLocaleString()} flat`;
      } else if (fee!.calcType === 'TIERED') {
        const tier = fee!.tiers?.find((t) => amount >= t.fromAmount && amount <= t.toAmount);
        calculatedAmount = ((tier?.rate || 0) / 100) * amount;
        if (fee!.minFee) calculatedAmount = Math.max(calculatedAmount, fee!.minFee);
        if (fee!.maxFee) calculatedAmount = Math.min(calculatedAmount, fee!.maxFee);
        breakdown = `Tier rate: ${tier?.rate || 0}% of ₦${amount.toLocaleString()} = ₦${calculatedAmount.toLocaleString()}`;
      }

      const vatAmount = fee!.vatApplicable ? (calculatedAmount * (fee!.vatRate || 7.5)) / 100 : 0;

      return {
        feeId: fee!.id,
        feeName: fee!.name,
        calculatedAmount,
        vatAmount,
        breakdown,
      };
    });

  const totalFees = applicableFees.reduce((sum, f) => sum + f.calculatedAmount, 0);
  const totalVat = applicableFees.reduce((sum, f) => sum + f.vatAmount, 0);

  return {
    customerId,
    customerName: customerNames[customerId] || 'Unknown Customer',
    eventType,
    transactionAmount: amount,
    applicableFees,
    totalFees,
    totalVat,
    totalCharge: totalFees + totalVat,
  };
}

export async function createBulkFeeJob(feeId: string, scheduledDate: string): Promise<BulkFeeJob> {
  await delay(800);
  const fee = MOCK_FEES.find((f) => f.id === feeId);
  if (!fee) throw new Error(`Fee ${feeId} not found`);

  const job: BulkFeeJob = {
    id: `bulk-${Date.now()}`,
    feeId,
    feeName: fee.name,
    affectedAccounts: Math.floor(Math.random() * 15000 + 1000),
    totalAmount: 0,
    processedCount: 0,
    failedCount: 0,
    status: 'PENDING',
    scheduledDate,
    createdAt: new Date().toISOString(),
  };
  job.totalAmount = job.affectedAccounts * (fee.flatAmount || 500);
  MOCK_BULK_JOBS.push(job);
  return job;
}

export async function getBulkFeeJobs(): Promise<BulkFeeJob[]> {
  await delay(400);
  return [...MOCK_BULK_JOBS];
}

export interface BulkFeePreview {
  feeId: string;
  feeName: string;
  affectedAccounts: number;
  totalAmount: number;
  sampleAccounts: { accountNumber: string; customerName: string; amount: number }[];
}

export async function previewBulkFeeJob(feeId: string): Promise<BulkFeePreview> {
  await delay(700);
  const fee = MOCK_FEES.find((f) => f.id === feeId);
  if (!fee) throw new Error(`Fee ${feeId} not found`);

  const affected = Math.floor(Math.random() * 15000 + 1000);
  const unitAmount = fee.flatAmount || 500;

  return {
    feeId,
    feeName: fee.name,
    affectedAccounts: affected,
    totalAmount: affected * unitAmount,
    sampleAccounts: [
      { accountNumber: '0123456789', customerName: 'Amara Okonkwo', amount: unitAmount },
      { accountNumber: '0234567890', customerName: 'TechVentures Nigeria Ltd', amount: unitAmount },
      { accountNumber: '0345678901', customerName: 'Ibrahim Musa', amount: unitAmount },
      { accountNumber: '0456789012', customerName: 'Chidi Enterprises', amount: unitAmount },
      { accountNumber: '0567890123', customerName: 'Fatima Al-Hassan', amount: unitAmount },
    ],
  };
}
