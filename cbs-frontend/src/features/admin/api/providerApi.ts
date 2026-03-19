import { subDays, subMinutes, subHours, format } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ProviderStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'MAINTENANCE';
export type ProviderType = 'IDENTITY' | 'PAYMENT_SWITCH' | 'CREDIT_BUREAU' | 'SMS' | 'EMAIL' | 'PUSH' | 'INSURANCE' | 'REMITTANCE' | 'USSD' | 'CARD_SCHEME';
export type IntegrationType = 'REST' | 'SOAP' | 'ISO8583' | 'SFTP' | 'SDK';
export type CostModel = 'PER_CALL' | 'MONTHLY_FLAT' | 'TIERED' | 'REVENUE_SHARE';

export interface ServiceProvider {
  id: string;
  code: string;
  name: string;
  type: ProviderType;
  integration: IntegrationType;
  description: string;
  baseUrl: string;
  uptime: number;
  avgLatencyMs: number;
  monthlyVolume: number;
  todayCalls: number;
  todayErrors: number;
  costModel: CostModel;
  monthlyCost: number;
  budget: number;
  status: ProviderStatus;
  failoverProviderId?: string;
  failoverTrigger?: string;
  lastHealthCheck: string;
  registeredAt: string;
}

export interface ProviderHealthLog {
  timestamp: string;
  uptime: number;
  avgLatencyMs: number;
  callCount: number;
  errorCount: number;
  status: ProviderStatus;
}

export interface ProviderTransaction {
  id: string;
  providerId: string;
  timestamp: string;
  endpoint: string;
  method: string;
  responseCode: string;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  errorMessage?: string;
}

export interface SlaRecord {
  month: string;
  provider: string;
  providerName: string;
  slaUptimeTarget: number;
  actualUptime: number;
  slaResponseTarget: number;
  actualResponse: number;
  uptimeMet: boolean;
  responseMet: boolean;
  penaltyAmount?: number;
}

export interface CostRecord {
  month: string;
  providerId: string;
  providerName: string;
  costModel: CostModel;
  unitCost: number;
  volume: number;
  totalCost: number;
  budget: number;
  variance: number;
}

// ─── Demo Data ────────────────────────────────────────────────────────────

const now = new Date();

const DEMO_PROVIDERS: ServiceProvider[] = [
  {
    id: 'prov-001',
    code: 'NIBSS-BVN',
    name: 'NIBSS BVN Service',
    type: 'IDENTITY',
    integration: 'REST',
    description: 'Nigeria Inter-Bank Settlement System BVN verification and identity validation service for customer onboarding and KYC compliance.',
    baseUrl: 'https://api.nibss-plc.com.ng/bvn/v2',
    uptime: 99.95,
    avgLatencyMs: 120,
    monthlyVolume: 48200,
    todayCalls: 1842,
    todayErrors: 12,
    costModel: 'PER_CALL',
    monthlyCost: 1205000,
    budget: 1500000,
    status: 'HEALTHY',
    failoverProviderId: undefined,
    failoverTrigger: 'error rate > 5% for 5 minutes',
    lastHealthCheck: subMinutes(now, 3).toISOString(),
    registeredAt: subDays(now, 720).toISOString(),
  },
  {
    id: 'prov-002',
    code: 'NIBSS-NIP',
    name: 'NIBSS NIP (Instant Payments)',
    type: 'PAYMENT_SWITCH',
    integration: 'ISO8583',
    description: 'NIBSS Instant Payment platform for real-time interbank fund transfers. Handles all NIP credit and name enquiry transactions.',
    baseUrl: 'tcp://nibssnip.nibss-plc.com.ng:5000',
    uptime: 99.98,
    avgLatencyMs: 89,
    monthlyVolume: 312400,
    todayCalls: 11200,
    todayErrors: 8,
    costModel: 'PER_CALL',
    monthlyCost: 7810000,
    budget: 8000000,
    status: 'HEALTHY',
    failoverProviderId: 'prov-005',
    failoverTrigger: 'error rate > 5% for 5 minutes',
    lastHealthCheck: subMinutes(now, 1).toISOString(),
    registeredAt: subDays(now, 900).toISOString(),
  },
  {
    id: 'prov-003',
    code: 'CREDIT-REG',
    name: 'CreditRegistry Nigeria',
    type: 'CREDIT_BUREAU',
    integration: 'REST',
    description: 'Credit Bureau services for credit history checks, scoring, and financial risk assessment during loan origination.',
    baseUrl: 'https://api.creditregistry.ng/v3',
    uptime: 98.5,
    avgLatencyMs: 450,
    monthlyVolume: 18900,
    todayCalls: 620,
    todayErrors: 48,
    costModel: 'PER_CALL',
    monthlyCost: 945000,
    budget: 1000000,
    status: 'DEGRADED',
    failoverProviderId: undefined,
    failoverTrigger: 'error rate > 10% for 15 minutes',
    lastHealthCheck: subMinutes(now, 5).toISOString(),
    registeredAt: subDays(now, 480).toISOString(),
  },
  {
    id: 'prov-004',
    code: 'INFOBIP-SMS',
    name: 'InfoBip SMS Gateway',
    type: 'SMS',
    integration: 'REST',
    description: 'SMS notification gateway for OTP delivery, transaction alerts, and marketing communications to customers.',
    baseUrl: 'https://api.infobip.com/sms/2',
    uptime: 99.9,
    avgLatencyMs: 45,
    monthlyVolume: 284000,
    todayCalls: 9800,
    todayErrors: 15,
    costModel: 'TIERED',
    monthlyCost: 2130000,
    budget: 2500000,
    status: 'HEALTHY',
    failoverProviderId: undefined,
    failoverTrigger: 'error rate > 5% for 5 minutes',
    lastHealthCheck: subMinutes(now, 2).toISOString(),
    registeredAt: subDays(now, 600).toISOString(),
  },
  {
    id: 'prov-005',
    code: 'INTERSWITCH',
    name: 'Interswitch Card Scheme',
    type: 'CARD_SCHEME',
    integration: 'ISO8583',
    description: 'Interswitch Verve card scheme integration for card issuance, POS transactions, ATM processing, and dispute management.',
    baseUrl: 'tcp://iswitch.interswitchng.com:9900',
    uptime: 99.97,
    avgLatencyMs: 67,
    monthlyVolume: 198000,
    todayCalls: 7400,
    todayErrors: 22,
    costModel: 'REVENUE_SHARE',
    monthlyCost: 4950000,
    budget: 5000000,
    status: 'HEALTHY',
    failoverProviderId: undefined,
    failoverTrigger: 'latency > 5x baseline for 5 minutes',
    lastHealthCheck: subMinutes(now, 2).toISOString(),
    registeredAt: subDays(now, 1100).toISOString(),
  },
  {
    id: 'prov-006',
    code: 'SENDGRID',
    name: 'SendGrid Email Service',
    type: 'EMAIL',
    integration: 'REST',
    description: 'Transactional email delivery service for account statements, onboarding emails, password resets, and regulatory notices.',
    baseUrl: 'https://api.sendgrid.com/v3',
    uptime: 99.8,
    avgLatencyMs: 200,
    monthlyVolume: 68000,
    todayCalls: 2200,
    todayErrors: 9,
    costModel: 'MONTHLY_FLAT',
    monthlyCost: 420000,
    budget: 500000,
    status: 'HEALTHY',
    failoverProviderId: undefined,
    failoverTrigger: 'error rate > 5% for 5 minutes',
    lastHealthCheck: subMinutes(now, 4).toISOString(),
    registeredAt: subDays(now, 550).toISOString(),
  },
  {
    id: 'prov-007',
    code: 'MTN-USSD',
    name: 'MTN USSD Banking Channel',
    type: 'USSD',
    integration: 'SDK',
    description: 'MTN USSD platform for mobile banking access without internet, enabling balance enquiry, transfers, and bill payments via *737#.',
    baseUrl: 'sdk://mtn-ussd-gw.mtn.ng',
    uptime: 97.0,
    avgLatencyMs: 800,
    monthlyVolume: 42000,
    todayCalls: 1400,
    todayErrors: 112,
    costModel: 'REVENUE_SHARE',
    monthlyCost: 1050000,
    budget: 900000,
    status: 'DEGRADED',
    failoverProviderId: undefined,
    failoverTrigger: 'error rate > 10% for 10 minutes',
    lastHealthCheck: subMinutes(now, 8).toISOString(),
    registeredAt: subDays(now, 400).toISOString(),
  },
  {
    id: 'prov-008',
    code: 'WESTERN-UNION',
    name: 'Western Union Remittance',
    type: 'REMITTANCE',
    integration: 'REST',
    description: 'Western Union international remittance payout service for diaspora inbound transfers in USD, GBP, EUR converted to NGN.',
    baseUrl: 'https://wuapi.westernunion.com/disbursement/v2',
    uptime: 99.5,
    avgLatencyMs: 350,
    monthlyVolume: 8400,
    todayCalls: 280,
    todayErrors: 6,
    costModel: 'PER_CALL',
    monthlyCost: 1680000,
    budget: 2000000,
    status: 'HEALTHY',
    failoverProviderId: undefined,
    failoverTrigger: 'error rate > 5% for 5 minutes',
    lastHealthCheck: subMinutes(now, 6).toISOString(),
    registeredAt: subDays(now, 320).toISOString(),
  },
];

// ─── Health Logs ──────────────────────────────────────────────────────────

function generateHealthLogs(provider: ServiceProvider, days = 30): ProviderHealthLog[] {
  const logs: ProviderHealthLog[] = [];
  const baseUptime = provider.uptime;
  const baseLatency = provider.avgLatencyMs;

  for (let d = days - 1; d >= 0; d--) {
    const date = subDays(now, d);
    const isDegraded = provider.status === 'DEGRADED';
    const uptimeVariance = isDegraded ? (Math.random() * 4 - 3) : (Math.random() * 0.2 - 0.1);
    const latencyVariance = isDegraded ? (Math.random() * 200 - 50) : (Math.random() * 40 - 20);
    const dailyUptime = Math.min(100, Math.max(90, baseUptime + uptimeVariance));
    const dailyLatency = Math.max(10, baseLatency + latencyVariance);
    const callCount = Math.floor(provider.monthlyVolume / 30 + (Math.random() * 500 - 250));
    const errorRate = 1 - dailyUptime / 100;
    const errorCount = Math.floor(callCount * errorRate);

    let status: ProviderStatus = 'HEALTHY';
    if (dailyUptime < 97) status = 'DOWN';
    else if (dailyUptime < 99) status = 'DEGRADED';

    logs.push({
      timestamp: date.toISOString(),
      uptime: parseFloat(dailyUptime.toFixed(2)),
      avgLatencyMs: parseFloat(dailyLatency.toFixed(0)),
      callCount: Math.max(0, callCount),
      errorCount: Math.max(0, errorCount),
      status,
    });
  }
  return logs;
}

const HEALTH_LOGS: Record<string, ProviderHealthLog[]> = {};
DEMO_PROVIDERS.forEach(p => {
  HEALTH_LOGS[p.id] = generateHealthLogs(p);
});

// ─── Transaction Logs ─────────────────────────────────────────────────────

const ENDPOINTS_BY_TYPE: Record<ProviderType, string[]> = {
  IDENTITY: ['/verify-bvn', '/name-enquiry', '/validate-nin', '/get-profile'],
  PAYMENT_SWITCH: ['/credit-transfer', '/name-enquiry', '/transaction-status', '/reversal'],
  CREDIT_BUREAU: ['/credit-report', '/credit-score', '/enquiry', '/consent'],
  SMS: ['/messages', '/messages/status', '/bulk-messages'],
  EMAIL: ['/mail/send', '/mail/status', '/templates'],
  PUSH: ['/push/send', '/push/status'],
  INSURANCE: ['/policy/create', '/policy/status', '/claims'],
  REMITTANCE: ['/payout', '/status', '/fx-rates', '/confirm'],
  USSD: ['/session/start', '/session/input', '/session/end'],
  CARD_SCHEME: ['/authorization', '/reversal', '/settlement', '/dispute'],
};

function generateTransactions(provider: ServiceProvider, count = 20): ProviderTransaction[] {
  const txns: ProviderTransaction[] = [];
  const endpoints = ENDPOINTS_BY_TYPE[provider.type] || ['/api'];
  const methods = ['POST', 'GET', 'PUT'];
  const successCodes = ['200', '201', '202'];
  const errorCodes = ['400', '422', '500', '503', '504'];
  const errorMessages = [
    'Service temporarily unavailable',
    'Invalid request parameters',
    'Timeout waiting for downstream response',
    'Rate limit exceeded',
    'Authentication failed',
    'Provider circuit breaker open',
  ];

  for (let i = 0; i < count; i++) {
    const minutesAgo = i * 12 + Math.floor(Math.random() * 10);
    const isError = Math.random() < (provider.status === 'DEGRADED' ? 0.15 : 0.03);
    const isTimeout = !isError && Math.random() < (provider.status === 'DEGRADED' ? 0.05 : 0.01);
    const status = isError ? 'ERROR' : isTimeout ? 'TIMEOUT' : 'SUCCESS';
    const responseCode = isError
      ? errorCodes[Math.floor(Math.random() * errorCodes.length)]
      : isTimeout ? '504' : successCodes[0];
    const latency = isTimeout
      ? provider.avgLatencyMs * 5 + Math.floor(Math.random() * 1000)
      : isError
        ? provider.avgLatencyMs * 2 + Math.floor(Math.random() * 200)
        : provider.avgLatencyMs + Math.floor(Math.random() * 80 - 40);

    txns.push({
      id: `txn-${provider.id}-${i}`,
      providerId: provider.id,
      timestamp: subMinutes(now, minutesAgo).toISOString(),
      endpoint: endpoints[i % endpoints.length],
      method: methods[i % methods.length === 0 ? 0 : i % 2 === 0 ? 1 : 0],
      responseCode,
      latencyMs: Math.max(10, latency),
      status,
      errorMessage: isError || isTimeout ? errorMessages[Math.floor(Math.random() * errorMessages.length)] : undefined,
    });
  }
  return txns;
}

const TRANSACTION_LOGS: Record<string, ProviderTransaction[]> = {};
DEMO_PROVIDERS.forEach(p => {
  TRANSACTION_LOGS[p.id] = generateTransactions(p, 50);
});

// ─── SLA Records ──────────────────────────────────────────────────────────

function generateSlaRecords(): SlaRecord[] {
  const records: SlaRecord[] = [];

  DEMO_PROVIDERS.forEach(provider => {
    for (let m = 11; m >= 0; m--) {
      const date = subDays(now, m * 30);
      const monthStr = format(date, 'yyyy-MM');
      const slaUptimeTarget = 99.9;
      const slaResponseTarget = provider.type === 'PAYMENT_SWITCH' ? 150 : provider.type === 'IDENTITY' ? 200 : 500;

      const isDegradedMonth = provider.status === 'DEGRADED' && m < 3;
      const uptimeVariance = isDegradedMonth ? -(Math.random() * 2 + 0.5) : Math.random() * 0.15 - 0.05;
      const actualUptime = Math.min(100, Math.max(96, provider.uptime + uptimeVariance));
      const responseVariance = isDegradedMonth ? Math.random() * 150 + 50 : Math.random() * 40 - 20;
      const actualResponse = Math.max(20, provider.avgLatencyMs + responseVariance);
      const uptimeMet = actualUptime >= slaUptimeTarget;
      const responseMet = actualResponse <= slaResponseTarget;
      const penaltyAmount = (!uptimeMet || !responseMet) ? Math.floor(Math.random() * 200000 + 50000) : 0;

      records.push({
        month: monthStr,
        provider: provider.id,
        providerName: provider.name,
        slaUptimeTarget,
        actualUptime: parseFloat(actualUptime.toFixed(3)),
        slaResponseTarget,
        actualResponse: parseFloat(actualResponse.toFixed(0)),
        uptimeMet,
        responseMet,
        penaltyAmount,
      });
    }
  });

  return records;
}

const SLA_RECORDS = generateSlaRecords();

// ─── Cost Records ─────────────────────────────────────────────────────────

function generateCostRecords(): CostRecord[] {
  const records: CostRecord[] = [];

  DEMO_PROVIDERS.forEach(provider => {
    for (let m = 11; m >= 0; m--) {
      const date = subDays(now, m * 30);
      const monthStr = format(date, 'yyyy-MM');
      const volumeVariance = Math.floor(Math.random() * provider.monthlyVolume * 0.2 - provider.monthlyVolume * 0.1);
      const volume = Math.max(0, provider.monthlyVolume + volumeVariance);
      const unitCost = provider.costModel === 'PER_CALL'
        ? parseFloat((provider.monthlyCost / provider.monthlyVolume).toFixed(2))
        : provider.costModel === 'MONTHLY_FLAT' ? 0
        : parseFloat((provider.monthlyCost / provider.monthlyVolume).toFixed(4));
      const costVariance = Math.floor(Math.random() * provider.monthlyCost * 0.1 - provider.monthlyCost * 0.05);
      const totalCost = Math.max(0, provider.monthlyCost + costVariance);
      const variance = totalCost - provider.budget;

      records.push({
        month: monthStr,
        providerId: provider.id,
        providerName: provider.name,
        costModel: provider.costModel,
        unitCost,
        volume,
        totalCost,
        budget: provider.budget,
        variance,
      });
    }
  });

  return records;
}

const COST_RECORDS = generateCostRecords();

// ─── API ──────────────────────────────────────────────────────────────────

const IS_DEMO = true;

function delay<T>(val: T, ms = 300): Promise<T> {
  return new Promise(res => setTimeout(() => res(val), ms));
}

export type RegisterProviderRequest = Omit<ServiceProvider, 'id' | 'uptime' | 'avgLatencyMs' | 'monthlyVolume' | 'todayCalls' | 'todayErrors' | 'monthlyCost' | 'status' | 'lastHealthCheck' | 'registeredAt'> & {
  slaUptimeTarget?: number;
  slaResponseTarget?: number;
};

export type UpdateProviderRequest = Partial<RegisterProviderRequest>;

export const providerApi = {
  getProviders: (): Promise<ServiceProvider[]> => {
    if (IS_DEMO) return delay([...DEMO_PROVIDERS]);
    return Promise.reject(new Error('Not implemented'));
  },

  getProviderById: (id: string): Promise<ServiceProvider> => {
    if (IS_DEMO) {
      const p = DEMO_PROVIDERS.find(p => p.id === id);
      if (!p) return Promise.reject(new Error('Provider not found'));
      return delay({ ...p });
    }
    return Promise.reject(new Error('Not implemented'));
  },

  registerProvider: (data: RegisterProviderRequest): Promise<ServiceProvider> => {
    if (IS_DEMO) {
      const newProvider: ServiceProvider = {
        ...data,
        id: `prov-${Date.now()}`,
        uptime: 100,
        avgLatencyMs: 0,
        monthlyVolume: 0,
        todayCalls: 0,
        todayErrors: 0,
        monthlyCost: 0,
        status: 'HEALTHY',
        lastHealthCheck: now.toISOString(),
        registeredAt: now.toISOString(),
      };
      DEMO_PROVIDERS.push(newProvider);
      HEALTH_LOGS[newProvider.id] = [];
      TRANSACTION_LOGS[newProvider.id] = [];
      return delay(newProvider);
    }
    return Promise.reject(new Error('Not implemented'));
  },

  updateProvider: (id: string, data: UpdateProviderRequest): Promise<ServiceProvider> => {
    if (IS_DEMO) {
      const idx = DEMO_PROVIDERS.findIndex(p => p.id === id);
      if (idx === -1) return Promise.reject(new Error('Provider not found'));
      Object.assign(DEMO_PROVIDERS[idx], data);
      return delay({ ...DEMO_PROVIDERS[idx] });
    }
    return Promise.reject(new Error('Not implemented'));
  },

  healthCheckNow: (id: string): Promise<ServiceProvider> => {
    if (IS_DEMO) {
      const p = DEMO_PROVIDERS.find(p => p.id === id);
      if (!p) return Promise.reject(new Error('Provider not found'));
      p.lastHealthCheck = new Date().toISOString();
      return delay({ ...p }, 800);
    }
    return Promise.reject(new Error('Not implemented'));
  },

  triggerFailover: (id: string): Promise<{ success: boolean; message: string }> => {
    if (IS_DEMO) {
      const p = DEMO_PROVIDERS.find(p => p.id === id);
      if (!p) return Promise.reject(new Error('Provider not found'));
      return delay({ success: true, message: `Failover triggered for ${p.name}. Traffic rerouted to failover provider.` }, 600);
    }
    return Promise.reject(new Error('Not implemented'));
  },

  suspendProvider: (id: string): Promise<ServiceProvider> => {
    if (IS_DEMO) {
      const p = DEMO_PROVIDERS.find(p => p.id === id);
      if (!p) return Promise.reject(new Error('Provider not found'));
      p.status = 'MAINTENANCE';
      return delay({ ...p }, 400);
    }
    return Promise.reject(new Error('Not implemented'));
  },

  getHealthLog: (id: string, days = 30): Promise<ProviderHealthLog[]> => {
    if (IS_DEMO) {
      const logs = HEALTH_LOGS[id] || [];
      return delay(logs.slice(-days));
    }
    return Promise.reject(new Error('Not implemented'));
  },

  getTransactionLog: (id: string, params?: { limit?: number; status?: string }): Promise<ProviderTransaction[]> => {
    if (IS_DEMO) {
      let txns = TRANSACTION_LOGS[id] || [];
      if (params?.status) txns = txns.filter(t => t.status === params.status);
      return delay(txns.slice(0, params?.limit || 50));
    }
    return Promise.reject(new Error('Not implemented'));
  },

  getSlaRecords: (providerId?: string): Promise<SlaRecord[]> => {
    if (IS_DEMO) {
      const records = providerId
        ? SLA_RECORDS.filter(r => r.provider === providerId)
        : SLA_RECORDS;
      return delay([...records]);
    }
    return Promise.reject(new Error('Not implemented'));
  },

  getCostRecords: (providerId?: string): Promise<CostRecord[]> => {
    if (IS_DEMO) {
      const records = providerId
        ? COST_RECORDS.filter(r => r.providerId === providerId)
        : COST_RECORDS;
      return delay([...records]);
    }
    return Promise.reject(new Error('Not implemented'));
  },

  saveFailoverConfig: (id: string, config: { failoverProviderId?: string; failoverTrigger?: string; monitoringWindow?: string; autoFailover?: boolean; notifyOnFailover?: boolean }): Promise<ServiceProvider> => {
    if (IS_DEMO) {
      const p = DEMO_PROVIDERS.find(p => p.id === id);
      if (!p) return Promise.reject(new Error('Provider not found'));
      p.failoverProviderId = config.failoverProviderId;
      p.failoverTrigger = config.failoverTrigger;
      return delay({ ...p });
    }
    return Promise.reject(new Error('Not implemented'));
  },
};
