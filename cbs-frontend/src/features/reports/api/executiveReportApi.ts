// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutiveKpi {
  label: string;
  value: number;
  formatted: string; // "₦89.5B"
  yoyChange: number; // percentage
  budget: number;
  budgetPct: number; // actual/budget * 100
  sparkline: number[]; // 12 monthly values (relative, for trend direction)
  favorable: boolean; // is positive change good?
}

export interface PnlSummary {
  interestIncome: number;
  interestExpense: number;
  netInterestIncome: number;
  feeCommission: number;
  tradingIncome: number;
  otherIncome: number;
  totalRevenue: number;
  opex: number;
  provisions: number;
  pbt: number;
  tax: number;
  netProfit: number;
  nim: number; // Net Interest Margin %
  costToIncome: number; // %
  roe: number; // Return on Equity %
}

export interface MonthlyPnl {
  month: string;
  interestIncome: number;
  feeIncome: number;
  tradingIncome: number;
  opex: number;
  netProfit: number;
}

export interface KeyRatio {
  label: string;
  value: number;
  formatted: string;
  target: number;
  targetLabel: string;
  targetType: 'MIN' | 'MAX' | 'RANGE';
  met: boolean;
  peerAvg?: number;
  barFill: number; // 0-100 for bar width
}

export interface CustomerGrowthData {
  month: string;
  newCustomers: number;
  closedCustomers: number;
  netGrowth: number;
  totalCustomers: number;
}

export interface BranchPerformance {
  rank: number;
  branch: string;
  deposits: number;
  loans: number;
  revenue: number;
  customers: number;
  efficiencyRatio: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export function getExecutiveKpis(): ExecutiveKpi[] {
  return [
    {
      label: 'Total Assets',
      value: 89_500_000_000,
      formatted: '₦89.5B',
      yoyChange: 8.2,
      budget: 85_000_000_000,
      budgetPct: 105.3,
      sparkline: [72, 74, 75, 76, 78, 79, 81, 82, 83, 86, 88, 89.5],
      favorable: true,
    },
    {
      label: 'Total Deposits',
      value: 67_200_000_000,
      formatted: '₦67.2B',
      yoyChange: 12.5,
      budget: 65_000_000_000,
      budgetPct: 103.4,
      sparkline: [52, 54, 56, 57, 59, 60, 62, 63, 64, 65, 66, 67.2],
      favorable: true,
    },
    {
      label: 'Total Loans',
      value: 45_600_000_000,
      formatted: '₦45.6B',
      yoyChange: 6.8,
      budget: 48_000_000_000,
      budgetPct: 95.0,
      sparkline: [38, 39, 40, 41, 41.5, 42, 43, 43.5, 44, 44.5, 45, 45.6],
      favorable: true,
    },
    {
      label: 'Net Interest Income (YTD)',
      value: 4_560_000_000,
      formatted: '₦4.56B',
      yoyChange: 9.4,
      budget: 4_800_000_000,
      budgetPct: 95.0,
      sparkline: [340, 360, 370, 375, 380, 385, 390, 395, 400, 405, 420, 456],
      favorable: true,
    },
    {
      label: 'Cost-to-Income Ratio',
      value: 62.5,
      formatted: '62.5%',
      yoyChange: 2.1,
      budget: 60.0,
      budgetPct: 104.2,
      sparkline: [59.8, 60.2, 61.0, 61.5, 61.8, 62.0, 62.1, 62.3, 62.4, 62.4, 62.5, 62.5],
      favorable: false,
    },
    {
      label: 'Return on Equity',
      value: 18.3,
      formatted: '18.3%',
      yoyChange: 1.8,
      budget: 17.0,
      budgetPct: 107.6,
      sparkline: [15.2, 15.8, 16.0, 16.4, 16.7, 17.0, 17.2, 17.5, 17.8, 18.0, 18.2, 18.3],
      favorable: true,
    },
  ];
}

export function getPnlSummary(): PnlSummary {
  return {
    interestIncome: 7_840_000_000,
    interestExpense: 3_280_000_000,
    netInterestIncome: 4_560_000_000,
    feeCommission: 1_240_000_000,
    tradingIncome: 420_000_000,
    otherIncome: 180_000_000,
    totalRevenue: 6_400_000_000,
    opex: 4_000_000_000,
    provisions: 680_000_000,
    pbt: 1_720_000_000,
    tax: 516_000_000,
    netProfit: 1_204_000_000,
    nim: 5.85,
    costToIncome: 62.5,
    roe: 18.3,
  };
}

export function getMonthlyPnl(): MonthlyPnl[] {
  const data: MonthlyPnl[] = [
    { month: 'Apr', interestIncome: 610, feeIncome: 92, tradingIncome: 28, opex: 305, netProfit: 88 },
    { month: 'May', interestIncome: 625, feeIncome: 95, tradingIncome: 31, opex: 312, netProfit: 94 },
    { month: 'Jun', interestIncome: 638, feeIncome: 98, tradingIncome: 35, opex: 319, netProfit: 99 },
    { month: 'Jul', interestIncome: 650, feeIncome: 100, tradingIncome: 38, opex: 324, netProfit: 104 },
    { month: 'Aug', interestIncome: 655, feeIncome: 102, tradingIncome: 33, opex: 328, netProfit: 101 },
    { month: 'Sep', interestIncome: 662, feeIncome: 105, tradingIncome: 36, opex: 331, netProfit: 106 },
    { month: 'Oct', interestIncome: 671, feeIncome: 108, tradingIncome: 40, opex: 336, netProfit: 110 },
    { month: 'Nov', interestIncome: 680, feeIncome: 110, tradingIncome: 38, opex: 340, netProfit: 108 },
    { month: 'Dec', interestIncome: 690, feeIncome: 120, tradingIncome: 45, opex: 348, netProfit: 115 },
    { month: 'Jan', interestIncome: 648, feeIncome: 98, tradingIncome: 31, opex: 325, netProfit: 96 },
    { month: 'Feb', interestIncome: 655, feeIncome: 104, tradingIncome: 34, opex: 329, netProfit: 100 },
    { month: 'Mar', interestIncome: 656, feeIncome: 108, tradingIncome: 31, opex: 303, netProfit: 83 },
  ];
  return data;
}

export function getKeyRatios(): KeyRatio[] {
  return [
    {
      label: 'Capital Adequacy Ratio',
      value: 16.2,
      formatted: '16.2%',
      target: 10.0,
      targetLabel: 'min 10%',
      targetType: 'MIN',
      met: true,
      peerAvg: 14.8,
      barFill: 72,
    },
    {
      label: 'Liquidity Ratio',
      value: 38.4,
      formatted: '38.4%',
      target: 30.0,
      targetLabel: 'min 30%',
      targetType: 'MIN',
      met: true,
      peerAvg: 34.2,
      barFill: 65,
    },
    {
      label: 'Loan-to-Deposit Ratio',
      value: 67.9,
      formatted: '67.9%',
      target: 80.0,
      targetLabel: 'max 80%',
      targetType: 'MAX',
      met: true,
      peerAvg: 72.5,
      barFill: 68,
    },
    {
      label: 'Non-Performing Loans',
      value: 4.2,
      formatted: '4.2%',
      target: 5.0,
      targetLabel: 'max 5%',
      targetType: 'MAX',
      met: true,
      peerAvg: 5.8,
      barFill: 42,
    },
    {
      label: 'Cost-to-Income Ratio',
      value: 62.5,
      formatted: '62.5%',
      target: 60.0,
      targetLabel: 'max 60%',
      targetType: 'MAX',
      met: false,
      peerAvg: 64.1,
      barFill: 63,
    },
    {
      label: 'Return on Assets',
      value: 1.85,
      formatted: '1.85%',
      target: 1.5,
      targetLabel: 'min 1.5%',
      targetType: 'MIN',
      met: true,
      peerAvg: 1.62,
      barFill: 62,
    },
    {
      label: 'Return on Equity',
      value: 18.3,
      formatted: '18.3%',
      target: 15.0,
      targetLabel: 'min 15%',
      targetType: 'MIN',
      met: true,
      peerAvg: 16.7,
      barFill: 73,
    },
    {
      label: 'Net Interest Margin',
      value: 5.85,
      formatted: '5.85%',
      target: 5.0,
      targetLabel: 'min 5%',
      targetType: 'MIN',
      met: true,
      peerAvg: 5.42,
      barFill: 70,
    },
  ];
}

export function getCustomerGrowthData(): CustomerGrowthData[] {
  const base = 285_000;
  const months = MONTHS_SHORT;
  const newCusts = [3200, 3450, 3680, 3820, 3590, 3720, 4010, 4250, 4680, 3940, 4120, 4380];
  const closedCusts = [480, 510, 495, 520, 505, 490, 530, 515, 545, 500, 510, 525];

  let running = base;
  return months.map((month, i) => {
    const net = newCusts[i] - closedCusts[i];
    running += net;
    return {
      month,
      newCustomers: newCusts[i],
      closedCustomers: closedCusts[i],
      netGrowth: net,
      totalCustomers: running,
    };
  });
}

export interface DepositLoanPoint {
  month: string;
  deposits: number;
  loans: number;
}

export function getDepositLoanGrowthData(): DepositLoanPoint[] {
  const depositBase = [
    52.1, 53.4, 54.8, 55.9, 57.2, 58.6, 60.0, 61.4, 62.8, 64.3, 65.8, 67.2,
  ];
  const loanBase = [
    38.2, 38.9, 39.6, 40.3, 41.0, 41.8, 42.5, 43.2, 43.8, 44.3, 44.9, 45.6,
  ];
  return MONTHS_SHORT.map((month, i) => ({
    month,
    deposits: depositBase[i],
    loans: loanBase[i],
  }));
}

export function getTopBranches(): BranchPerformance[] {
  return [
    { rank: 1, branch: 'Victoria Island, Lagos', deposits: 8_420_000_000, loans: 5_680_000_000, revenue: 640_000_000, customers: 28_400, efficiencyRatio: 52.4 },
    { rank: 2, branch: 'Wuse II, Abuja', deposits: 7_150_000_000, loans: 4_920_000_000, revenue: 580_000_000, customers: 24_200, efficiencyRatio: 54.8 },
    { rank: 3, branch: 'Ikeja, Lagos', deposits: 6_380_000_000, loans: 4_450_000_000, revenue: 510_000_000, customers: 22_100, efficiencyRatio: 56.2 },
    { rank: 4, branch: 'Port Harcourt Main', deposits: 5_840_000_000, loans: 3_980_000_000, revenue: 468_000_000, customers: 20_600, efficiencyRatio: 58.1 },
    { rank: 5, branch: 'Kano Central', deposits: 5_210_000_000, loans: 3_620_000_000, revenue: 425_000_000, customers: 19_300, efficiencyRatio: 59.4 },
    { rank: 6, branch: 'Ibadan Ring Road', deposits: 4_780_000_000, loans: 3_200_000_000, revenue: 392_000_000, customers: 17_800, efficiencyRatio: 61.3 },
    { rank: 7, branch: 'Maiduguri Main', deposits: 4_320_000_000, loans: 2_860_000_000, revenue: 348_000_000, customers: 16_200, efficiencyRatio: 63.5 },
    { rank: 8, branch: 'Enugu Independence Layout', deposits: 3_940_000_000, loans: 2_580_000_000, revenue: 316_000_000, customers: 14_900, efficiencyRatio: 65.2 },
    { rank: 9, branch: 'Kaduna Commercial Road', deposits: 3_620_000_000, loans: 2_340_000_000, revenue: 288_000_000, customers: 13_600, efficiencyRatio: 67.8 },
    { rank: 10, branch: 'Benin City New GRA', deposits: 3_280_000_000, loans: 2_100_000_000, revenue: 262_000_000, customers: 12_400, efficiencyRatio: 71.4 },
  ];
}
