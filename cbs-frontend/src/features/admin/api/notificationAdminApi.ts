export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
export type NotificationCategory = 'TRANSACTION' | 'ACCOUNT' | 'LOAN' | 'CARD' | 'SECURITY' | 'MARKETING' | 'SYSTEM';
export type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  subject?: string; // EMAIL only
  body: string;
  language: 'EN' | 'YO' | 'HA' | 'IG';
  usageMTD: number;
  status: TemplateStatus;
  version: number;
  lastEditedBy: string;
  updatedAt: string;
  createdAt: string;
}

export interface TemplateVersion {
  version: number;
  editedBy: string;
  editedAt: string;
  subject?: string;
  body: string;
  changeNote: string;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  provider: string;
  fromAddress?: string;
  fromName?: string;
  senderId?: string;
  dailyLimit: number;
  sentToday: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DEGRADED';
  costPerUnit?: number;
}

export interface DeliveryStats {
  date: string;
  channel: NotificationChannel;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  cost?: number;
}

export interface FailureRecord {
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  failures: number;
  commonError: string;
  lastFailure: string;
}

export interface ScheduledNotification {
  id: string;
  name: string;
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRun: string;
  lastRun?: string;
  recipientCount: number;
  status: 'ACTIVE' | 'PAUSED';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MOCK_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tmpl-001',
    code: 'TXN-DEBIT-EMAIL',
    name: 'Debit Transaction Alert',
    channel: 'EMAIL',
    category: 'TRANSACTION',
    subject: 'Debit Alert: {{currency}}{{amount}} debited from your BellBank account',
    body: `Dear {{customerName}},

We wish to inform you that a debit transaction has been processed on your BellBank account.

Transaction Details:
- Account Number: {{accountNumber}}
- Amount Debited: {{currency}}{{amount}}
- Transaction Reference: {{transactionRef}}
- Date & Time: {{transactionDate}}
- Narration: {{narration}}
- Available Balance: {{balance}}

If you did not authorise this transaction, please contact us immediately at {{supportPhone}} or visit your nearest {{branchName}}.

This is an automated notification. Please do not reply to this email.

Regards,
{{bankName}} Customer Service`,
    language: 'EN',
    usageMTD: 47820,
    status: 'ACTIVE',
    version: 3,
    lastEditedBy: 'Ngozi Eze',
    updatedAt: '2026-02-15T10:00:00Z',
    createdAt: '2023-01-10T09:00:00Z',
  },
  {
    id: 'tmpl-002',
    code: 'TXN-DEBIT-SMS',
    name: 'Debit Alert SMS',
    channel: 'SMS',
    category: 'TRANSACTION',
    body: `{{bankName}}: Debit of {{currency}}{{amount}} on acct {{accountNumber}} on {{transactionDate}}. Ref: {{transactionRef}}. Bal: {{balance}}. Not you? Call {{supportPhone}}.`,
    language: 'EN',
    usageMTD: 89340,
    status: 'ACTIVE',
    version: 2,
    lastEditedBy: 'Tunde Adesanya',
    updatedAt: '2026-01-20T08:30:00Z',
    createdAt: '2023-01-10T09:00:00Z',
  },
  {
    id: 'tmpl-003',
    code: 'TXN-CREDIT-SMS',
    name: 'Credit Alert SMS',
    channel: 'SMS',
    category: 'TRANSACTION',
    body: `{{bankName}}: Credit of {{currency}}{{amount}} to acct {{accountNumber}} on {{transactionDate}}. Ref: {{transactionRef}}. Bal: {{balance}}. Narration: {{narration}}.`,
    language: 'EN',
    usageMTD: 76120,
    status: 'ACTIVE',
    version: 2,
    lastEditedBy: 'Tunde Adesanya',
    updatedAt: '2026-01-20T08:30:00Z',
    createdAt: '2023-01-10T09:00:00Z',
  },
  {
    id: 'tmpl-004',
    code: 'LOAN-APPROVAL-EMAIL',
    name: 'Loan Approval Notification',
    channel: 'EMAIL',
    category: 'LOAN',
    subject: 'Congratulations! Your Loan Application has been Approved',
    body: `Dear {{customerName}},

We are delighted to inform you that your loan application with {{bankName}} has been approved.

Loan Details:
- Loan Amount: {{currency}}{{amount}}
- Account to be Credited: {{accountNumber}}
- Reference: {{transactionRef}}
- Disbursement Date: {{transactionDate}}

Please visit your nearest {{branchName}} or log in to the {{bankName}} mobile app to review and accept your loan offer documents before the disbursement can proceed.

For enquiries, please contact us at {{supportPhone}}.

Congratulations once again!

Warm Regards,
{{bankName}} Loans Team`,
    language: 'EN',
    usageMTD: 1240,
    status: 'ACTIVE',
    version: 4,
    lastEditedBy: 'Ibrahim Musa',
    updatedAt: '2025-11-05T14:00:00Z',
    createdAt: '2023-03-15T09:00:00Z',
  },
  {
    id: 'tmpl-005',
    code: 'LOAN-REPAYMENT-DUE-SMS',
    name: 'Loan Repayment Due Reminder',
    channel: 'SMS',
    category: 'LOAN',
    body: `{{bankName}}: Your loan repayment of {{currency}}{{amount}} is due on {{transactionDate}}. Acct: {{accountNumber}}. Ensure adequate funds. Enquiries: {{supportPhone}}.`,
    language: 'EN',
    usageMTD: 5680,
    status: 'ACTIVE',
    version: 1,
    lastEditedBy: 'Fatima Al-Hassan',
    updatedAt: '2025-08-10T09:00:00Z',
    createdAt: '2023-04-01T09:00:00Z',
  },
  {
    id: 'tmpl-006',
    code: 'KYC-REMINDER-EMAIL',
    name: 'KYC Documentation Reminder',
    channel: 'EMAIL',
    category: 'ACCOUNT',
    subject: 'Action Required: Complete Your KYC Documentation at BellBank',
    body: `Dear {{customerName}},

Your {{bankName}} account ({{accountNumber}}) requires updated Know Your Customer (KYC) documentation to remain fully operational.

Pending items may include:
- Valid Government-issued ID
- Utility Bill (not older than 3 months)
- Passport Photograph

Please visit any {{branchName}} location or upload your documents via the {{bankName}} mobile app within 30 days to avoid account restrictions.

For assistance, contact us at {{supportPhone}}.

Regards,
{{bankName}} Compliance Team`,
    language: 'EN',
    usageMTD: 3420,
    status: 'ACTIVE',
    version: 2,
    lastEditedBy: 'Amara Okonkwo',
    updatedAt: '2025-12-01T11:00:00Z',
    createdAt: '2023-05-20T09:00:00Z',
  },
  {
    id: 'tmpl-007',
    code: 'CARD-OTP-SMS',
    name: 'Card OTP Verification',
    channel: 'SMS',
    category: 'CARD',
    body: `{{bankName}}: Your OTP is {{transactionRef}} for a {{currency}}{{amount}} transaction. Valid for 5 mins. Do NOT share with anyone. If not you, call {{supportPhone}} immediately.`,
    language: 'EN',
    usageMTD: 124600,
    status: 'ACTIVE',
    version: 3,
    lastEditedBy: 'Chidi Obi',
    updatedAt: '2026-01-08T10:00:00Z',
    createdAt: '2022-11-01T09:00:00Z',
  },
  {
    id: 'tmpl-008',
    code: 'SECURITY-LOGIN-PUSH',
    name: 'New Login Detected',
    channel: 'PUSH',
    category: 'SECURITY',
    body: `New login to your {{bankName}} account detected on {{transactionDate}}. If this wasn't you, secure your account immediately via Settings or call {{supportPhone}}.`,
    language: 'EN',
    usageMTD: 28900,
    status: 'ACTIVE',
    version: 1,
    lastEditedBy: 'Bola Adeyemi',
    updatedAt: '2025-09-14T13:00:00Z',
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'tmpl-009',
    code: 'MKTG-PROMO-EMAIL',
    name: 'Promotional Campaign - Fixed Deposit',
    channel: 'EMAIL',
    category: 'MARKETING',
    subject: 'Exclusive Offer: Earn Up to 18% on Your Fixed Deposit at BellBank',
    body: `Dear {{customerName}},

As a valued {{bankName}} customer, we are pleased to offer you an exclusive opportunity to grow your savings.

Our Special Fixed Deposit Offer:
- Rate: Up to 18% per annum
- Minimum Amount: ₦100,000
- Tenor: 90 – 364 days

To take advantage of this offer, log in to the {{bankName}} app or visit {{branchName}} today.

Offer valid until 31 March 2026.

Terms and conditions apply. This offer is subject to availability.

Regards,
{{bankName}} Retail Banking Team`,
    language: 'EN',
    usageMTD: 8950,
    status: 'DRAFT',
    version: 1,
    lastEditedBy: 'Ngozi Eze',
    updatedAt: '2026-03-10T09:00:00Z',
    createdAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'tmpl-010',
    code: 'SYS-MAINTENANCE-INAPP',
    name: 'Scheduled Maintenance Notice',
    channel: 'IN_APP',
    category: 'SYSTEM',
    body: `{{bankName}} will undergo scheduled maintenance on {{transactionDate}} from 12:00 AM – 4:00 AM. Some services may be unavailable. We apologise for any inconvenience. For urgent assistance, call {{supportPhone}}.`,
    language: 'EN',
    usageMTD: 420,
    status: 'ACTIVE',
    version: 2,
    lastEditedBy: 'Tunde Adesanya',
    updatedAt: '2026-02-28T08:00:00Z',
    createdAt: '2024-06-01T09:00:00Z',
  },
  {
    id: 'tmpl-011',
    code: 'TXN-DEBIT-YORUBA-SMS',
    name: 'Debit Alert SMS (Yoruba)',
    channel: 'SMS',
    category: 'TRANSACTION',
    body: `{{bankName}}: A gbowo {{currency}}{{amount}} lati akanti {{accountNumber}} ni {{transactionDate}}. Ref: {{transactionRef}}. Iye to ku: {{balance}}. Bi o ko se se e, pe {{supportPhone}}.`,
    language: 'YO',
    usageMTD: 4120,
    status: 'ACTIVE',
    version: 1,
    lastEditedBy: 'Adeola Johnson',
    updatedAt: '2025-07-01T09:00:00Z',
    createdAt: '2025-07-01T09:00:00Z',
  },
  {
    id: 'tmpl-012',
    code: 'ACCT-STMT-EMAIL',
    name: 'Monthly Account Statement',
    channel: 'EMAIL',
    category: 'ACCOUNT',
    subject: 'Your {{bankName}} Account Statement – {{transactionDate}}',
    body: `Dear {{customerName}},

Please find attached your {{bankName}} account statement for the period ending {{transactionDate}}.

Account Details:
- Account Number: {{accountNumber}}
- Closing Balance: {{balance}}
- Branch: {{branchName}}

To view your full transaction history, log in to internet banking or the {{bankName}} mobile app.

If you have any questions about your statement, please contact us at {{supportPhone}}.

Regards,
{{bankName}} Customer Service`,
    language: 'EN',
    usageMTD: 18760,
    status: 'ARCHIVED',
    version: 5,
    lastEditedBy: 'Chidi Obi',
    updatedAt: '2025-05-10T12:00:00Z',
    createdAt: '2022-08-01T09:00:00Z',
  },
];

const MOCK_TEMPLATE_VERSIONS: Record<string, TemplateVersion[]> = {
  'tmpl-001': [
    {
      version: 3,
      editedBy: 'Ngozi Eze',
      editedAt: '2026-02-15T10:00:00Z',
      subject: 'Debit Alert: {{currency}}{{amount}} debited from your BellBank account',
      body: MOCK_TEMPLATES[0].body,
      changeNote: 'Added available balance to email body per customer feedback.',
    },
    {
      version: 2,
      editedBy: 'Tunde Adesanya',
      editedAt: '2025-04-10T09:00:00Z',
      subject: 'BellBank Debit Alert – {{transactionRef}}',
      body: `Dear {{customerName}},\n\nYour account {{accountNumber}} has been debited with {{currency}}{{amount}} on {{transactionDate}}.\n\nRef: {{transactionRef}}\n\nNot you? Call {{supportPhone}}.`,
      changeNote: 'Updated subject line for improved open rates.',
    },
    {
      version: 1,
      editedBy: 'System (Initial)',
      editedAt: '2023-01-10T09:00:00Z',
      subject: 'Account Debit Notification',
      body: `Dear {{customerName}}, your account {{accountNumber}} has been debited with {{currency}}{{amount}}.`,
      changeNote: 'Initial template creation.',
    },
  ],
  'tmpl-004': [
    {
      version: 4,
      editedBy: 'Ibrahim Musa',
      editedAt: '2025-11-05T14:00:00Z',
      subject: 'Congratulations! Your Loan Application has been Approved',
      body: MOCK_TEMPLATES[3].body,
      changeNote: 'Added disbursement date and branch visit instructions.',
    },
    {
      version: 3,
      editedBy: 'Fatima Al-Hassan',
      editedAt: '2025-01-20T11:00:00Z',
      subject: 'Your BellBank Loan Has Been Approved',
      body: `Dear {{customerName}}, we are pleased to inform you that your loan of {{currency}}{{amount}} has been approved. Ref: {{transactionRef}}.`,
      changeNote: 'Revised tone to be more congratulatory.',
    },
    {
      version: 2,
      editedBy: 'Amara Okonkwo',
      editedAt: '2024-06-01T09:00:00Z',
      subject: 'Loan Approval – {{transactionRef}}',
      body: `Dear {{customerName}}, your loan application (Ref: {{transactionRef}}) of {{currency}}{{amount}} has been approved.`,
      changeNote: 'Compliance review update – added disclaimer.',
    },
    {
      version: 1,
      editedBy: 'System (Initial)',
      editedAt: '2023-03-15T09:00:00Z',
      subject: 'Loan Approval Notice',
      body: `Your loan of {{currency}}{{amount}} has been approved.`,
      changeNote: 'Initial template creation.',
    },
  ],
};

const MOCK_CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    channel: 'EMAIL',
    provider: 'Mailgun',
    fromAddress: 'noreply@bellbank.ng',
    fromName: 'BellBank Notifications',
    dailyLimit: 200000,
    sentToday: 47820,
    status: 'ACTIVE',
  },
  {
    channel: 'SMS',
    provider: 'Termii',
    senderId: 'BellBank',
    dailyLimit: 500000,
    sentToday: 293980,
    status: 'ACTIVE',
    costPerUnit: 4.2,
  },
  {
    channel: 'PUSH',
    provider: 'Firebase FCM',
    fromName: 'BellBank',
    dailyLimit: 1000000,
    sentToday: 28900,
    status: 'ACTIVE',
  },
  {
    channel: 'IN_APP',
    provider: 'Internal Message Bus',
    fromName: 'BellBank System',
    dailyLimit: 500000,
    sentToday: 12340,
    status: 'DEGRADED',
  },
];

// Generate 30 days of delivery stats
const generateDeliveryStats = (): DeliveryStats[] => {
  const stats: DeliveryStats[] = [];
  const channels: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
  const today = new Date('2026-03-19');
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const baseSent = { EMAIL: 45000, SMS: 280000, PUSH: 25000, IN_APP: 11000 };
    channels.forEach((channel) => {
      const sent = Math.round(baseSent[channel] * (0.85 + Math.random() * 0.3));
      const deliveryRate = channel === 'IN_APP' ? 0.88 : channel === 'EMAIL' ? 0.94 : channel === 'SMS' ? 0.96 : 0.92;
      const delivered = Math.round(sent * (deliveryRate + (Math.random() * 0.04 - 0.02)));
      const failed = Math.round((sent - delivered) * 0.6);
      const bounced = sent - delivered - failed;
      stats.push({
        date: dateStr,
        channel,
        sent,
        delivered,
        failed,
        bounced: Math.max(0, bounced),
        cost: channel === 'SMS' ? sent * 4.2 : undefined,
      });
    });
  }
  return stats;
};

const MOCK_DELIVERY_STATS: DeliveryStats[] = generateDeliveryStats();

const MOCK_FAILURE_RECORDS: FailureRecord[] = [
  {
    templateCode: 'CARD-OTP-SMS',
    templateName: 'Card OTP Verification',
    channel: 'SMS',
    failures: 842,
    commonError: 'DND',
    lastFailure: '2026-03-19T08:45:00Z',
  },
  {
    templateCode: 'TXN-DEBIT-EMAIL',
    templateName: 'Debit Transaction Alert',
    channel: 'EMAIL',
    failures: 634,
    commonError: 'BOUNCED_EMAIL',
    lastFailure: '2026-03-19T07:30:00Z',
  },
  {
    templateCode: 'LOAN-REPAYMENT-DUE-SMS',
    templateName: 'Loan Repayment Due Reminder',
    channel: 'SMS',
    failures: 421,
    commonError: 'INVALID_NUMBER',
    lastFailure: '2026-03-19T06:15:00Z',
  },
  {
    templateCode: 'MKTG-PROMO-EMAIL',
    templateName: 'Promotional Campaign - Fixed Deposit',
    channel: 'EMAIL',
    failures: 389,
    commonError: 'BOUNCED_EMAIL',
    lastFailure: '2026-03-18T22:00:00Z',
  },
  {
    templateCode: 'KYC-REMINDER-EMAIL',
    templateName: 'KYC Documentation Reminder',
    channel: 'EMAIL',
    failures: 276,
    commonError: 'PROVIDER_ERROR',
    lastFailure: '2026-03-19T05:00:00Z',
  },
  {
    templateCode: 'TXN-DEBIT-SMS',
    templateName: 'Debit Alert SMS',
    channel: 'SMS',
    failures: 198,
    commonError: 'DND',
    lastFailure: '2026-03-19T08:20:00Z',
  },
  {
    templateCode: 'SYS-MAINTENANCE-INAPP',
    templateName: 'Scheduled Maintenance Notice',
    channel: 'IN_APP',
    failures: 143,
    commonError: 'PROVIDER_ERROR',
    lastFailure: '2026-03-18T23:59:00Z',
  },
  {
    templateCode: 'SECURITY-LOGIN-PUSH',
    templateName: 'New Login Detected',
    channel: 'PUSH',
    failures: 98,
    commonError: 'PROVIDER_ERROR',
    lastFailure: '2026-03-19T01:30:00Z',
  },
];

const MOCK_SCHEDULED: ScheduledNotification[] = [
  {
    id: 'sched-001',
    name: 'Daily Debit Summary (Email)',
    templateCode: 'TXN-DEBIT-EMAIL',
    templateName: 'Debit Transaction Alert',
    channel: 'EMAIL',
    frequency: 'DAILY',
    nextRun: '2026-03-20T07:00:00Z',
    lastRun: '2026-03-19T07:00:00Z',
    recipientCount: 42350,
    status: 'ACTIVE',
  },
  {
    id: 'sched-002',
    name: 'Loan Repayment Reminder (D-3)',
    templateCode: 'LOAN-REPAYMENT-DUE-SMS',
    templateName: 'Loan Repayment Due Reminder',
    channel: 'SMS',
    frequency: 'DAILY',
    nextRun: '2026-03-20T08:00:00Z',
    lastRun: '2026-03-19T08:00:00Z',
    recipientCount: 5680,
    status: 'ACTIVE',
  },
  {
    id: 'sched-003',
    name: 'Monthly Account Statement',
    templateCode: 'ACCT-STMT-EMAIL',
    templateName: 'Monthly Account Statement',
    channel: 'EMAIL',
    frequency: 'MONTHLY',
    nextRun: '2026-04-01T06:00:00Z',
    lastRun: '2026-03-01T06:00:00Z',
    recipientCount: 87420,
    status: 'ACTIVE',
  },
  {
    id: 'sched-004',
    name: 'KYC Expiry Reminder (Weekly)',
    templateCode: 'KYC-REMINDER-EMAIL',
    templateName: 'KYC Documentation Reminder',
    channel: 'EMAIL',
    frequency: 'WEEKLY',
    nextRun: '2026-03-23T09:00:00Z',
    lastRun: '2026-03-16T09:00:00Z',
    recipientCount: 3420,
    status: 'ACTIVE',
  },
  {
    id: 'sched-005',
    name: 'Fixed Deposit Promo Blast',
    templateCode: 'MKTG-PROMO-EMAIL',
    templateName: 'Promotional Campaign - Fixed Deposit',
    channel: 'EMAIL',
    frequency: 'WEEKLY',
    nextRun: '2026-03-24T10:00:00Z',
    lastRun: '2026-03-17T10:00:00Z',
    recipientCount: 120000,
    status: 'PAUSED',
  },
];

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getTemplates(params?: {
  channel?: NotificationChannel;
  category?: NotificationCategory;
  status?: TemplateStatus;
  search?: string;
}): Promise<NotificationTemplate[]> {
  await delay(400);
  let results = [...MOCK_TEMPLATES];
  if (params?.channel) results = results.filter((t) => t.channel === params.channel);
  if (params?.category) results = results.filter((t) => t.category === params.category);
  if (params?.status) results = results.filter((t) => t.status === params.status);
  if (params?.search) {
    const q = params.search.toLowerCase();
    results = results.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
    );
  }
  return results;
}

export async function getTemplateById(id: string): Promise<NotificationTemplate> {
  await delay(300);
  const tpl = MOCK_TEMPLATES.find((t) => t.id === id);
  if (!tpl) throw new Error(`Template ${id} not found`);
  return { ...tpl };
}

export async function createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  await delay(700);
  const newTemplate: NotificationTemplate = {
    id: `tmpl-${Date.now()}`,
    code: data.code ?? `TPL-${Date.now()}`,
    name: data.name ?? 'Untitled Template',
    channel: data.channel ?? 'EMAIL',
    category: data.category ?? 'SYSTEM',
    subject: data.subject,
    body: data.body ?? '',
    language: data.language ?? 'EN',
    usageMTD: 0,
    status: 'DRAFT',
    version: 1,
    lastEditedBy: 'Current User',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  MOCK_TEMPLATES.push(newTemplate);
  return newTemplate;
}

export async function updateTemplate(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  await delay(600);
  const idx = MOCK_TEMPLATES.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Template ${id} not found`);
  MOCK_TEMPLATES[idx] = {
    ...MOCK_TEMPLATES[idx],
    ...data,
    version: MOCK_TEMPLATES[idx].version + 1,
    updatedAt: new Date().toISOString(),
    lastEditedBy: 'Current User',
  };
  return { ...MOCK_TEMPLATES[idx] };
}

export async function publishTemplate(id: string): Promise<NotificationTemplate> {
  await delay(500);
  const idx = MOCK_TEMPLATES.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Template ${id} not found`);
  MOCK_TEMPLATES[idx] = { ...MOCK_TEMPLATES[idx], status: 'ACTIVE', updatedAt: new Date().toISOString() };
  return { ...MOCK_TEMPLATES[idx] };
}

export async function archiveTemplate(id: string): Promise<NotificationTemplate> {
  await delay(500);
  const idx = MOCK_TEMPLATES.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Template ${id} not found`);
  MOCK_TEMPLATES[idx] = { ...MOCK_TEMPLATES[idx], status: 'ARCHIVED', updatedAt: new Date().toISOString() };
  return { ...MOCK_TEMPLATES[idx] };
}

export async function getTemplateVersions(id: string): Promise<TemplateVersion[]> {
  await delay(400);
  return MOCK_TEMPLATE_VERSIONS[id] ?? [];
}

export async function getChannelConfigs(): Promise<ChannelConfig[]> {
  await delay(400);
  return [...MOCK_CHANNEL_CONFIGS];
}

export async function updateChannelConfig(channel: NotificationChannel, data: Partial<ChannelConfig>): Promise<ChannelConfig> {
  await delay(600);
  const idx = MOCK_CHANNEL_CONFIGS.findIndex((c) => c.channel === channel);
  if (idx === -1) throw new Error(`Channel ${channel} not found`);
  MOCK_CHANNEL_CONFIGS[idx] = { ...MOCK_CHANNEL_CONFIGS[idx], ...data };
  return { ...MOCK_CHANNEL_CONFIGS[idx] };
}

export async function testChannelSend(channel: NotificationChannel, recipient: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await delay(1200);
  // Simulate occasional failure for demo
  if (recipient.includes('fail') || recipient === '000') {
    return { success: false, error: 'Recipient unreachable or invalid address.' };
  }
  return { success: true, messageId: `TEST-${Date.now()}` };
}

export async function getDeliveryStats(days = 30): Promise<DeliveryStats[]> {
  await delay(500);
  return MOCK_DELIVERY_STATS.slice(-days * 4);
}

export async function getFailureRecords(): Promise<FailureRecord[]> {
  await delay(400);
  return [...MOCK_FAILURE_RECORDS].sort((a, b) => b.failures - a.failures);
}

export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  await delay(400);
  return [...MOCK_SCHEDULED];
}

export async function createScheduledNotification(data: Partial<ScheduledNotification>): Promise<ScheduledNotification> {
  await delay(700);
  const newSched: ScheduledNotification = {
    id: `sched-${Date.now()}`,
    name: data.name ?? 'New Schedule',
    templateCode: data.templateCode ?? '',
    templateName: data.templateName ?? '',
    channel: data.channel ?? 'EMAIL',
    frequency: data.frequency ?? 'DAILY',
    nextRun: data.nextRun ?? new Date().toISOString(),
    lastRun: undefined,
    recipientCount: data.recipientCount ?? 0,
    status: 'ACTIVE',
  };
  MOCK_SCHEDULED.push(newSched);
  return newSched;
}

export async function toggleSchedule(id: string): Promise<ScheduledNotification> {
  await delay(400);
  const idx = MOCK_SCHEDULED.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Schedule ${id} not found`);
  MOCK_SCHEDULED[idx] = {
    ...MOCK_SCHEDULED[idx],
    status: MOCK_SCHEDULED[idx].status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
  };
  return { ...MOCK_SCHEDULED[idx] };
}
