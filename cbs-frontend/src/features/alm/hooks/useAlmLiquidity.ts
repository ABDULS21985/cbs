import { useQuery } from '@tanstack/react-query';
import { almApi, type AlmPositionRow } from '../api/almApi';
import { marketRiskApi } from '@/features/risk/api/marketRiskApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  positions: (date: string, currency: string) => ['alm', 'liquidity', 'positions', date, currency] as const,
  ratios: ['alm', 'liquidity', 'ratios'] as const,
  cashflowLadder: ['alm', 'liquidity', 'cashflow-ladder'] as const,
  hqla: ['alm', 'liquidity', 'hqla'] as const,
  topDepositors: ['alm', 'liquidity', 'top-depositors'] as const,
  fundingSources: ['alm', 'liquidity', 'funding-sources'] as const,
  stressProjection: ['alm', 'liquidity', 'stress-projection'] as const,
};

// ─── ALM Positions (for contractual/behavioral ladder) ────────────────────────

export function useAlmLiquidityPositions(date: string, currency: string) {
  return useQuery({
    queryKey: KEYS.positions(date, currency),
    queryFn: () => almApi.getAlmPositions(date, currency),
    enabled: !!(date && currency),
    staleTime: 5 * 60_000,
  });
}

// ─── Liquidity Ratios (LCR, NSFR, etc.) ──────────────────────────────────────

export function useLiquidityRatios() {
  return useQuery({
    queryKey: KEYS.ratios,
    queryFn: () => marketRiskApi.getLiquidityRatios(),
    staleTime: 60_000,
  });
}

// ─── Cashflow Ladder ──────────────────────────────────────────────────────────

export function useCashflowLadder() {
  return useQuery({
    queryKey: KEYS.cashflowLadder,
    queryFn: () => marketRiskApi.getCashflowLadder(),
    staleTime: 60_000,
  });
}

// ─── HQLA Composition ─────────────────────────────────────────────────────────

export function useHqlaComposition() {
  return useQuery({
    queryKey: KEYS.hqla,
    queryFn: () => marketRiskApi.getHqla(),
    staleTime: 60_000,
  });
}

// ─── Top Depositors ───────────────────────────────────────────────────────────

export function useTopDepositors() {
  return useQuery({
    queryKey: KEYS.topDepositors,
    queryFn: () => marketRiskApi.getTopDepositors(),
    staleTime: 60_000,
  });
}

// ─── Funding Sources ──────────────────────────────────────────────────────────

export function useFundingSources() {
  return useQuery({
    queryKey: KEYS.fundingSources,
    queryFn: () => marketRiskApi.getFundingSources(),
    staleTime: 60_000,
  });
}

// ─── Stress Projection (Survival Horizon) ─────────────────────────────────────

export function useLiquidityStressProjection() {
  return useQuery({
    queryKey: KEYS.stressProjection,
    queryFn: () => marketRiskApi.getLiquidityStress(),
    staleTime: 60_000,
  });
}

// ─── Behavioral Adjustment Helpers (applied client-side) ──────────────────────

export interface BehavioralParams {
  depositStickinessRate: number;    // 0-1: how much of demand deposits are "core"
  loanPrepaymentRate: number;       // 0-1: expected early repayment rate
  pipelineDrawdownRate: number;     // 0-1: committed but undrawn facilities
  rolloverRate: number;             // 0-1: term deposits expected to roll over
}

const DEFAULT_BEHAVIORAL_PARAMS: BehavioralParams = {
  depositStickinessRate: 0.70,
  loanPrepaymentRate: 0.05,
  pipelineDrawdownRate: 0.75,
  rolloverRate: 0.80,
};

export function applyBehavioralAdjustments(
  rows: AlmPositionRow[],
  params: BehavioralParams = DEFAULT_BEHAVIORAL_PARAMS,
): AlmPositionRow[] {
  let runningCumulativeGap = 0;

  return rows.map((row) => {
    // Behavioral adjustments:
    // 1. Demand deposits: treat a portion as "sticky" (effectively longer maturity)
    const adjustedDemandDeposits = row.demandDeposits * (1 - params.depositStickinessRate);

    // 2. Term deposits: assume rollover reduces outflows
    const adjustedTermDeposits = row.termDeposits * (1 - params.rolloverRate);

    // 3. Loans: prepayments increase inflows in nearer buckets
    const prepaymentInflow = row.loansAndAdvances * params.loanPrepaymentRate;

    // 4. Pipeline drawdowns: increase outflows for committed facilities
    const pipelineOutflow = row.otherAssets * params.pipelineDrawdownRate * 0.1;

    const adjustedTotalLiabilities =
      row.totalLiabilities - row.demandDeposits - row.termDeposits
      + adjustedDemandDeposits + adjustedTermDeposits + pipelineOutflow;

    const adjustedTotalAssets = row.totalAssets + prepaymentInflow;
    const adjustedGap = adjustedTotalAssets - adjustedTotalLiabilities;
    runningCumulativeGap += adjustedGap;

    return {
      ...row,
      demandDeposits: adjustedDemandDeposits,
      termDeposits: adjustedTermDeposits,
      totalLiabilities: adjustedTotalLiabilities,
      totalAssets: adjustedTotalAssets,
      gapAmount: adjustedGap,
      cumulativeGap: runningCumulativeGap,
      gapRatio: adjustedTotalLiabilities > 0 ? adjustedGap / adjustedTotalLiabilities : 0,
    };
  });
}

export { DEFAULT_BEHAVIORAL_PARAMS };
