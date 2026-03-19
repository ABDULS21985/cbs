import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface FixedDeposit {
  id: string;
  fdNumber: string;
  customerId: string;
  customerName: string;
  sourceAccountId: string;
  sourceAccountNumber: string;
  principalAmount: number;
  currency: string;
  interestRate: number;
  tenor: number;
  tenorUnit: 'DAYS';
  startDate: string;
  maturityDate: string;
  grossInterest: number;
  wht: number;
  netInterest: number;
  maturityValue: number;
  maturityInstruction: 'ROLLOVER_ALL' | 'ROLLOVER_PRINCIPAL' | 'LIQUIDATE' | 'MANUAL';
  destinationAccountId?: string;
  status: 'ACTIVE' | 'MATURED' | 'LIQUIDATED' | 'ROLLED_OVER';
  rolloverCount?: number;
  parentFdId?: string;
}

export interface RateTable {
  tenor: number;
  tenorLabel: string;
  standardRate: number;
  premiumRate: number;
}

export interface InterestCalcParams {
  principal: number;
  rate: number;
  tenor: number;
}

export interface InterestCalcResult {
  principal: number;
  rate: number;
  tenor: number;
  grossInterest: number;
  wht: number;
  netInterest: number;
  maturityValue: number;
}

export interface FdStats {
  totalBalance: number;
  activeFds: number;
  maturingSoon: number;
  averageRate: number;
}

export interface EarlyWithdrawalInfo {
  penaltyRate: number;
  penaltyAmount: number;
  accruedInterest: number;
  netProceeds: number;
  breakDate: string;
}

export interface MaturityInstruction {
  type: 'ROLLOVER_ALL' | 'ROLLOVER_PRINCIPAL' | 'LIQUIDATE' | 'MANUAL';
  destinationAccountId?: string;
}

export interface CreateFdRequest {
  customerId: string;
  sourceAccountId: string;
  principalAmount: number;
  currency: string;
  tenor: number;
  rate: number;
  maturityInstruction: MaturityInstruction;
}

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// ---- Mock data ----

const MOCK_RATE_TABLES: RateTable[] = [
  { tenor: 30,  tenorLabel: '30 days',  standardRate: 8.00,  premiumRate: 9.00  },
  { tenor: 60,  tenorLabel: '60 days',  standardRate: 9.50,  premiumRate: 10.50 },
  { tenor: 90,  tenorLabel: '90 days',  standardRate: 11.00, premiumRate: 12.00 },
  { tenor: 180, tenorLabel: '180 days', standardRate: 12.50, premiumRate: 13.50 },
  { tenor: 365, tenorLabel: '365 days', standardRate: 14.00, premiumRate: 15.00 },
];

function calcFdValues(principal: number, rate: number, tenor: number) {
  const grossInterest = principal * (rate / 100) * (tenor / 365);
  const wht = grossInterest * 0.10;
  const netInterest = grossInterest - wht;
  const maturityValue = principal + netInterest;
  return { grossInterest, wht, netInterest, maturityValue };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const MOCK_FDS: FixedDeposit[] = [
  {
    id: 'fd-001', fdNumber: 'FD2025030001', customerId: 'cust-001',
    customerName: 'Chukwuemeka Obi', sourceAccountId: 'acc-001',
    sourceAccountNumber: '0012345678', principalAmount: 5_000_000, currency: 'NGN',
    interestRate: 12.50, tenor: 180, tenorUnit: 'DAYS',
    startDate: '2025-09-01', maturityDate: '2026-02-28',
    ...calcFdValues(5_000_000, 12.50, 180),
    maturityInstruction: 'ROLLOVER_ALL', status: 'MATURED', rolloverCount: 0,
  },
  {
    id: 'fd-002', fdNumber: 'FD2025120002', customerId: 'cust-002',
    customerName: 'Adaeze Nwosu', sourceAccountId: 'acc-002',
    sourceAccountNumber: '0023456789', principalAmount: 10_000_000, currency: 'NGN',
    interestRate: 14.00, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2025-12-01', maturityDate: '2026-12-01',
    ...calcFdValues(10_000_000, 14.00, 365),
    maturityInstruction: 'LIQUIDATE', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-003', fdNumber: 'FD2026010003', customerId: 'cust-003',
    customerName: 'Emeka Eze', sourceAccountId: 'acc-003',
    sourceAccountNumber: '0034567890', principalAmount: 2_500_000, currency: 'NGN',
    interestRate: 11.00, tenor: 90, tenorUnit: 'DAYS',
    startDate: '2026-01-05', maturityDate: '2026-04-05',
    ...calcFdValues(2_500_000, 11.00, 90),
    maturityInstruction: 'ROLLOVER_PRINCIPAL', status: 'ACTIVE', rolloverCount: 1, parentFdId: 'fd-003-prev',
  },
  {
    id: 'fd-004', fdNumber: 'FD2026010004', customerId: 'cust-004',
    customerName: 'Fatima Bello', sourceAccountId: 'acc-004',
    sourceAccountNumber: '0045678901', principalAmount: 15_000_000, currency: 'NGN',
    interestRate: 15.00, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2026-01-15', maturityDate: '2027-01-15',
    ...calcFdValues(15_000_000, 15.00, 365),
    maturityInstruction: 'ROLLOVER_ALL', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-005', fdNumber: 'FD2026020005', customerId: 'cust-005',
    customerName: 'Musa Ibrahim', sourceAccountId: 'acc-005',
    sourceAccountNumber: '0056789012', principalAmount: 3_000_000, currency: 'NGN',
    interestRate: 9.50, tenor: 60, tenorUnit: 'DAYS',
    startDate: '2026-01-20', maturityDate: '2026-03-20',
    ...calcFdValues(3_000_000, 9.50, 60),
    maturityInstruction: 'LIQUIDATE', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-006', fdNumber: 'FD2026020006', customerId: 'cust-006',
    customerName: 'Ngozi Okonkwo', sourceAccountId: 'acc-006',
    sourceAccountNumber: '0067890123', principalAmount: 8_000_000, currency: 'NGN',
    interestRate: 13.50, tenor: 180, tenorUnit: 'DAYS',
    startDate: '2025-10-01', maturityDate: '2026-03-30',
    ...calcFdValues(8_000_000, 13.50, 180),
    maturityInstruction: 'MANUAL', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-007', fdNumber: 'FD2026020007', customerId: 'cust-007',
    customerName: 'Tunde Adesanya', sourceAccountId: 'acc-007',
    sourceAccountNumber: '0078901234', principalAmount: 20_000_000, currency: 'NGN',
    interestRate: 14.00, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2026-02-01', maturityDate: '2027-02-01',
    ...calcFdValues(20_000_000, 14.00, 365),
    maturityInstruction: 'ROLLOVER_ALL', status: 'ACTIVE', rolloverCount: 2,
  },
  {
    id: 'fd-008', fdNumber: 'FD2026020008', customerId: 'cust-008',
    customerName: 'Amina Suleiman', sourceAccountId: 'acc-008',
    sourceAccountNumber: '0089012345', principalAmount: 1_000_000, currency: 'NGN',
    interestRate: 8.00, tenor: 30, tenorUnit: 'DAYS',
    startDate: '2026-02-15', maturityDate: '2026-03-17',
    ...calcFdValues(1_000_000, 8.00, 30),
    maturityInstruction: 'LIQUIDATE', status: 'MATURED', rolloverCount: 0,
  },
  {
    id: 'fd-009', fdNumber: 'FD2026020009', customerId: 'cust-009',
    customerName: 'Chidi Okoro', sourceAccountId: 'acc-009',
    sourceAccountNumber: '0090123456', principalAmount: 6_500_000, currency: 'NGN',
    interestRate: 12.50, tenor: 180, tenorUnit: 'DAYS',
    startDate: '2025-09-22', maturityDate: '2026-03-21',
    ...calcFdValues(6_500_000, 12.50, 180),
    maturityInstruction: 'ROLLOVER_PRINCIPAL', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-010', fdNumber: 'FD2025110010', customerId: 'cust-010',
    customerName: 'Bola Adeleke', sourceAccountId: 'acc-010',
    sourceAccountNumber: '0101234567', principalAmount: 50_000_000, currency: 'NGN',
    interestRate: 15.00, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2025-11-01', maturityDate: '2026-11-01',
    ...calcFdValues(50_000_000, 15.00, 365),
    maturityInstruction: 'ROLLOVER_ALL', status: 'ACTIVE', rolloverCount: 3,
  },
  {
    id: 'fd-011', fdNumber: 'FD2025060011', customerId: 'cust-001',
    customerName: 'Chukwuemeka Obi', sourceAccountId: 'acc-001',
    sourceAccountNumber: '0012345678', principalAmount: 4_000_000, currency: 'NGN',
    interestRate: 12.00, tenor: 180, tenorUnit: 'DAYS',
    startDate: '2024-12-01', maturityDate: '2025-05-30',
    ...calcFdValues(4_000_000, 12.00, 180),
    maturityInstruction: 'ROLLOVER_ALL', status: 'ROLLED_OVER', rolloverCount: 1,
  },
  {
    id: 'fd-012', fdNumber: 'FD2025090012', customerId: 'cust-011',
    customerName: 'Kemi Afolabi', sourceAccountId: 'acc-011',
    sourceAccountNumber: '0112345678', principalAmount: 4_200_000, currency: 'NGN',
    interestRate: 11.00, tenor: 90, tenorUnit: 'DAYS',
    startDate: '2025-06-01', maturityDate: '2025-08-30',
    ...calcFdValues(4_200_000, 11.00, 90),
    maturityInstruction: 'LIQUIDATE', status: 'LIQUIDATED', rolloverCount: 0,
  },
  {
    id: 'fd-013', fdNumber: 'FD2026030013', customerId: 'cust-012',
    customerName: 'Olumide Babatunde', sourceAccountId: 'acc-012',
    sourceAccountNumber: '0123456789', principalAmount: 7_500_000, currency: 'NGN',
    interestRate: 13.50, tenor: 180, tenorUnit: 'DAYS',
    startDate: '2025-09-15', maturityDate: '2026-03-14',
    ...calcFdValues(7_500_000, 13.50, 180),
    maturityInstruction: 'ROLLOVER_PRINCIPAL', status: 'MATURED', rolloverCount: 0,
  },
  {
    id: 'fd-014', fdNumber: 'FD2026030014', customerId: 'cust-013',
    customerName: 'Hadiza Musa', sourceAccountId: 'acc-013',
    sourceAccountNumber: '0134567890', principalAmount: 12_000_000, currency: 'NGN',
    interestRate: 14.00, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2025-03-20', maturityDate: '2026-03-20',
    ...calcFdValues(12_000_000, 14.00, 365),
    maturityInstruction: 'MANUAL', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-015', fdNumber: 'FD2026030015', customerId: 'cust-014',
    customerName: 'Emeka Johnson', sourceAccountId: 'acc-014',
    sourceAccountNumber: '0145678901', principalAmount: 3_750_000, currency: 'NGN',
    interestRate: 9.50, tenor: 60, tenorUnit: 'DAYS',
    startDate: '2026-01-20', maturityDate: '2026-03-21',
    ...calcFdValues(3_750_000, 9.50, 60),
    maturityInstruction: 'LIQUIDATE', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-016', fdNumber: 'FD2025080016', customerId: 'cust-015',
    customerName: 'Chidinma Eze', sourceAccountId: 'acc-015',
    sourceAccountNumber: '0156789012', principalAmount: 25_000_000, currency: 'NGN',
    interestRate: 14.50, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2024-08-01', maturityDate: '2025-08-01',
    ...calcFdValues(25_000_000, 14.50, 365),
    maturityInstruction: 'ROLLOVER_ALL', status: 'ROLLED_OVER', rolloverCount: 1,
  },
  {
    id: 'fd-017', fdNumber: 'FD2026030017', customerId: 'cust-016',
    customerName: 'Rotimi Akindele', sourceAccountId: 'acc-016',
    sourceAccountNumber: '0167890123', principalAmount: 9_000_000, currency: 'NGN',
    interestRate: 12.50, tenor: 180, tenorUnit: 'DAYS',
    startDate: '2025-09-25', maturityDate: '2026-03-24',
    ...calcFdValues(9_000_000, 12.50, 180),
    maturityInstruction: 'ROLLOVER_PRINCIPAL', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-018', fdNumber: 'FD2026020018', customerId: 'cust-017',
    customerName: 'Uche Nwachukwu', sourceAccountId: 'acc-017',
    sourceAccountNumber: '0178901234', principalAmount: 1_800_000, currency: 'NGN',
    interestRate: 8.00, tenor: 30, tenorUnit: 'DAYS',
    startDate: '2026-02-01', maturityDate: '2026-03-03',
    ...calcFdValues(1_800_000, 8.00, 30),
    maturityInstruction: 'LIQUIDATE', status: 'MATURED', rolloverCount: 0,
  },
  {
    id: 'fd-019', fdNumber: 'FD2026010019', customerId: 'cust-018',
    customerName: 'Seun Ogundimu', sourceAccountId: 'acc-018',
    sourceAccountNumber: '0189012345', principalAmount: 30_000_000, currency: 'NGN',
    interestRate: 15.00, tenor: 365, tenorUnit: 'DAYS',
    startDate: '2026-01-10', maturityDate: '2027-01-10',
    ...calcFdValues(30_000_000, 15.00, 365),
    maturityInstruction: 'ROLLOVER_ALL', status: 'ACTIVE', rolloverCount: 0,
  },
  {
    id: 'fd-020', fdNumber: 'FD2025070020', customerId: 'cust-019',
    customerName: 'Yetunde Olatunji', sourceAccountId: 'acc-019',
    sourceAccountNumber: '0190123456', principalAmount: 5_500_000, currency: 'NGN',
    interestRate: 11.00, tenor: 90, tenorUnit: 'DAYS',
    startDate: '2025-04-10', maturityDate: '2025-07-09',
    ...calcFdValues(5_500_000, 11.00, 90),
    maturityInstruction: 'LIQUIDATE', status: 'LIQUIDATED', rolloverCount: 0,
  },
];

export const fixedDepositApi = {
  getFixedDeposits: async (params: { status?: string; page?: number; pageSize?: number }): Promise<FixedDeposit[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      if (!params.status || params.status === 'ALL') return MOCK_FDS;
      return MOCK_FDS.filter((fd) => fd.status === params.status);
    }
    return apiGet<FixedDeposit[]>('/v1/fixed-deposits', params as Record<string, unknown>);
  },

  getFixedDeposit: async (id: string): Promise<FixedDeposit> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 350));
      const fd = MOCK_FDS.find((f) => f.id === id);
      if (fd) return fd;
      return { ...MOCK_FDS[0], id };
    }
    return apiGet<FixedDeposit>(`/v1/fixed-deposits/${id}`);
  },

  createFixedDeposit: async (data: CreateFdRequest): Promise<FixedDeposit> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 800));
      const { grossInterest, wht, netInterest, maturityValue } = calcFdValues(data.principalAmount, data.rate, data.tenor);
      const today = new Date().toISOString().split('T')[0];
      return {
        id: `fd-${Date.now()}`,
        fdNumber: `FD${Date.now()}`,
        customerId: data.customerId,
        customerName: 'New Customer',
        sourceAccountId: data.sourceAccountId,
        sourceAccountNumber: '0000000000',
        principalAmount: data.principalAmount,
        currency: data.currency,
        interestRate: data.rate,
        tenor: data.tenor,
        tenorUnit: 'DAYS',
        startDate: today,
        maturityDate: addDays(today, data.tenor),
        grossInterest,
        wht,
        netInterest,
        maturityValue,
        maturityInstruction: data.maturityInstruction.type,
        destinationAccountId: data.maturityInstruction.destinationAccountId,
        status: 'ACTIVE',
        rolloverCount: 0,
      };
    }
    return apiPost<FixedDeposit>('/v1/fixed-deposits', data);
  },

  getRateTables: async (): Promise<RateTable[]> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_RATE_TABLES;
    }
    return apiGet<RateTable[]>('/v1/fixed-deposits/rates');
  },

  calculateInterest: async (params: InterestCalcParams): Promise<InterestCalcResult> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      const { grossInterest, wht, netInterest, maturityValue } = calcFdValues(params.principal, params.rate, params.tenor);
      return { ...params, grossInterest, wht, netInterest, maturityValue };
    }
    return apiPost<InterestCalcResult>('/v1/fixed-deposits/calculate', params);
  },

  getEarlyWithdrawal: async (id: string): Promise<EarlyWithdrawalInfo> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 350));
      const fd = MOCK_FDS.find((f) => f.id === id) || MOCK_FDS[0];
      const today = new Date();
      const start = new Date(fd.startDate);
      const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const accruedInterest = fd.principalAmount * (fd.interestRate / 100) * (daysElapsed / 365) * 0.9;
      const penaltyRate = 2.0;
      const penaltyAmount = fd.principalAmount * (penaltyRate / 100) * (daysElapsed / 365);
      const netProceeds = fd.principalAmount + accruedInterest - penaltyAmount;
      return {
        penaltyRate,
        penaltyAmount,
        accruedInterest,
        netProceeds,
        breakDate: today.toISOString().split('T')[0],
      };
    }
    return apiGet<EarlyWithdrawalInfo>(`/v1/fixed-deposits/${id}/early-withdrawal`);
  },

  liquidate: async (id: string, reason: string): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 600));
      return;
    }
    await apiPost<void>(`/v1/fixed-deposits/${id}/liquidate`, { reason });
  },

  updateMaturityInstruction: async (id: string, instruction: MaturityInstruction): Promise<FixedDeposit> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      const fd = MOCK_FDS.find((f) => f.id === id) || MOCK_FDS[0];
      return { ...fd, maturityInstruction: instruction.type, destinationAccountId: instruction.destinationAccountId };
    }
    return apiPatch<FixedDeposit>(`/v1/fixed-deposits/${id}/maturity-instruction`, instruction);
  },

  getStats: async (): Promise<FdStats> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      const active = MOCK_FDS.filter((fd) => fd.status === 'ACTIVE');
      const totalBalance = active.reduce((sum, fd) => sum + fd.principalAmount, 0);
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(today.getDate() + 30);
      const maturingSoon = active.filter((fd) => {
        const mat = new Date(fd.maturityDate);
        return mat >= today && mat <= in30Days;
      }).length;
      const averageRate = active.length > 0
        ? active.reduce((sum, fd) => sum + fd.interestRate, 0) / active.length
        : 0;
      return { totalBalance, activeFds: active.length, maturingSoon, averageRate };
    }
    return apiGet<FdStats>('/v1/fixed-deposits/stats');
  },
};
