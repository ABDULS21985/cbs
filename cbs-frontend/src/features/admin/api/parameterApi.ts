export type ParameterType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'DATE' | 'TIME';
export type ParameterCategory =
  | 'GENERAL'
  | 'LIMITS'
  | 'FEES'
  | 'INTEREST'
  | 'SECURITY'
  | 'INTEGRATION'
  | 'EOD'
  | 'NOTIFICATION';

export interface SystemParameter {
  code: string;
  name: string;
  description: string;
  category: ParameterCategory;
  value: string;
  type: ParameterType;
  defaultValue: string;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  requiresApproval: boolean;
}

export interface ParameterHistory {
  id: string;
  changedAt: string;
  changedBy: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface FeatureFlag {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  tag?: string;
  lastChangedAt?: string;
  lastChangedBy?: string;
}

export interface RateTier {
  id: string;
  minValue: number;
  maxValue?: number;
  row?: string;
  col?: string;
  rate: number;
}

export interface RateTable {
  id: string;
  name: string;
  type: 'SAVINGS' | 'FD' | 'LENDING' | 'PENALTY';
  effectiveDate: string;
  status: 'ACTIVE' | 'DRAFT' | 'SUPERSEDED';
  tiers: RateTier[];
}

export interface RateTableUpdateRequest {
  name?: string;
  effectiveDate?: string;
  tiers: RateTier[];
}

export interface LookupCode {
  id: string;
  code: string;
  description: string;
  category: string;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder: number;
}

export interface CreateLookupRequest {
  code: string;
  description: string;
  category: string;
  displayOrder: number;
}

export interface SystemInfo {
  appVersion: string;
  dbVersion: string;
  javaVersion: string;
  springBootVersion: string;
  lastDeployment: string;
  uptimeSeconds: number;
  health: {
    database: boolean;
    redis: boolean;
    messageQueue: boolean;
    externalProviders: { total: number; healthy: number };
    diskUsagePct: number;
    memoryUsagePct: number;
  };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

const MOCK_PARAMETERS: SystemParameter[] = [
  {
    code: 'GEN_BANK_NAME',
    name: 'Bank Name',
    description: 'Full legal name of the bank as registered',
    category: 'GENERAL',
    value: 'Central Banking Solutions Ltd',
    type: 'STRING',
    defaultValue: 'CBS Bank',
    regexPattern: '^[A-Za-z ]{3,100}$',
    lastModifiedAt: '2025-01-10T08:00:00Z',
    lastModifiedBy: 'admin@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'GEN_BANK_CODE',
    name: 'Bank Sort Code',
    description: 'Interbank sort code for clearing purposes',
    category: 'GENERAL',
    value: '058',
    type: 'STRING',
    defaultValue: '058',
    regexPattern: '^[0-9]{3}$',
    lastModifiedAt: '2024-06-01T09:00:00Z',
    lastModifiedBy: 'system@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'GEN_DEFAULT_CURRENCY',
    name: 'Default Currency',
    description: 'System default transaction currency',
    category: 'GENERAL',
    value: 'NGN',
    type: 'STRING',
    defaultValue: 'NGN',
    regexPattern: '^[A-Z]{3}$',
    lastModifiedAt: '2024-01-01T00:00:00Z',
    lastModifiedBy: 'system@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'GEN_FISCAL_YEAR_START',
    name: 'Fiscal Year Start Month',
    description: 'Month in which the bank fiscal year begins (1–12)',
    category: 'GENERAL',
    value: '1',
    type: 'NUMBER',
    defaultValue: '1',
    minValue: 1,
    maxValue: 12,
    lastModifiedAt: '2024-01-01T00:00:00Z',
    lastModifiedBy: 'system@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'GEN_MAINTENANCE_MODE',
    name: 'Maintenance Mode',
    description: 'When enabled, the system rejects all new transactions',
    category: 'GENERAL',
    value: 'false',
    type: 'BOOLEAN',
    defaultValue: 'false',
    lastModifiedAt: '2025-03-01T02:00:00Z',
    lastModifiedBy: 'ops@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'LIM_MAX_DAILY_TRANSFER',
    name: 'Max Daily Transfer (Individual)',
    description: 'Maximum cumulative transfer amount per individual customer per day',
    category: 'LIMITS',
    value: '5000000',
    type: 'NUMBER',
    defaultValue: '2000000',
    minValue: 100000,
    maxValue: 50000000,
    lastModifiedAt: '2025-02-14T11:30:00Z',
    lastModifiedBy: 'riskteam@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'LIM_MAX_SINGLE_TRANSFER',
    name: 'Max Single Transfer',
    description: 'Maximum amount for a single interbank transfer',
    category: 'LIMITS',
    value: '1000000',
    type: 'NUMBER',
    defaultValue: '500000',
    minValue: 10000,
    maxValue: 10000000,
    lastModifiedAt: '2025-01-20T09:15:00Z',
    lastModifiedBy: 'riskteam@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'LIM_ATM_DAILY_WITHDRAWAL',
    name: 'ATM Daily Withdrawal Limit',
    description: 'Maximum cash withdrawal per customer per day across all ATMs',
    category: 'LIMITS',
    value: '200000',
    type: 'NUMBER',
    defaultValue: '150000',
    minValue: 10000,
    maxValue: 1000000,
    lastModifiedAt: '2024-11-05T14:00:00Z',
    lastModifiedBy: 'ops@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'LIM_MIN_ACCOUNT_BALANCE',
    name: 'Minimum Account Balance',
    description: 'Minimum balance to prevent account from being flagged as dormant',
    category: 'LIMITS',
    value: '500',
    type: 'NUMBER',
    defaultValue: '1000',
    minValue: 0,
    maxValue: 100000,
    lastModifiedAt: '2024-09-01T10:00:00Z',
    lastModifiedBy: 'product@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'FEE_INTERBANK_TRANSFER',
    name: 'Interbank Transfer Fee (NGN)',
    description: 'Flat fee charged per interbank (NIP) transfer',
    category: 'FEES',
    value: '50',
    type: 'NUMBER',
    defaultValue: '50',
    minValue: 0,
    maxValue: 5000,
    lastModifiedAt: '2025-01-01T00:00:00Z',
    lastModifiedBy: 'product@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'FEE_ATM_OFFUS',
    name: 'ATM Off-Us Withdrawal Fee',
    description: 'Fee charged when customer withdraws from another bank ATM',
    category: 'FEES',
    value: '65',
    type: 'NUMBER',
    defaultValue: '65',
    minValue: 0,
    maxValue: 500,
    lastModifiedAt: '2024-06-15T00:00:00Z',
    lastModifiedBy: 'product@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'FEE_SMS_ALERT',
    name: 'SMS Alert Fee (Monthly)',
    description: 'Monthly SMS notification charge per account',
    category: 'FEES',
    value: '50',
    type: 'NUMBER',
    defaultValue: '50',
    minValue: 0,
    maxValue: 200,
    lastModifiedAt: '2024-03-01T00:00:00Z',
    lastModifiedBy: 'product@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'FEE_STAMP_DUTY_THRESHOLD',
    name: 'Stamp Duty Threshold (NGN)',
    description: 'Credit transactions above this amount attract NGN 50 stamp duty',
    category: 'FEES',
    value: '10000',
    type: 'NUMBER',
    defaultValue: '10000',
    minValue: 0,
    lastModifiedAt: '2024-01-01T00:00:00Z',
    lastModifiedBy: 'compliance@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'INT_BASE_SAVINGS_RATE',
    name: 'Base Savings Interest Rate (%)',
    description: 'Minimum interest rate applied to all savings accounts',
    category: 'INTEREST',
    value: '1.5',
    type: 'NUMBER',
    defaultValue: '1.0',
    minValue: 0,
    maxValue: 30,
    lastModifiedAt: '2025-02-01T00:00:00Z',
    lastModifiedBy: 'treasury@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'INT_OVERDRAFT_RATE',
    name: 'Overdraft Interest Rate (%)',
    description: 'Annual interest rate charged on overdraft balances',
    category: 'INTEREST',
    value: '27.5',
    type: 'NUMBER',
    defaultValue: '25.0',
    minValue: 5,
    maxValue: 50,
    lastModifiedAt: '2025-01-15T08:00:00Z',
    lastModifiedBy: 'treasury@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'INT_PENALTY_RATE',
    name: 'Loan Penalty Rate (%)',
    description: 'Additional interest rate applied to overdue loan instalments',
    category: 'INTEREST',
    value: '5.0',
    type: 'NUMBER',
    defaultValue: '5.0',
    minValue: 0,
    maxValue: 20,
    lastModifiedAt: '2024-08-01T00:00:00Z',
    lastModifiedBy: 'credit@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'SEC_SESSION_TIMEOUT_MINS',
    name: 'Session Timeout (Minutes)',
    description: 'Duration of user inactivity before session expires',
    category: 'SECURITY',
    value: '30',
    type: 'NUMBER',
    defaultValue: '20',
    minValue: 5,
    maxValue: 120,
    lastModifiedAt: '2025-01-05T10:00:00Z',
    lastModifiedBy: 'security@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'SEC_MAX_LOGIN_ATTEMPTS',
    name: 'Max Failed Login Attempts',
    description: 'Number of failed login attempts before account is locked',
    category: 'SECURITY',
    value: '5',
    type: 'NUMBER',
    defaultValue: '5',
    minValue: 3,
    maxValue: 10,
    lastModifiedAt: '2024-12-01T00:00:00Z',
    lastModifiedBy: 'security@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'SEC_PASSWORD_MIN_LENGTH',
    name: 'Password Minimum Length',
    description: 'Minimum number of characters required for user passwords',
    category: 'SECURITY',
    value: '8',
    type: 'NUMBER',
    defaultValue: '8',
    minValue: 6,
    maxValue: 32,
    lastModifiedAt: '2024-11-01T00:00:00Z',
    lastModifiedBy: 'security@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'SEC_MFA_REQUIRED',
    name: 'MFA Required for Staff',
    description: 'Whether multi-factor authentication is mandatory for all staff logins',
    category: 'SECURITY',
    value: 'true',
    type: 'BOOLEAN',
    defaultValue: 'true',
    lastModifiedAt: '2024-10-01T00:00:00Z',
    lastModifiedBy: 'security@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'INT_NIP_API_BASE_URL',
    name: 'NIP API Base URL',
    description: 'NIBSS Instant Payment gateway base URL',
    category: 'INTEGRATION',
    value: 'https://nip.nibss-plc.com.ng/api/v2',
    type: 'STRING',
    defaultValue: 'https://nip.nibss-plc.com.ng/api/v2',
    lastModifiedAt: '2024-07-15T09:00:00Z',
    lastModifiedBy: 'integration@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'INT_SMS_GATEWAY',
    name: 'SMS Gateway Provider',
    description: 'Active SMS notification provider identifier',
    category: 'INTEGRATION',
    value: 'TERMII',
    type: 'STRING',
    defaultValue: 'TERMII',
    regexPattern: '^(TERMII|INFOBIP|TWILIO)$',
    lastModifiedAt: '2025-01-01T00:00:00Z',
    lastModifiedBy: 'integration@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'INT_BVN_VERIFY_ENABLED',
    name: 'BVN Verification Enabled',
    description: 'Whether BVN verification is required during customer onboarding',
    category: 'INTEGRATION',
    value: 'true',
    type: 'BOOLEAN',
    defaultValue: 'true',
    lastModifiedAt: '2024-01-01T00:00:00Z',
    lastModifiedBy: 'compliance@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'EOD_RUN_TIME',
    name: 'EOD Run Time',
    description: 'Scheduled time for end-of-day batch processing (HH:MM)',
    category: 'EOD',
    value: '23:30',
    type: 'TIME',
    defaultValue: '23:00',
    lastModifiedAt: '2024-12-01T00:00:00Z',
    lastModifiedBy: 'ops@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'EOD_INTEREST_CALC_DATE',
    name: 'Interest Calculation Reference Date',
    description: 'Date from which interest accrual is recalculated during EOD',
    category: 'EOD',
    value: '2025-01-01',
    type: 'DATE',
    defaultValue: '2025-01-01',
    lastModifiedAt: '2025-01-01T23:45:00Z',
    lastModifiedBy: 'system@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'EOD_DORMANCY_THRESHOLD_DAYS',
    name: 'Dormancy Threshold (Days)',
    description: 'Number of inactive days before an account is marked dormant',
    category: 'EOD',
    value: '180',
    type: 'NUMBER',
    defaultValue: '180',
    minValue: 30,
    maxValue: 730,
    lastModifiedAt: '2024-06-01T00:00:00Z',
    lastModifiedBy: 'ops@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'EOD_CONFIG_JSON',
    name: 'EOD Job Configuration',
    description: 'JSON configuration for EOD batch job steps and ordering',
    category: 'EOD',
    value: '{"steps":["interest","fees","dormancy","statements","reports"],"retryOnFailure":true,"notifyOnCompletion":true}',
    type: 'JSON',
    defaultValue: '{"steps":["interest","fees","dormancy","statements","reports"],"retryOnFailure":true,"notifyOnCompletion":true}',
    lastModifiedAt: '2025-02-10T16:00:00Z',
    lastModifiedBy: 'ops@cbs.com',
    requiresApproval: true,
  },
  {
    code: 'NOTIF_EMAIL_FROM',
    name: 'System Email Sender',
    description: 'From address for all system-generated emails',
    category: 'NOTIFICATION',
    value: 'noreply@cbs.com',
    type: 'STRING',
    defaultValue: 'noreply@cbs.com',
    regexPattern: '^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$',
    lastModifiedAt: '2024-11-01T00:00:00Z',
    lastModifiedBy: 'admin@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'NOTIF_SMS_ENABLED',
    name: 'SMS Notifications Enabled',
    description: 'Global toggle for outbound SMS alerts to customers',
    category: 'NOTIFICATION',
    value: 'true',
    type: 'BOOLEAN',
    defaultValue: 'true',
    lastModifiedAt: '2025-03-01T08:00:00Z',
    lastModifiedBy: 'admin@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'NOTIF_ALERT_THRESHOLD',
    name: 'Transaction Alert Threshold (NGN)',
    description: 'Minimum transaction value that triggers an SMS/email alert',
    category: 'NOTIFICATION',
    value: '1000',
    type: 'NUMBER',
    defaultValue: '1000',
    minValue: 0,
    maxValue: 1000000,
    lastModifiedAt: '2024-08-01T00:00:00Z',
    lastModifiedBy: 'product@cbs.com',
    requiresApproval: false,
  },
  {
    code: 'NOTIF_DIGEST_TIME',
    name: 'Daily Digest Send Time',
    description: 'Time at which daily account digest is dispatched to opted-in customers',
    category: 'NOTIFICATION',
    value: '07:00',
    type: 'TIME',
    defaultValue: '08:00',
    lastModifiedAt: '2025-01-10T00:00:00Z',
    lastModifiedBy: 'admin@cbs.com',
    requiresApproval: false,
  },
];

const MOCK_PARAMETER_HISTORY: Record<string, ParameterHistory[]> = {
  GEN_BANK_NAME: [
    {
      id: 'h-001',
      changedAt: '2025-01-10T08:00:00Z',
      changedBy: 'admin@cbs.com',
      oldValue: 'CBS Microfinance Bank',
      newValue: 'Central Banking Solutions Ltd',
      reason: 'Corporate rebranding approved by Board resolution BR-2025-001',
    },
    {
      id: 'h-002',
      changedAt: '2024-03-15T10:30:00Z',
      changedBy: 'admin@cbs.com',
      oldValue: 'CBS Bank',
      newValue: 'CBS Microfinance Bank',
      reason: 'Regulatory requirement: full legal name in system',
    },
  ],
  LIM_MAX_DAILY_TRANSFER: [
    {
      id: 'h-003',
      changedAt: '2025-02-14T11:30:00Z',
      changedBy: 'riskteam@cbs.com',
      oldValue: '3000000',
      newValue: '5000000',
      reason: 'Increased limit following CBN circular on retail payment limits',
    },
    {
      id: 'h-004',
      changedAt: '2024-07-01T09:00:00Z',
      changedBy: 'riskteam@cbs.com',
      oldValue: '2000000',
      newValue: '3000000',
      reason: 'Gradual increase approved by Risk Committee in Q3 review',
    },
    {
      id: 'h-005',
      changedAt: '2023-11-01T00:00:00Z',
      changedBy: 'riskteam@cbs.com',
      oldValue: '1500000',
      newValue: '2000000',
      reason: 'Year-end limit revision for premium segment customers',
    },
  ],
  INT_BASE_SAVINGS_RATE: [
    {
      id: 'h-006',
      changedAt: '2025-02-01T00:00:00Z',
      changedBy: 'treasury@cbs.com',
      oldValue: '1.25',
      newValue: '1.5',
      reason: 'MPC rate adjustment response — improving deposit competitiveness',
    },
    {
      id: 'h-007',
      changedAt: '2024-10-01T00:00:00Z',
      changedBy: 'treasury@cbs.com',
      oldValue: '1.0',
      newValue: '1.25',
      reason: 'Competitive benchmarking against peer banks Q4 2024',
    },
  ],
};

const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  {
    code: 'FEAT_VIRTUAL_CARDS',
    name: 'Virtual Card Issuance',
    description: 'Allow customers to create virtual debit cards for online purchases via the mobile app',
    enabled: true,
    lastChangedAt: '2025-02-01T10:00:00Z',
    lastChangedBy: 'product@cbs.com',
  },
  {
    code: 'FEAT_INSTANT_LOAN',
    name: 'Instant Loan Pre-qualification',
    description: 'AI-powered real-time loan pre-qualification in the mobile app using behavioral scoring',
    enabled: true,
    tag: 'Beta',
    lastChangedAt: '2025-03-01T09:00:00Z',
    lastChangedBy: 'credit@cbs.com',
  },
  {
    code: 'FEAT_CRYPTO_GATEWAY',
    name: 'Cryptocurrency Exchange Gateway',
    description: 'Integration with licensed crypto exchange platforms for buy/sell orders',
    enabled: false,
    tag: 'Not Approved',
    lastChangedAt: '2024-12-15T14:00:00Z',
    lastChangedBy: 'compliance@cbs.com',
  },
  {
    code: 'FEAT_INVESTMENT_MODULE',
    name: 'Investment & Wealth Management',
    description: 'In-app access to Treasury Bills, bonds, and mutual fund investment products',
    enabled: false,
    tag: 'Coming Soon',
    lastChangedAt: '2025-01-20T11:00:00Z',
    lastChangedBy: 'product@cbs.com',
  },
  {
    code: 'FEAT_BIOMETRIC_LOGIN',
    name: 'Biometric Authentication',
    description: 'Fingerprint and face recognition login for the mobile banking app',
    enabled: true,
    lastChangedAt: '2025-01-05T08:00:00Z',
    lastChangedBy: 'security@cbs.com',
  },
  {
    code: 'FEAT_CHATBOT_SUPPORT',
    name: 'AI Chatbot Customer Support',
    description: 'Automated chatbot for first-line customer support and FAQs in the mobile app',
    enabled: true,
    tag: 'Beta',
    lastChangedAt: '2025-02-15T13:00:00Z',
    lastChangedBy: 'cx@cbs.com',
  },
  {
    code: 'FEAT_OPEN_BANKING',
    name: 'Open Banking API',
    description: 'Third-party access to account data and payment initiation via PSD2-style open banking APIs',
    enabled: false,
    tag: 'Coming Soon',
    lastChangedAt: '2025-03-10T10:00:00Z',
    lastChangedBy: 'integration@cbs.com',
  },
  {
    code: 'FEAT_CARDLESS_WITHDRAWAL',
    name: 'Cardless ATM Withdrawal',
    description: 'Allow customers to withdraw cash at ATMs using a one-time mobile-generated token',
    enabled: true,
    lastChangedAt: '2024-11-20T09:00:00Z',
    lastChangedBy: 'ops@cbs.com',
  },
];

const MOCK_RATE_TABLES: RateTable[] = [
  {
    id: 'rt-001',
    name: 'Retail Savings Interest Rates',
    type: 'SAVINGS',
    effectiveDate: '2025-02-01',
    status: 'ACTIVE',
    tiers: [
      { id: 'rt1-t1', minValue: 0, maxValue: 99999, rate: 1.5 },
      { id: 'rt1-t2', minValue: 100000, maxValue: 499999, rate: 2.5 },
      { id: 'rt1-t3', minValue: 500000, maxValue: 999999, rate: 3.5 },
      { id: 'rt1-t4', minValue: 1000000, maxValue: 4999999, rate: 4.5 },
      { id: 'rt1-t5', minValue: 5000000, rate: 6.0 },
    ],
  },
  {
    id: 'rt-002',
    name: 'Fixed Deposit Rates by Tenor',
    type: 'FD',
    effectiveDate: '2025-01-01',
    status: 'ACTIVE',
    tiers: [
      { id: 'rt2-t1', minValue: 30, maxValue: 60, row: '30 Days', rate: 8.0 },
      { id: 'rt2-t2', minValue: 61, maxValue: 90, row: '60 Days', rate: 9.0 },
      { id: 'rt2-t3', minValue: 91, maxValue: 180, row: '90 Days', rate: 10.5 },
      { id: 'rt2-t4', minValue: 181, maxValue: 365, row: '180 Days', rate: 12.0 },
      { id: 'rt2-t5', minValue: 366, row: '365 Days', rate: 14.5 },
    ],
  },
  {
    id: 'rt-003',
    name: 'SME Lending Rate Matrix',
    type: 'LENDING',
    effectiveDate: '2025-03-01',
    status: 'ACTIVE',
    tiers: [
      { id: 'rt3-t1', minValue: 0, maxValue: 5000000, row: 'Grade A', col: '0–5M', rate: 18.0 },
      { id: 'rt3-t2', minValue: 5000001, maxValue: 20000000, row: 'Grade A', col: '5M–20M', rate: 17.5 },
      { id: 'rt3-t3', minValue: 20000001, row: 'Grade A', col: '20M+', rate: 16.5 },
      { id: 'rt3-t4', minValue: 0, maxValue: 5000000, row: 'Grade B', col: '0–5M', rate: 21.0 },
      { id: 'rt3-t5', minValue: 5000001, maxValue: 20000000, row: 'Grade B', col: '5M–20M', rate: 20.0 },
      { id: 'rt3-t6', minValue: 20000001, row: 'Grade B', col: '20M+', rate: 19.0 },
      { id: 'rt3-t7', minValue: 0, maxValue: 5000000, row: 'Grade C', col: '0–5M', rate: 25.0 },
      { id: 'rt3-t8', minValue: 5000001, maxValue: 20000000, row: 'Grade C', col: '5M–20M', rate: 24.0 },
      { id: 'rt3-t9', minValue: 20000001, row: 'Grade C', col: '20M+', rate: 22.5 },
    ],
  },
];

const MOCK_LOOKUP_CODES: LookupCode[] = [
  { id: 'lk-001', code: 'GEN_MALE', description: 'Male', category: 'GENDER', status: 'ACTIVE', displayOrder: 1 },
  { id: 'lk-002', code: 'GEN_FEMALE', description: 'Female', category: 'GENDER', status: 'ACTIVE', displayOrder: 2 },
  { id: 'lk-003', code: 'GEN_OTHER', description: 'Other / Prefer not to say', category: 'GENDER', status: 'ACTIVE', displayOrder: 3 },
  { id: 'lk-004', code: 'MAR_SINGLE', description: 'Single', category: 'MARITAL_STATUS', status: 'ACTIVE', displayOrder: 1 },
  { id: 'lk-005', code: 'MAR_MARRIED', description: 'Married', category: 'MARITAL_STATUS', status: 'ACTIVE', displayOrder: 2 },
  { id: 'lk-006', code: 'MAR_DIVORCED', description: 'Divorced', category: 'MARITAL_STATUS', status: 'ACTIVE', displayOrder: 3 },
  { id: 'lk-007', code: 'MAR_WIDOWED', description: 'Widowed', category: 'MARITAL_STATUS', status: 'ACTIVE', displayOrder: 4 },
  { id: 'lk-008', code: 'ID_NIN', description: 'National ID Number (NIN)', category: 'ID_TYPE', status: 'ACTIVE', displayOrder: 1 },
  { id: 'lk-009', code: 'ID_BVN', description: 'Bank Verification Number (BVN)', category: 'ID_TYPE', status: 'ACTIVE', displayOrder: 2 },
  { id: 'lk-010', code: 'ID_PASSPORT', description: 'International Passport', category: 'ID_TYPE', status: 'ACTIVE', displayOrder: 3 },
  { id: 'lk-011', code: 'ID_DRIVERS', description: "Driver's License", category: 'ID_TYPE', status: 'ACTIVE', displayOrder: 4 },
  { id: 'lk-012', code: 'ID_VOTERSCARD', description: "Voter's Card", category: 'ID_TYPE', status: 'ACTIVE', displayOrder: 5 },
  { id: 'lk-013', code: 'OCC_EMPLOYED', description: 'Employed (Private Sector)', category: 'OCCUPATION', status: 'ACTIVE', displayOrder: 1 },
  { id: 'lk-014', code: 'OCC_CIVIL', description: 'Civil Servant', category: 'OCCUPATION', status: 'ACTIVE', displayOrder: 2 },
  { id: 'lk-015', code: 'OCC_SELFEMPLOYED', description: 'Self-Employed / Business Owner', category: 'OCCUPATION', status: 'ACTIVE', displayOrder: 3 },
  { id: 'lk-016', code: 'OCC_STUDENT', description: 'Student', category: 'OCCUPATION', status: 'ACTIVE', displayOrder: 4 },
  { id: 'lk-017', code: 'OCC_RETIRED', description: 'Retired', category: 'OCCUPATION', status: 'INACTIVE', displayOrder: 5 },
  { id: 'lk-018', code: 'REL_SELF', description: 'Self', category: 'NEXT_OF_KIN_RELATIONSHIP', status: 'ACTIVE', displayOrder: 1 },
  { id: 'lk-019', code: 'REL_SPOUSE', description: 'Spouse', category: 'NEXT_OF_KIN_RELATIONSHIP', status: 'ACTIVE', displayOrder: 2 },
  { id: 'lk-020', code: 'REL_CHILD', description: 'Child', category: 'NEXT_OF_KIN_RELATIONSHIP', status: 'ACTIVE', displayOrder: 3 },
  { id: 'lk-021', code: 'REL_PARENT', description: 'Parent', category: 'NEXT_OF_KIN_RELATIONSHIP', status: 'ACTIVE', displayOrder: 4 },
  { id: 'lk-022', code: 'REL_SIBLING', description: 'Sibling', category: 'NEXT_OF_KIN_RELATIONSHIP', status: 'ACTIVE', displayOrder: 5 },
  { id: 'lk-023', code: 'CLOS_DECEASED', description: 'Customer Deceased', category: 'ACCOUNT_CLOSURE_REASON', status: 'ACTIVE', displayOrder: 1 },
  { id: 'lk-024', code: 'CLOS_MIGRATION', description: 'Migration to Another Bank', category: 'ACCOUNT_CLOSURE_REASON', status: 'ACTIVE', displayOrder: 2 },
  { id: 'lk-025', code: 'CLOS_FRAUD', description: 'Fraud / Security Breach', category: 'ACCOUNT_CLOSURE_REASON', status: 'ACTIVE', displayOrder: 3 },
];

const MOCK_SYSTEM_INFO: SystemInfo = {
  appVersion: '2.4.1',
  dbVersion: 'PostgreSQL 16.2',
  javaVersion: 'OpenJDK 21.0.3',
  springBootVersion: '3.2.5',
  lastDeployment: '2025-03-15T02:00:00Z',
  uptimeSeconds: 358200,
  health: {
    database: true,
    redis: true,
    messageQueue: true,
    externalProviders: { total: 6, healthy: 5 },
    diskUsagePct: 62,
    memoryUsagePct: 74,
  },
};

// ─── API Functions ────────────────────────────────────────────────────────────

async function getParameters(params?: { category?: string; search?: string }): Promise<SystemParameter[]> {
  await delay(400);
  let results = [...MOCK_PARAMETERS];
  if (params?.category && params.category !== 'ALL') {
    results = results.filter((p) => p.category === params.category);
  }
  if (params?.search) {
    const s = params.search.toLowerCase();
    results = results.filter(
      (p) =>
        p.code.toLowerCase().includes(s) ||
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s),
    );
  }
  return results;
}

async function getParameter(code: string): Promise<SystemParameter> {
  await delay(300);
  const param = MOCK_PARAMETERS.find((p) => p.code === code);
  if (!param) throw new Error(`Parameter ${code} not found`);
  return { ...param };
}

async function updateParameter(code: string, data: { value: string; reason: string }): Promise<SystemParameter> {
  await delay(600);
  const idx = MOCK_PARAMETERS.findIndex((p) => p.code === code);
  if (idx === -1) throw new Error(`Parameter ${code} not found`);
  const oldValue = MOCK_PARAMETERS[idx].value;
  MOCK_PARAMETERS[idx] = {
    ...MOCK_PARAMETERS[idx],
    value: data.value,
    lastModifiedAt: new Date().toISOString(),
    lastModifiedBy: 'current.user@cbs.com',
  };
  const history = MOCK_PARAMETER_HISTORY[code] ?? [];
  history.unshift({
    id: `h-${Date.now()}`,
    changedAt: new Date().toISOString(),
    changedBy: 'current.user@cbs.com',
    oldValue,
    newValue: data.value,
    reason: data.reason,
  });
  MOCK_PARAMETER_HISTORY[code] = history;
  return { ...MOCK_PARAMETERS[idx] };
}

async function getParameterHistory(code: string): Promise<ParameterHistory[]> {
  await delay(300);
  return MOCK_PARAMETER_HISTORY[code] ?? [];
}

async function getFeatureFlags(): Promise<FeatureFlag[]> {
  await delay(400);
  return [...MOCK_FEATURE_FLAGS];
}

async function toggleFeatureFlag(code: string, enabled: boolean, reason: string): Promise<FeatureFlag> {
  await delay(500);
  const idx = MOCK_FEATURE_FLAGS.findIndex((f) => f.code === code);
  if (idx === -1) throw new Error(`Feature flag ${code} not found`);
  MOCK_FEATURE_FLAGS[idx] = {
    ...MOCK_FEATURE_FLAGS[idx],
    enabled,
    lastChangedAt: new Date().toISOString(),
    lastChangedBy: 'current.user@cbs.com',
  };
  void reason;
  return { ...MOCK_FEATURE_FLAGS[idx] };
}

async function getRateTables(): Promise<RateTable[]> {
  await delay(400);
  return MOCK_RATE_TABLES.map((rt) => ({ ...rt, tiers: [] }));
}

async function getRateTable(id: string): Promise<RateTable> {
  await delay(300);
  const rt = MOCK_RATE_TABLES.find((r) => r.id === id);
  if (!rt) throw new Error(`Rate table ${id} not found`);
  return { ...rt, tiers: rt.tiers.map((t) => ({ ...t })) };
}

async function updateRateTable(id: string, data: RateTableUpdateRequest): Promise<RateTable> {
  await delay(700);
  const idx = MOCK_RATE_TABLES.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Rate table ${id} not found`);
  MOCK_RATE_TABLES[idx] = { ...MOCK_RATE_TABLES[idx], ...data };
  return { ...MOCK_RATE_TABLES[idx] };
}

async function getLookupCodes(params?: { category?: string }): Promise<LookupCode[]> {
  await delay(400);
  let results = [...MOCK_LOOKUP_CODES];
  if (params?.category && params.category !== 'ALL') {
    results = results.filter((l) => l.category === params.category);
  }
  return results.sort((a, b) => a.displayOrder - b.displayOrder);
}

async function createLookupCode(data: CreateLookupRequest): Promise<LookupCode> {
  await delay(500);
  const newCode: LookupCode = {
    id: `lk-${Date.now()}`,
    ...data,
    status: 'ACTIVE',
  };
  MOCK_LOOKUP_CODES.push(newCode);
  return newCode;
}

async function updateLookupCode(id: string, data: Partial<LookupCode>): Promise<LookupCode> {
  await delay(400);
  const idx = MOCK_LOOKUP_CODES.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error(`Lookup code ${id} not found`);
  MOCK_LOOKUP_CODES[idx] = { ...MOCK_LOOKUP_CODES[idx], ...data };
  return { ...MOCK_LOOKUP_CODES[idx] };
}

async function getSystemInfo(): Promise<SystemInfo> {
  await delay(500);
  return { ...MOCK_SYSTEM_INFO, health: { ...MOCK_SYSTEM_INFO.health, externalProviders: { ...MOCK_SYSTEM_INFO.health.externalProviders } } };
}

export const parameterApi = {
  getParameters,
  getParameter,
  updateParameter,
  getParameterHistory,
  getFeatureFlags,
  toggleFeatureFlag,
  getRateTables,
  getRateTable,
  updateRateTable,
  getLookupCodes,
  createLookupCode,
  updateLookupCode,
  getSystemInfo,
};
