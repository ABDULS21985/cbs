import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { VarStatsCards } from '../components/marketrisk/VarStatsCards';
import { VarTrendChart } from '../components/marketrisk/VarTrendChart';
import { VarByRiskFactor } from '../components/marketrisk/VarByRiskFactor';
import { StressTestResultsTable } from '../components/marketrisk/StressTestResultsTable';
import { SensitivityTable } from '../components/marketrisk/SensitivityTable';
import { LiquidityRatioGauges } from '../components/liquidityrisk/LiquidityRatioGauges';
import { CashflowLadderChart } from '../components/liquidityrisk/CashflowLadderChart';
import { HqlaCompositionDonut } from '../components/liquidityrisk/HqlaCompositionDonut';
import { SurvivalHorizonChart } from '../components/liquidityrisk/SurvivalHorizonChart';
import { marketRiskApi } from '../api/marketRiskApi';

export function MarketLiquidityRiskPage() {
  const [tab, setTab] = useState<'market' | 'liquidity'>('market');

  const { data: varStats } = useQuery({ queryKey: ['risk', 'var-stats'], queryFn: () => marketRiskApi.getVarStats() });
  const { data: varTrend = [] } = useQuery({ queryKey: ['risk', 'var-trend'], queryFn: () => marketRiskApi.getVarTrend() });
  const { data: varByFactor = [] } = useQuery({ queryKey: ['risk', 'var-by-factor'], queryFn: () => marketRiskApi.getVarByRiskFactor() });
  const { data: stressTests = [] } = useQuery({ queryKey: ['risk', 'stress-tests'], queryFn: () => marketRiskApi.getStressTests() });
  const { data: sensitivities = [] } = useQuery({ queryKey: ['risk', 'sensitivities'], queryFn: () => marketRiskApi.getSensitivities() });
  const { data: backtest } = useQuery({ queryKey: ['risk', 'backtest'], queryFn: () => marketRiskApi.getBacktestResult() });

  const { data: liqRatios } = useQuery({ queryKey: ['risk', 'liq-ratios'], queryFn: () => marketRiskApi.getLiquidityRatios() });
  const { data: cashflow = [] } = useQuery({ queryKey: ['risk', 'cashflow'], queryFn: () => marketRiskApi.getCashflowLadder() });
  const { data: hqla = [] } = useQuery({ queryKey: ['risk', 'hqla'], queryFn: () => marketRiskApi.getHqla() });
  const { data: stressProjection = [] } = useQuery({ queryKey: ['risk', 'liq-stress'], queryFn: () => marketRiskApi.getLiquidityStress() });

  const currency = varStats?.currency || 'NGN';

  return (
    <>
      <PageHeader title="Market & Liquidity Risk" subtitle="VaR monitoring, stress testing, liquidity ratios" />
      <div className="page-container space-y-6">
        <div className="flex gap-1 border-b">
          {[{ key: 'market' as const, label: 'Market Risk' }, { key: 'liquidity' as const, label: 'Liquidity Risk' }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'market' && (
          <div className="space-y-6">
            {varStats && <VarStatsCards stats={varStats} />}
            <VarTrendChart data={varTrend} varLimit={varStats?.varLimit || 0} backtest={backtest || null} currency={currency} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VarByRiskFactor data={varByFactor} currency={currency} />
              <SensitivityTable data={sensitivities} currency={currency} />
            </div>
            <StressTestResultsTable data={stressTests} />
          </div>
        )}

        {tab === 'liquidity' && (
          <div className="space-y-6">
            {liqRatios && <LiquidityRatioGauges ratios={liqRatios} />}
            <CashflowLadderChart data={cashflow} currency={currency} />
            <HqlaCompositionDonut data={hqla} currency={currency} />
            <SurvivalHorizonChart data={stressProjection} currency={currency} />
          </div>
        )}
      </div>
    </>
  );
}
