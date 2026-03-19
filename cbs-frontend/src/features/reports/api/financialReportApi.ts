// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialLineItem {
  code: string;
  label: string;
  indent: number; // 0=section header, 1=main line, 2=sub-line
  isBold?: boolean; // for totals
  isSeparator?: boolean; // horizontal line before this item
  isHeader?: boolean; // section header (no values)
  current: number;
  prior: number;
  priorYear?: number;
  budget?: number;
  glAccountIds?: string[]; // for drill-down
}

export interface BalanceSheetData {
  entityName: string;
  reportDate: string;
  priorDate: string;
  currency: string;
  assets: FinancialLineItem[];
  liabilities: FinancialLineItem[];
  equity: FinancialLineItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface IncomeStatementData {
  entityName: string;
  periodLabel: string;
  priorPeriodLabel: string;
  currency: string;
  items: FinancialLineItem[];
  netProfit: number;
}

export interface CashFlowData {
  entityName: string;
  periodLabel: string;
  operating: FinancialLineItem[];
  investing: FinancialLineItem[];
  financing: FinancialLineItem[];
  netCashflow: number;
  openingCash: number;
  closingCash: number;
}

export interface CapitalAdequacyData {
  tier1Capital: number;
  tier2Capital: number;
  totalCapital: number;
  rwa: number;
  car: number; // percentage
  minimumCar: number;
  capitalBuffer: number;
  creditRiskRwa: number;
  marketRiskRwa: number;
  operationalRiskRwa: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function delay(ms = 450) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 250));
}

function hdr(code: string, label: string): FinancialLineItem {
  return { code, label, indent: 0, isHeader: true, isBold: true, current: 0, prior: 0 };
}

function line(
  code: string,
  label: string,
  current: number,
  prior: number,
  indent = 1,
  glAccountIds?: string[],
): FinancialLineItem {
  return { code, label, indent, current, prior, glAccountIds };
}

function sub(
  code: string,
  label: string,
  current: number,
  prior: number,
  glAccountIds?: string[],
): FinancialLineItem {
  return { code, label, indent: 2, current, prior, glAccountIds };
}

function total(code: string, label: string, current: number, prior: number, sep = true): FinancialLineItem {
  return { code, label, indent: 1, isBold: true, isSeparator: sep, current, prior };
}

// ─── Mock Balance Sheet ───────────────────────────────────────────────────────

function mockBalanceSheet(_date?: string, _comparison?: string): BalanceSheetData {
  // Assets
  const assets: FinancialLineItem[] = [
    hdr('A_CASH_HDR', 'CASH AND BALANCES WITH CENTRAL BANK'),
    sub('A_CASH_CBN', 'Cash with CBN', 8_200_000_000, 7_650_000_000, ['10001', '10002']),
    sub('A_CASH_HAND', 'Cash in hand — branches', 4_100_000_000, 3_980_000_000, ['10003']),
    total('A_CASH_TOT', 'Total Cash & CBN Balances', 12_300_000_000, 11_630_000_000),

    hdr('A_BANK_HDR', 'DUE FROM OTHER BANKS'),
    sub('A_BANK_LOCAL', 'Nostro — local banks', 3_200_000_000, 3_050_000_000, ['11001']),
    sub('A_BANK_FOREX', 'Nostro — foreign banks', 2_500_000_000, 2_380_000_000, ['11002']),
    total('A_BANK_TOT', 'Total Due from Banks', 5_700_000_000, 5_430_000_000),

    hdr('A_LOAN_HDR', 'LOANS AND ADVANCES TO CUSTOMERS'),
    sub('A_LOAN_GROSS', 'Gross loans & advances', 47_800_000_000, 45_200_000_000, ['20001', '20002', '20003']),
    sub('A_LOAN_PROV', 'Less: Provision for credit losses', -3_400_000_000, -3_100_000_000, ['20009']),
    total('A_LOAN_TOT', 'Net Loans & Advances', 44_400_000_000, 42_100_000_000),

    hdr('A_INV_HDR', 'INVESTMENT SECURITIES'),
    sub('A_INV_FVTPL', 'FVTPL — Trading bonds', 4_200_000_000, 3_900_000_000, ['30001']),
    sub('A_INV_FVOCI', 'FVOCI — Available-for-sale', 8_700_000_000, 8_100_000_000, ['30002']),
    sub('A_INV_AC', 'Amortised cost — Hold to maturity', 6_000_000_000, 5_800_000_000, ['30003']),
    total('A_INV_TOT', 'Total Investment Securities', 18_900_000_000, 17_800_000_000),

    hdr('A_PPE_HDR', 'PROPERTY, PLANT & EQUIPMENT'),
    sub('A_PPE_LAND', 'Land & buildings', 1_400_000_000, 1_420_000_000, ['40001']),
    sub('A_PPE_EQUIP', 'Equipment & fixtures', 600_000_000, 580_000_000, ['40002']),
    sub('A_PPE_ROU', 'Right-of-use assets', 300_000_000, 290_000_000, ['40003']),
    total('A_PPE_TOT', 'Total PPE (Net of Depreciation)', 2_300_000_000, 2_290_000_000),

    hdr('A_OTH_HDR', 'OTHER ASSETS'),
    sub('A_OTH_PREP', 'Prepayments & sundry debtors', 620_000_000, 590_000_000, ['50001']),
    sub('A_OTH_TAX', 'Deferred tax asset', 380_000_000, 360_000_000, ['50002']),
    sub('A_OTH_INTG', 'Intangible assets', 200_000_000, 210_000_000, ['50003']),
    total('A_OTH_TOT', 'Total Other Assets', 1_200_000_000, 1_160_000_000),
  ];

  // Liabilities
  const liabilities: FinancialLineItem[] = [
    hdr('L_DEP_HDR', 'CUSTOMER DEPOSITS'),
    sub('L_DEP_DEM', 'Demand deposits', 28_400_000_000, 26_800_000_000, ['60001']),
    sub('L_DEP_SAV', 'Savings deposits', 21_300_000_000, 20_100_000_000, ['60002']),
    sub('L_DEP_TIM', 'Term / fixed deposits', 17_500_000_000, 16_400_000_000, ['60003']),
    total('L_DEP_TOT', 'Total Customer Deposits', 67_200_000_000, 63_300_000_000),

    hdr('L_BANK_HDR', 'DUE TO BANKS & BORROWINGS'),
    sub('L_BANK_INTER', 'Interbank borrowings', 1_800_000_000, 1_650_000_000, ['70001']),
    sub('L_BANK_CBN', 'CBN facilities', 1_200_000_000, 1_100_000_000, ['70002']),
    sub('L_BANK_SENR', 'Senior unsecured notes', 500_000_000, 500_000_000, ['70003']),
    total('L_BANK_TOT', 'Total Due to Banks & Borrowings', 3_500_000_000, 3_250_000_000),

    hdr('L_OTH_HDR', 'OTHER LIABILITIES'),
    sub('L_OTH_ACC', 'Accounts payable & accruals', 980_000_000, 920_000_000, ['80001']),
    sub('L_OTH_TAX', 'Income tax payable', 820_000_000, 760_000_000, ['80002']),
    sub('L_OTH_LEAS', 'Lease liabilities', 500_000_000, 480_000_000, ['80003']),
    total('L_OTH_TOT', 'Total Other Liabilities', 2_300_000_000, 2_160_000_000),
  ];

  // Equity
  const equity: FinancialLineItem[] = [
    hdr('E_HDR', "SHAREHOLDERS' EQUITY"),
    sub('E_CAP', 'Share capital', 5_000_000_000, 5_000_000_000, ['90001']),
    sub('E_PREM', 'Share premium', 1_500_000_000, 1_500_000_000, ['90002']),
    sub('E_STAT', 'Statutory reserve', 2_200_000_000, 1_900_000_000, ['90003']),
    sub('E_RET', 'Retained earnings', 4_200_000_000, 3_680_000_000, ['90004']),
    total('E_TOT', "Total Shareholders' Equity", 12_900_000_000, 12_080_000_000),
  ];

  return {
    entityName: 'First Consolidated Bank Plc',
    reportDate: '2025-12-31',
    priorDate: '2024-12-31',
    currency: 'NGN',
    assets,
    liabilities,
    equity,
    totalAssets: 84_800_000_000,
    totalLiabilities: 73_000_000_000,
    totalEquity: 12_900_000_000,
  };
}

// ─── Mock Income Statement ────────────────────────────────────────────────────

function mockIncomeStatement(_period?: string, _comparison?: string): IncomeStatementData {
  const items: FinancialLineItem[] = [
    hdr('I_INT_HDR', 'INTEREST INCOME'),
    line('I_INT_LOAN', 'Interest on loans & advances', 8_420_000_000, 7_680_000_000, 2, ['IS1001']),
    line('I_INT_INV', 'Interest on investment securities', 2_100_000_000, 1_950_000_000, 2, ['IS1002']),
    line('I_INT_BANK', 'Interest from banks (placements)', 640_000_000, 580_000_000, 2, ['IS1003']),
    total('I_INT_TOT', 'Total Interest Income', 11_160_000_000, 10_210_000_000),

    hdr('I_INTEXP_HDR', 'INTEREST EXPENSE'),
    line('I_INTEXP_DEP', 'Interest on customer deposits', -3_840_000_000, -3_620_000_000, 2, ['IS2001']),
    line('I_INTEXP_BANK', 'Interest on borrowings', -480_000_000, -440_000_000, 2, ['IS2002']),
    total('I_INTEXP_TOT', 'Total Interest Expense', -4_320_000_000, -4_060_000_000),

    total('I_NII', 'NET INTEREST INCOME', 6_840_000_000, 6_150_000_000, true),

    hdr('I_NONFUND_HDR', 'NON-INTEREST INCOME'),
    line('I_FEE_COMM', 'Fee & commission income', 1_240_000_000, 1_120_000_000, 2, ['IS3001']),
    line('I_FX', 'Foreign exchange income', 880_000_000, 740_000_000, 2, ['IS3002']),
    line('I_TRAD', 'Trading gains/(losses)', 320_000_000, 280_000_000, 2, ['IS3003']),
    line('I_OTHER_INC', 'Other operating income', 190_000_000, 170_000_000, 2, ['IS3004']),
    total('I_NONFUND_TOT', 'Total Non-Interest Income', 2_630_000_000, 2_310_000_000),

    total('I_OPI', 'TOTAL OPERATING INCOME', 9_470_000_000, 8_460_000_000, true),

    hdr('I_OPEX_HDR', 'OPERATING EXPENSES'),
    line('I_STAFF', 'Staff costs', -2_840_000_000, -2_640_000_000, 2, ['IS4001']),
    line('I_DEP', 'Depreciation & amortisation', -480_000_000, -450_000_000, 2, ['IS4002']),
    line('I_IT', 'Technology & infrastructure', -620_000_000, -570_000_000, 2, ['IS4003']),
    line('I_PREM', 'Premises & occupancy', -340_000_000, -320_000_000, 2, ['IS4004']),
    line('I_MKTG', 'Marketing & business development', -190_000_000, -180_000_000, 2, ['IS4005']),
    line('I_OTH_EXP', 'Other operating expenses', -380_000_000, -360_000_000, 2, ['IS4006']),
    total('I_OPEX_TOT', 'Total Operating Expenses', -4_850_000_000, -4_520_000_000),

    total('I_PPOP', 'PRE-PROVISION OPERATING PROFIT', 4_620_000_000, 3_940_000_000, true),

    hdr('I_PROV_HDR', 'CREDIT IMPAIRMENT CHARGES'),
    line('I_ECL', 'Expected credit loss (ECL) charge', -1_020_000_000, -920_000_000, 2, ['IS5001']),
    line('I_WO', 'Write-offs (net of recoveries)', -120_000_000, -110_000_000, 2, ['IS5002']),
    total('I_PROV_TOT', 'Total Credit Impairment', -1_140_000_000, -1_030_000_000),

    total('I_PBT', 'PROFIT BEFORE TAX', 3_480_000_000, 2_910_000_000, true),

    hdr('I_TAX_HDR', 'INCOME TAX'),
    line('I_CIT', 'Companies income tax', -870_000_000, -720_000_000, 2, ['IS6001']),
    line('I_EDTL', 'Education tax levy', -104_400_000, -87_300_000, 2, ['IS6002']),
    total('I_TAX_TOT', 'Total Tax', -974_400_000, -807_300_000),

    total('I_PAT', 'PROFIT AFTER TAX', 2_505_600_000, 2_102_700_000, true),
  ];

  return {
    entityName: 'First Consolidated Bank Plc',
    periodLabel: 'Year ended 31 December 2025',
    priorPeriodLabel: 'Year ended 31 December 2024',
    currency: 'NGN',
    items,
    netProfit: 2_505_600_000,
  };
}

// ─── Mock Cash Flow ───────────────────────────────────────────────────────────

function mockCashFlow(_period?: string): CashFlowData {
  const operating: FinancialLineItem[] = [
    hdr('CF_OP_HDR', 'CASH FLOWS FROM OPERATING ACTIVITIES'),
    line('CF_OP_PBT', 'Profit before tax', 3_480_000_000, 2_910_000_000, 2),
    line('CF_OP_DEP', 'Add: Depreciation & amortisation', 480_000_000, 450_000_000, 2),
    line('CF_OP_ECL', 'Add: ECL charge', 1_020_000_000, 920_000_000, 2),
    line('CF_OP_LOANS', 'Increase in net loans', -2_300_000_000, -3_100_000_000, 2),
    line('CF_OP_DEP_CHG', 'Increase in customer deposits', 3_900_000_000, 4_200_000_000, 2),
    line('CF_OP_OTH', 'Changes in other operating items', -420_000_000, -380_000_000, 2),
    line('CF_OP_TAX_PD', 'Tax paid', -800_000_000, -690_000_000, 2),
    total('CF_OP_TOT', 'Net Cash from Operating Activities', 5_360_000_000, 4_310_000_000),
  ];

  const investing: FinancialLineItem[] = [
    hdr('CF_INV_HDR', 'CASH FLOWS FROM INVESTING ACTIVITIES'),
    line('CF_INV_SEC_PUR', 'Purchase of investment securities', -3_200_000_000, -2_800_000_000, 2),
    line('CF_INV_SEC_PRO', 'Proceeds from sale/maturity of securities', 2_100_000_000, 1_900_000_000, 2),
    line('CF_INV_PPE_PUR', 'Purchase of property, plant & equipment', -490_000_000, -420_000_000, 2),
    line('CF_INV_PPE_PRO', 'Proceeds from disposal of PPE', 30_000_000, 25_000_000, 2),
    line('CF_INV_PLAC', 'Net change in bank placements', -270_000_000, -190_000_000, 2),
    total('CF_INV_TOT', 'Net Cash used in Investing Activities', -1_830_000_000, -1_485_000_000),
  ];

  const financing: FinancialLineItem[] = [
    hdr('CF_FIN_HDR', 'CASH FLOWS FROM FINANCING ACTIVITIES'),
    line('CF_FIN_BORROW', 'Net proceeds from borrowings', 250_000_000, 500_000_000, 2),
    line('CF_FIN_REPAY', 'Repayment of lease liabilities', -120_000_000, -110_000_000, 2),
    line('CF_FIN_DIV', 'Dividends paid to equity holders', -800_000_000, -600_000_000, 2),
    total('CF_FIN_TOT', 'Net Cash used in Financing Activities', -670_000_000, -210_000_000),
  ];

  return {
    entityName: 'First Consolidated Bank Plc',
    periodLabel: 'Year ended 31 December 2025',
    operating,
    investing,
    financing,
    netCashflow: 2_860_000_000,
    openingCash: 9_440_000_000,
    closingCash: 12_300_000_000,
  };
}

// ─── Mock Capital Adequacy ────────────────────────────────────────────────────

function mockCapitalAdequacy(_date?: string): CapitalAdequacyData {
  const tier1Capital = 12_200_000_000;
  const tier2Capital = 1_800_000_000;
  const totalCapital = tier1Capital + tier2Capital;
  const rwa = 98_000_000_000;
  const car = parseFloat(((totalCapital / rwa) * 100).toFixed(2));
  const minimumCar = 10.0;

  return {
    tier1Capital,
    tier2Capital,
    totalCapital,
    rwa,
    car,
    minimumCar,
    capitalBuffer: totalCapital - (rwa * minimumCar) / 100,
    creditRiskRwa: 72_000_000_000,
    marketRiskRwa: 14_000_000_000,
    operationalRiskRwa: 12_000_000_000,
  };
}

// ─── Exported API ─────────────────────────────────────────────────────────────

export async function getBalanceSheet(date?: string, comparison?: string): Promise<BalanceSheetData> {
  await delay();
  return mockBalanceSheet(date, comparison);
}

export async function getIncomeStatement(period?: string, comparison?: string): Promise<IncomeStatementData> {
  await delay();
  return mockIncomeStatement(period, comparison);
}

export async function getCashFlow(period?: string): Promise<CashFlowData> {
  await delay();
  return mockCashFlow(period);
}

export async function getCapitalAdequacy(date?: string): Promise<CapitalAdequacyData> {
  await delay();
  return mockCapitalAdequacy(date);
}
