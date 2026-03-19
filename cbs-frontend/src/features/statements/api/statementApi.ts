// ─── Types ────────────────────────────────────────────────────────────────────

export type StatementFormat = 'PDF' | 'CSV' | 'EXCEL';
export type StatementType = 'FULL' | 'MINI' | 'INTEREST_CERTIFICATE';
export type DeliveryMethod = 'EMAIL' | 'PORTAL';
export type SubscriptionFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface StatementTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
  channel?: string;
}

export interface StatementData {
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  transactions: StatementTransaction[];
  // Bank info
  bankName: string;
  bankAddress: string;
  bankLicense: string;
  bankEmail: string;
  bankPhone: string;
}

export interface CertificateData {
  referenceNumber: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  balance: number;
  balanceDate: string;
  addressedTo: string;
  generatedAt: string;
  authorizedBy: string;
  authorizedTitle: string;
  bankName: string;
  bankAddress: string;
}

export interface AccountConfirmationData {
  referenceNumber: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  openingDate: string;
  currency: string;
  status: string;
  addressedTo: string;
  purpose: string;
  generatedAt: string;
  bankName: string;
  bankAddress: string;
}

export interface StatementSubscription {
  id: string;
  accountId: string;
  accountNumber: string;
  frequency: SubscriptionFrequency;
  delivery: DeliveryMethod;
  format: StatementFormat;
  email?: string;
  active: boolean;
  nextDelivery: string;
  createdAt: string;
}

export interface GenerateStatementParams {
  accountId: string;
  from: string;
  to: string;
  type: StatementType;
}

export interface CreateSubscriptionData {
  accountId: string;
  frequency: SubscriptionFrequency;
  delivery: DeliveryMethod;
  format: StatementFormat;
  email?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const BANK_INFO = {
  bankName: 'BellBank Microfinance Bank Limited',
  bankAddress: '123 Banking Street, Central Business District, Abuja, FCT, Nigeria',
  bankLicense: 'CBN/MFB/XXX/2020',
  bankEmail: 'support@bellbank.ng',
  bankPhone: '0700-BELL-BANK',
};

const MOCK_ACCOUNTS: Record<string, { accountNumber: string; accountName: string; accountType: string; currency: string; email: string }> = {
  'acc-001': { accountNumber: '0123456789', accountName: 'Amara Okonkwo', accountType: 'Savings Account', currency: 'NGN', email: 'amara.okonkwo@gmail.com' },
  'acc-002': { accountNumber: '0234567890', accountName: 'TechVentures Nigeria Ltd', accountType: 'Current Account', currency: 'NGN', email: 'finance@techventures.ng' },
  'acc-003': { accountNumber: '0345678901', accountName: 'Ibrahim Musa', accountType: 'Savings Account', currency: 'NGN', email: 'ibrahim.musa@yahoo.com' },
  'acc-004': { accountNumber: '0456789012', accountName: 'Fatima Al-Hassan', accountType: 'Premium Savings', currency: 'NGN', email: 'fatima.alhassan@outlook.com' },
};

const DEFAULT_ACCOUNT_ID = 'acc-001';

function getAccount(accountId: string) {
  return MOCK_ACCOUNTS[accountId] ?? MOCK_ACCOUNTS[DEFAULT_ACCOUNT_ID];
}

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 1_000_000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 1_000_000_000) return convert(Math.floor(n / 1_000_000)) + 'Million ' + convert(n % 1_000_000);
    return convert(Math.floor(n / 1_000_000_000)) + 'Billion ' + convert(n % 1_000_000_000);
  }

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = convert(intPart).trim() + ' Naira';
  if (decPart > 0) result += ` and ${convert(decPart).trim()} Kobo`;
  return result + ' Only';
}

// Expose for use in certificate component
export { numberToWords };

function generateMockTransactions(openingBalance: number, from: string, to: string): StatementTransaction[] {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const dayCount = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  const count = Math.min(Math.max(15, Math.floor(dayCount / 2)), 20);

  const descriptions = [
    { desc: 'Transfer from Emmanuel Adebayo', type: 'credit', channel: 'Mobile Banking' },
    { desc: 'POS Purchase - ShopRite Abuja', type: 'debit', channel: 'POS' },
    { desc: 'ATM Withdrawal - Zone 4 ATM', type: 'debit', channel: 'ATM' },
    { desc: 'Salary Payment - Zenith Corp Ltd', type: 'credit', channel: 'NEFT' },
    { desc: 'Utility Bill - AEDC Electricity', type: 'debit', channel: 'Internet Banking' },
    { desc: 'Transfer to Chisom Eze', type: 'debit', channel: 'Mobile Banking' },
    { desc: 'USSD Transfer Received', type: 'credit', channel: 'USSD' },
    { desc: 'Airtime Purchase - MTN', type: 'debit', channel: 'USSD' },
    { desc: 'Interest Credit - Monthly', type: 'credit', channel: 'Core Banking' },
    { desc: 'Transfer from Kola Adewale', type: 'credit', channel: 'Mobile Banking' },
    { desc: 'Online Purchase - Jumia Nigeria', type: 'debit', channel: 'Internet Banking' },
    { desc: 'Cash Deposit - Wuse Branch', type: 'credit', channel: 'Branch' },
    { desc: 'BVN Verification Fee', type: 'debit', channel: 'Core Banking' },
    { desc: 'Transfer to Mama Nkechi', type: 'debit', channel: 'Mobile Banking' },
    { desc: 'Inward NEFT - Guaranty Trust Bank', type: 'credit', channel: 'NEFT' },
    { desc: 'SMS Alert Charge', type: 'debit', channel: 'Core Banking' },
    { desc: 'Transfer Received - Opay', type: 'credit', channel: 'NIP' },
    { desc: 'POS Purchase - Chicken Republic', type: 'debit', channel: 'POS' },
    { desc: 'School Fees Payment - UNIBEN', type: 'debit', channel: 'Internet Banking' },
    { desc: 'Dividend Credit - Stanbic IBTC', type: 'credit', channel: 'NEFT' },
  ];

  const transactions: StatementTransaction[] = [];
  let balance = openingBalance;
  const step = Math.max(1, Math.floor(dayCount / count));

  for (let i = 0; i < count; i++) {
    const txDate = new Date(fromDate);
    txDate.setDate(txDate.getDate() + i * step + Math.floor(Math.random() * step));
    if (txDate > toDate) break;

    const entry = descriptions[i % descriptions.length];
    const isCredit = entry.type === 'credit';
    const amount = Math.round((Math.random() * 180_000 + 2_000) * 100) / 100;

    if (isCredit) {
      balance += amount;
    } else {
      if (balance - amount < 0) {
        balance += amount;
        // flip to credit
        transactions.push({
          id: `txn-${i + 1}`,
          date: txDate.toISOString().slice(0, 10),
          reference: `REF${Date.now().toString().slice(-8)}${i}`,
          description: entry.desc,
          credit: amount,
          balance: Math.round(balance * 100) / 100,
          channel: entry.channel,
        });
        continue;
      }
      balance -= amount;
    }

    transactions.push({
      id: `txn-${i + 1}`,
      date: txDate.toISOString().slice(0, 10),
      reference: `REF${Date.now().toString().slice(-8)}${i}`,
      description: entry.desc,
      ...(isCredit ? { credit: amount } : { debit: amount }),
      balance: Math.round(balance * 100) / 100,
      channel: entry.channel,
    });
  }

  return transactions;
}

// ─── Mock subscriptions store ─────────────────────────────────────────────────

let mockSubscriptions: StatementSubscription[] = [
  {
    id: 'sub-001',
    accountId: 'acc-001',
    accountNumber: '0123456789',
    frequency: 'MONTHLY',
    delivery: 'EMAIL',
    format: 'PDF',
    email: 'amara.okonkwo@gmail.com',
    active: true,
    nextDelivery: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10),
    createdAt: '2025-01-15',
  },
];

// ─── API Functions ─────────────────────────────────────────────────────────────

export const statementApi = {
  /** Generate a statement and return the data */
  generateStatement: async (params: GenerateStatementParams): Promise<StatementData> => {
    await delay(1200);
    const account = getAccount(params.accountId);
    const openingBalance = Math.round((Math.random() * 900_000 + 50_000) * 100) / 100;
    const transactions = generateMockTransactions(openingBalance, params.from, params.to);
    const totalCredits = transactions.reduce((s, t) => s + (t.credit ?? 0), 0);
    const totalDebits = transactions.reduce((s, t) => s + (t.debit ?? 0), 0);
    const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : openingBalance;

    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      currency: account.currency,
      openingBalance,
      closingBalance: Math.round(closingBalance * 100) / 100,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      periodFrom: params.from,
      periodTo: params.to,
      generatedAt: new Date().toISOString(),
      transactions,
      ...BANK_INFO,
    };
  },

  /** Alias — same as generateStatement */
  getStatementData: async (accountId: string, from: string, to: string): Promise<StatementData> => {
    return statementApi.generateStatement({ accountId, from, to, type: 'FULL' });
  },

  /** Trigger a file download (mock — returns a blob URL) */
  downloadStatement: async (accountId: string, from: string, to: string, format: StatementFormat): Promise<string> => {
    await delay(800);
    // In production this would return a presigned URL or blob
    return `https://api.bellbank.ng/v1/statements/download?account=${accountId}&from=${from}&to=${to}&format=${format}`;
  },

  /** Email the statement to an address */
  emailStatement: async (accountId: string, from: string, to: string, email: string): Promise<{ success: boolean }> => {
    await delay(900);
    console.log(`[Mock] Emailing statement for ${accountId} (${from} → ${to}) to ${email}`);
    return { success: true };
  },

  /** Get certificate of balance data */
  getCertificateData: async (accountId: string, balanceDate: string, addressedTo?: string): Promise<CertificateData> => {
    await delay(700);
    const account = getAccount(accountId);
    const balance = Math.round((Math.random() * 2_000_000 + 100_000) * 100) / 100;
    const ref = `CERT/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 900_000 + 100_000))}`;

    return {
      referenceNumber: ref,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      currency: account.currency,
      balance,
      balanceDate,
      addressedTo: addressedTo ?? 'To Whom It May Concern',
      generatedAt: new Date().toISOString(),
      authorizedBy: 'Chukwuemeka Obi',
      authorizedTitle: 'Branch Manager',
      ...{ bankName: BANK_INFO.bankName, bankAddress: BANK_INFO.bankAddress },
    };
  },

  /** Get account confirmation letter data */
  getConfirmationData: async (accountId: string, purpose: string, addressedTo?: string): Promise<AccountConfirmationData> => {
    await delay(700);
    const account = getAccount(accountId);
    const ref = `CONF/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 900_000 + 100_000))}`;

    return {
      referenceNumber: ref,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      openingDate: '2022-03-14',
      currency: account.currency,
      status: 'ACTIVE',
      addressedTo: addressedTo ?? 'To Whom It May Concern',
      purpose,
      generatedAt: new Date().toISOString(),
      ...{ bankName: BANK_INFO.bankName, bankAddress: BANK_INFO.bankAddress },
    };
  },

  /** Get all subscriptions for an account */
  getSubscriptions: async (accountId: string): Promise<StatementSubscription[]> => {
    await delay(400);
    return mockSubscriptions.filter((s) => s.accountId === accountId);
  },

  /** Create a new statement subscription */
  createSubscription: async (data: CreateSubscriptionData): Promise<StatementSubscription> => {
    await delay(600);
    const account = getAccount(data.accountId);
    const nextDeliveryDate = new Date();
    if (data.frequency === 'WEEKLY') nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
    else if (data.frequency === 'MONTHLY') nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
    else nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 3);

    const newSub: StatementSubscription = {
      id: `sub-${Date.now()}`,
      accountId: data.accountId,
      accountNumber: account.accountNumber,
      frequency: data.frequency,
      delivery: data.delivery,
      format: data.format,
      email: data.email,
      active: true,
      nextDelivery: nextDeliveryDate.toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    mockSubscriptions.push(newSub);
    return newSub;
  },

  /** Update an existing subscription */
  updateSubscription: async (id: string, data: Partial<CreateSubscriptionData>): Promise<StatementSubscription> => {
    await delay(500);
    const idx = mockSubscriptions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Subscription not found');
    mockSubscriptions[idx] = { ...mockSubscriptions[idx], ...data };
    return mockSubscriptions[idx];
  },

  /** Cancel / delete a subscription */
  deleteSubscription: async (id: string): Promise<void> => {
    await delay(400);
    mockSubscriptions = mockSubscriptions.filter((s) => s.id !== id);
  },
};
