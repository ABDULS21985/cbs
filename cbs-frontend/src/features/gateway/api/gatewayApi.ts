import { apiGet, apiPost } from '@/lib/api';

export interface GatewayStats {
  messagesToday: number;
  pending: number;
  failed: number;
  avgLatencyMs: number;
  uptimePct: number;
}

export interface ThroughputPoint {
  minute: string;
  inbound: number;
  outbound: number;
  errors: number;
}

export interface GatewayMessage {
  id: string;
  reference: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: 'NIP' | 'SWIFT_MT103' | 'SWIFT_MT202' | 'ACH' | 'RTGS';
  counterparty: string;
  amount?: number;
  currency?: string;
  status: 'QUEUED' | 'SENT' | 'ACKNOWLEDGED' | 'SETTLED' | 'FAILED';
  sentAt: string;
  latencyMs?: number;
  attempts?: number;
  errorCode?: string;
  errorMessage?: string;
  lastAttempt?: string;
  payload?: string;
  response?: string;
  timingBreakdown?: { stage: string; durationMs: number }[];
}

export interface GatewayStatus {
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  todayMessages: number;
  errors: number;
  lastMessageAt: string;
}

export interface SwiftMessage {
  id: string;
  reference: string;
  type: string;
  senderBic: string;
  receiverBic: string;
  amount: number;
  currency: string;
  status: string;
  sentAt: string;
  fields?: { tag: string; name: string; value: string }[];
}

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoMinutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function isoSecondsAgo(n: number): string {
  return new Date(Date.now() - n * 1_000).toISOString();
}

function generateMockStats(): GatewayStats {
  return {
    messagesToday: randomBetween(12_400, 15_000),
    pending: randomBetween(12, 80),
    failed: randomBetween(3, 25),
    avgLatencyMs: randomBetween(180, 450),
    uptimePct: parseFloat((99 + Math.random() * 0.99).toFixed(2)),
  };
}

function generateMockThroughput(): ThroughputPoint[] {
  const points: ThroughputPoint[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(Date.now() - i * 60_000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    points.push({
      minute: `${hh}:${mm}`,
      inbound: randomBetween(30, 200),
      outbound: randomBetween(20, 170),
      errors: randomBetween(0, 6),
    });
  }
  return points;
}

const TYPES: GatewayMessage['type'][] = ['NIP', 'SWIFT_MT103', 'SWIFT_MT202', 'ACH', 'RTGS'];
const STATUSES: GatewayMessage['status'][] = ['QUEUED', 'SENT', 'ACKNOWLEDGED', 'SETTLED', 'FAILED'];
const COUNTERPARTIES = [
  'ACCESS BANK PLC',
  'ZENITH BANK PLC',
  'GTBANK PLC',
  'FIRST BANK OF NIGERIA',
  'UBA GROUP',
  'STANBIC IBTC BANK',
  'FIDELITY BANK PLC',
  'UNION BANK OF NIGERIA',
];
const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

function generateMockMessage(id: string, forceFailed = false): GatewayMessage {
  const type = TYPES[randomBetween(0, TYPES.length - 1)];
  const status = forceFailed ? 'FAILED' : STATUSES[randomBetween(0, STATUSES.length - 1)];
  const direction: GatewayMessage['direction'] = Math.random() > 0.5 ? 'INBOUND' : 'OUTBOUND';
  const currency = CURRENCIES[randomBetween(0, CURRENCIES.length - 1)];
  const amount = randomBetween(50_000, 50_000_000);
  const latencyMs = randomBetween(80, 800);
  const attempts = forceFailed ? randomBetween(1, 5) : randomBetween(1, 2);

  const payload =
    type === 'SWIFT_MT103' || type === 'SWIFT_MT202'
      ? `:20:${id.slice(0, 16).toUpperCase()}\n:23B:CRED\n:32A:260318${currency}${(amount / 100).toFixed(2)}\n:50K:/1234567890\nFIRST BANK NIGERIA\n:59:/9876543210\n${COUNTERPARTIES[randomBetween(0, COUNTERPARTIES.length - 1)]}\n:71A:SHA`
      : JSON.stringify(
          {
            msgId: id,
            creDtTm: new Date().toISOString(),
            nbOfTxs: 1,
            grpSts: status,
            cdtTrfTxInf: {
              pmtId: { instrId: `INSTR-${id.slice(0, 8).toUpperCase()}`, endToEndId: `E2E-${id.slice(0, 8).toUpperCase()}` },
              intrBkSttlmAmt: { ccy: currency, value: (amount / 100).toFixed(2) },
              cdtr: { nm: COUNTERPARTIES[randomBetween(0, COUNTERPARTIES.length - 1)], acct: { id: { othr: { id: String(randomBetween(1000000000, 9999999999)) } } } },
            },
          },
          null,
          2
        );

  const response =
    status === 'FAILED'
      ? JSON.stringify({ code: 'ERR_TIMEOUT', message: 'Gateway did not respond within SLA window', timestamp: new Date().toISOString() }, null, 2)
      : JSON.stringify({ code: '00', message: 'Approved', sessionId: `SID${randomBetween(100000, 999999)}`, timestamp: new Date().toISOString() }, null, 2);

  return {
    id,
    reference: `REF${randomBetween(100000000, 999999999)}`,
    direction,
    type,
    counterparty: COUNTERPARTIES[randomBetween(0, COUNTERPARTIES.length - 1)],
    amount: amount / 100,
    currency,
    status,
    sentAt: isoMinutesAgo(randomBetween(1, 480)),
    latencyMs: status !== 'QUEUED' ? latencyMs : undefined,
    attempts,
    errorCode: status === 'FAILED' ? ['ERR_TIMEOUT', 'ERR_REJECTED', 'ERR_INVALID_ACCT', 'ERR_INSUF_FUNDS'][randomBetween(0, 3)] : undefined,
    errorMessage: status === 'FAILED' ? ['Gateway timeout', 'Transaction rejected by beneficiary bank', 'Invalid account number', 'Insufficient funds in settlement account'][randomBetween(0, 3)] : undefined,
    lastAttempt: status === 'FAILED' ? isoMinutesAgo(randomBetween(1, 60)) : undefined,
    payload,
    response,
    timingBreakdown:
      status !== 'QUEUED'
        ? [
            { stage: 'Validation', durationMs: randomBetween(5, 20) },
            { stage: 'Routing', durationMs: randomBetween(10, 40) },
            { stage: 'Encryption', durationMs: randomBetween(3, 15) },
            { stage: 'Network Transit', durationMs: randomBetween(50, 400) },
            { stage: 'Remote Processing', durationMs: randomBetween(30, 200) },
            { stage: 'Acknowledgement', durationMs: randomBetween(10, 50) },
          ]
        : undefined,
  };
}

function generateMockMessages(count: number, forceFailed = false): GatewayMessage[] {
  return Array.from({ length: count }, (_, i) => generateMockMessage(String(i + 1).padStart(8, '0'), forceFailed));
}

function generateMockGatewayStatuses(): GatewayStatus[] {
  const gateways: { name: string; status: GatewayStatus['status'] }[] = [
    { name: 'NIBSS NIP', status: 'ONLINE' },
    { name: 'CBN RTGS', status: 'ONLINE' },
    { name: 'SWIFT Network', status: 'DEGRADED' },
    { name: 'NIP2', status: 'ONLINE' },
    { name: 'NIBSS ACH', status: 'OFFLINE' },
  ];
  return gateways.map(({ name, status }) => ({
    name,
    status,
    latencyMs: status === 'OFFLINE' ? 0 : status === 'DEGRADED' ? randomBetween(800, 2000) : randomBetween(80, 300),
    todayMessages: status === 'OFFLINE' ? 0 : randomBetween(200, 5000),
    errors: status === 'OFFLINE' ? randomBetween(10, 40) : status === 'DEGRADED' ? randomBetween(5, 20) : randomBetween(0, 5),
    lastMessageAt: status === 'OFFLINE' ? isoMinutesAgo(randomBetween(120, 480)) : isoSecondsAgo(randomBetween(5, 120)),
  }));
}

const SWIFT_TYPES = ['MT103', 'MT202', 'MT940', 'MT950'];
const BICS = ['ACCESSNGLA', 'ZEIBNGLA', 'GTBINGLA', 'FBNINGLA', 'UBANGILA', 'SBICNGLA'];

function generateMockSwiftMessage(id: string): SwiftMessage {
  const type = SWIFT_TYPES[randomBetween(0, SWIFT_TYPES.length - 1)];
  const currency = CURRENCIES[randomBetween(0, CURRENCIES.length - 1)];
  const amount = randomBetween(10_000, 5_000_000);
  const senderBic = BICS[randomBetween(0, BICS.length - 1)];
  const receiverBic = BICS.filter((b) => b !== senderBic)[randomBetween(0, BICS.length - 2)];

  return {
    id,
    reference: `SW${randomBetween(1000000000, 9999999999)}`,
    type,
    senderBic,
    receiverBic,
    amount,
    currency,
    status: ['SENT', 'ACKNOWLEDGED', 'SETTLED', 'FAILED'][randomBetween(0, 3)],
    sentAt: isoMinutesAgo(randomBetween(5, 720)),
    fields: [
      { tag: ':20:', name: 'Transaction Reference', value: `TRF${randomBetween(100000000, 999999999)}` },
      { tag: ':23B:', name: 'Bank Operation Code', value: 'CRED' },
      { tag: ':32A:', name: 'Value Date / Currency / Amount', value: `260318${currency}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 }).replace(/,/g, '')},00` },
      { tag: ':50K:', name: 'Ordering Customer', value: `/1234567890\n${COUNTERPARTIES[randomBetween(0, COUNTERPARTIES.length - 1)]}` },
      { tag: ':52A:', name: 'Ordering Institution', value: senderBic },
      { tag: ':57A:', name: 'Account With Institution', value: receiverBic },
      { tag: ':59:', name: 'Beneficiary Customer', value: `/9876543210\n${COUNTERPARTIES[randomBetween(0, COUNTERPARTIES.length - 1)]}` },
      { tag: ':70:', name: 'Remittance Information', value: 'PAYMENT FOR SERVICES' },
      { tag: ':71A:', name: 'Details of Charges', value: 'SHA' },
    ],
  };
}

export interface GetMessagesParams {
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface GetSwiftMessagesParams {
  reference?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}

export const gatewayApi = {
  getLiveStats: (): Promise<GatewayStats> => {
    if (DEMO) return Promise.resolve(generateMockStats());
    return apiGet<GatewayStats>('/v1/gateway/stats');
  },

  getThroughput: (): Promise<ThroughputPoint[]> => {
    if (DEMO) return Promise.resolve(generateMockThroughput());
    return apiGet<ThroughputPoint[]>('/v1/gateway/throughput');
  },

  getMessages: (params: GetMessagesParams): Promise<GatewayMessage[]> => {
    if (DEMO) {
      let messages = generateMockMessages(60);
      if (params.status) messages = messages.filter((m) => m.status === params.status);
      if (params.type) messages = messages.filter((m) => m.type === params.type);
      return Promise.resolve(messages);
    }
    return apiGet<GatewayMessage[]>('/v1/gateway/messages', params as Record<string, unknown>);
  },

  getMessage: (id: string): Promise<GatewayMessage> => {
    if (DEMO) return Promise.resolve(generateMockMessage(id));
    return apiGet<GatewayMessage>(`/v1/gateway/messages/${id}`);
  },

  retryMessage: (id: string): Promise<GatewayMessage> => {
    if (DEMO) return Promise.resolve(generateMockMessage(id));
    return apiPost<GatewayMessage>(`/v1/gateway/messages/${id}/retry`);
  },

  cancelMessage: (id: string): Promise<void> => {
    if (DEMO) return Promise.resolve();
    return apiPost<void>(`/v1/gateway/messages/${id}/cancel`);
  },

  manualOverride: (id: string, data: { action: string; notes: string }): Promise<void> => {
    if (DEMO) return Promise.resolve();
    return apiPost<void>(`/v1/gateway/messages/${id}/override`, data);
  },

  retryAllFailed: (): Promise<{ queued: number }> => {
    if (DEMO) return Promise.resolve({ queued: randomBetween(3, 18) });
    return apiPost<{ queued: number }>('/v1/gateway/messages/retry-all-failed');
  },

  getGatewayStatus: (): Promise<GatewayStatus[]> => {
    if (DEMO) return Promise.resolve(generateMockGatewayStatuses());
    return apiGet<GatewayStatus[]>('/v1/gateway/status');
  },

  getSwiftMessages: (params: GetSwiftMessagesParams): Promise<SwiftMessage[]> => {
    if (DEMO) {
      let messages = Array.from({ length: 40 }, (_, i) => generateMockSwiftMessage(String(i + 1).padStart(6, '0')));
      if (params.reference) messages = messages.filter((m) => m.reference.includes(params.reference!));
      if (params.type && params.type !== 'ALL') messages = messages.filter((m) => m.type === params.type);
      return Promise.resolve(messages);
    }
    return apiGet<SwiftMessage[]>('/v1/gateway/swift', params as Record<string, unknown>);
  },

  getSwiftMessage: (id: string): Promise<SwiftMessage> => {
    if (DEMO) return Promise.resolve(generateMockSwiftMessage(id));
    return apiGet<SwiftMessage>(`/v1/gateway/swift/${id}`);
  },
};
