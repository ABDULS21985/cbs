/**
 * Mock data for Deposit Analytics — consumed by depositAnalyticsApi.ts
 */
import { format, addMonths, subMonths } from 'date-fns';
import type {
  DepositStats,
  DepositMixItem,
  DepositGrowthPoint,
  TopDepositor,
  MaturityBucket,
  RateBand,
  RateSensitivityPoint,
  CostOfFundsPoint,
  RetentionVintage,
  ChurnStat,
} from './depositAnalyticsApi';

function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function mockDepositStats(): DepositStats {
  return {
    total: 67_200_000_000,
    savings: 28_500_000_000,
    current: 22_100_000_000,
    term: 16_600_000_000,
    costOfFunds: 4.2,
    avgDeposit: 1_500_000,
    newDepositsMTD: 2_300_000_000,
    retentionRate: 87.4,
  };
}

export function mockDepositMix(): DepositMixItem[] {
  return [
    {
      name: 'CASA',
      amount: 50_600_000_000,
      pct: 75.3,
      color: '#3b82f6',
      children: [
        { name: 'Savings', amount: 28_500_000_000, pct: 42.4, color: '#3b82f6' },
        { name: 'Current', amount: 22_100_000_000, pct: 32.9, color: '#60a5fa' },
      ],
    },
    { name: 'Term Deposits', amount: 16_600_000_000, pct: 24.7, color: '#10b981' },
  ];
}

export function mockGrowthTrend(): DepositGrowthPoint[] {
  const base = subMonths(new Date(), 11);
  return Array.from({ length: 12 }, (_, i) => {
    const s = 24_000_000_000 + i * 375_000_000 + sr(i * 3) * 200_000_000;
    const c = 18_500_000_000 + i * 300_000_000 + sr(i * 3 + 1) * 150_000_000;
    const t = 13_000_000_000 + i * 300_000_000 + sr(i * 3 + 2) * 100_000_000;
    return {
      month: format(addMonths(base, i), 'MMM yy'),
      savings: Math.round(s),
      current: Math.round(c),
      term: Math.round(t),
      total: Math.round(s + c + t),
    };
  });
}

export function mockTopDepositors(): TopDepositor[] {
  const total = 67_200_000_000;
  const list: Array<Omit<TopDepositor, 'rank' | 'pct' | 'riskFlag'>> = [
    { name: 'Dangote Industries Ltd', segment: 'CORPORATE', amount: 4_800_000_000, type: 'Fixed Deposit' },
    { name: 'NNPCL Treasury', segment: 'GOVERNMENT', amount: 3_600_000_000, type: 'Current Account' },
    { name: 'MTN Nigeria Communications', segment: 'CORPORATE', amount: 2_900_000_000, type: 'Fixed Deposit' },
    { name: 'Federal Inland Revenue Service', segment: 'GOVERNMENT', amount: 2_200_000_000, type: 'Current Account' },
    { name: 'Zenith Pensions Custodian', segment: 'CORPORATE', amount: 1_800_000_000, type: 'Fixed Deposit' },
    { name: 'First Bank of Nigeria Plc', segment: 'CORPORATE', amount: 1_600_000_000, type: 'Call Deposit' },
    { name: 'Access Holdings Plc', segment: 'CORPORATE', amount: 1_400_000_000, type: 'Call Deposit' },
    { name: 'Lagos State Government', segment: 'GOVERNMENT', amount: 1_250_000_000, type: 'Current Account' },
    { name: 'Flour Mills of Nigeria', segment: 'CORPORATE', amount: 980_000_000, type: 'Fixed Deposit' },
    { name: 'Stanbic IBTC Asset Management', segment: 'CORPORATE', amount: 860_000_000, type: 'Fixed Deposit' },
    { name: 'UAC of Nigeria Plc', segment: 'SME', amount: 720_000_000, type: 'Savings' },
    { name: 'Nigerian Breweries Plc', segment: 'CORPORATE', amount: 680_000_000, type: 'Current Account' },
    { name: 'PZ Cussons Nigeria', segment: 'SME', amount: 540_000_000, type: 'Current Account' },
    { name: 'Coronation Merchant Bank', segment: 'CORPORATE', amount: 490_000_000, type: 'Call Deposit' },
    { name: 'Abuja Municipal Area Council', segment: 'GOVERNMENT', amount: 420_000_000, type: 'Current Account' },
    { name: 'Transcorp Hotels Plc', segment: 'SME', amount: 380_000_000, type: 'Fixed Deposit' },
    { name: 'Okomu Oil Palm Company', segment: 'SME', amount: 310_000_000, type: 'Savings' },
    { name: 'Julius Berger Nigeria Plc', segment: 'CORPORATE', amount: 285_000_000, type: 'Current Account' },
    { name: 'Nigerian Aviation Handling Co.', segment: 'SME', amount: 240_000_000, type: 'Current Account' },
    { name: 'Livestock Feeds Plc', segment: 'SME', amount: 195_000_000, type: 'Savings' },
  ];
  return list.map((d, i) => {
    const pct = parseFloat(((d.amount / total) * 100).toFixed(2));
    return { ...d, rank: i + 1, pct, riskFlag: pct >= 5 };
  });
}

export function mockMaturityProfile(): MaturityBucket[] {
  const base = addMonths(new Date(), 1);
  const amounts = [2_800_000_000, 1_900_000_000, 3_200_000_000, 2_400_000_000, 1_600_000_000, 2_100_000_000, 1_200_000_000, 900_000_000, 1_400_000_000, 800_000_000, 600_000_000, 700_000_000];
  const rates = [6.8, 7.1, 6.5, 7.4, 6.9, 7.2, 6.6, 7.0, 6.8, 7.3, 6.4, 6.7];
  const tenors = [90, 75, 120, 60, 180, 90, 270, 365, 120, 180, 90, 180];
  const rollovers = [72, 68, 75, 65, 80, 70, 62, 58, 74, 69, 66, 71];
  return Array.from({ length: 12 }, (_, i) => ({
    month: format(addMonths(base, i), 'MMM yyyy'),
    amount: amounts[i],
    count: Math.round(amounts[i] / 4_500_000),
    avgRate: rates[i],
    avgTenor: tenors[i],
    rolloverPct: rollovers[i],
  }));
}

export function mockRateBands(): RateBand[] {
  const bands = [
    { band: '0–2%', amount: 15_000_000_000, count: 28_400, color: '#3b82f6' },
    { band: '2–5%', amount: 28_000_000_000, count: 42_600, color: '#8b5cf6' },
    { band: '5–8%', amount: 18_000_000_000, count: 12_200, color: '#f59e0b' },
    { band: '8–12%', amount: 5_000_000_000, count: 3_800, color: '#f97316' },
    { band: '12%+', amount: 1_200_000_000, count: 620, color: '#ef4444' },
  ];
  const total = bands.reduce((s, b) => s + b.amount, 0);
  return bands.map((b) => ({ ...b, pct: parseFloat(((b.amount / total) * 100).toFixed(1)) }));
}

export function mockRateSensitivity(): RateSensitivityPoint[] {
  const segments = ['RETAIL', 'SME', 'CORPORATE', 'GOVERNMENT'];
  const bandRanges: [number, number][] = [[0, 2], [2, 5], [5, 8], [8, 12], [12, 16]];
  return Array.from({ length: 200 }, (_, i) => {
    const seg = segments[Math.floor(sr(i * 7) * 4)];
    const [lo, hi] = bandRanges[Math.floor(sr(i * 7 + 1) * 5)];
    const rate = lo + sr(i * 7 + 2) * (hi - lo);
    let amt: number;
    if (seg === 'CORPORATE' || seg === 'GOVERNMENT') amt = 50_000_000 + sr(i * 7 + 3) * 950_000_000;
    else if (seg === 'SME') amt = 5_000_000 + sr(i * 7 + 3) * 95_000_000;
    else amt = 200_000 + sr(i * 7 + 3) * 4_800_000;
    return { amount: Math.round(amt), rate: parseFloat(rate.toFixed(2)), segment: seg };
  });
}

export function mockCostOfFunds(): CostOfFundsPoint[] {
  const base = subMonths(new Date(), 11);
  return Array.from({ length: 12 }, (_, i) => {
    const p = i / 11;
    const overall = 4.8 - p * 0.6 + (sr(i * 5) - 0.5) * 0.08;
    return {
      month: format(addMonths(base, i), 'MMM yy'),
      savings: parseFloat((overall * 0.48 + sr(i * 5 + 1) * 0.05).toFixed(2)),
      current: parseFloat((overall * 0.22 + sr(i * 5 + 2) * 0.03).toFixed(2)),
      term: parseFloat((overall * 1.52 + sr(i * 5 + 3) * 0.12).toFixed(2)),
      overall: parseFloat(overall.toFixed(2)),
      mpr: 18.75,
    };
  });
}

export function mockRetentionVintage(): RetentionVintage[] {
  const vintages = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'];
  const months = ['M3', 'M6', 'M9', 'M12', 'M18', 'M24'];
  const baseRates: Record<string, (number | null)[]> = {
    'Q1 2025': [96, 91, 85, 80, 71, 62],
    'Q2 2025': [95, 89, 84, 78, 69, null],
    'Q3 2025': [97, 92, 86, 81, null, null],
    'Q4 2025': [94, 88, 83, null, null, null],
    'Q1 2026': [96, 90, null, null, null, null],
  };
  const result: RetentionVintage[] = [];
  for (const vintage of vintages) {
    for (let mi = 0; mi < months.length; mi++) {
      const rate = baseRates[vintage][mi];
      if (rate !== null && rate !== undefined) {
        result.push({ vintage, month: months[mi], retentionRate: rate });
      }
    }
  }
  return result;
}

export function mockChurnAnalysis(): ChurnStat {
  return {
    avgTenureMonths: 28,
    totalClosed: 1842,
    reasons: [
      { reason: 'Better rates elsewhere', count: 612, pct: 33.2 },
      { reason: 'Account inactivity', count: 428, pct: 23.2 },
      { reason: 'Customer relocation', count: 276, pct: 15.0 },
      { reason: 'Dissatisfaction with service', count: 221, pct: 12.0 },
      { reason: 'Maturity – not renewed', count: 184, pct: 10.0 },
      { reason: 'Other', count: 121, pct: 6.6 },
    ],
  };
}
