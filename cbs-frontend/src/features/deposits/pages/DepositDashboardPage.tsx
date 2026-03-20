import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Landmark, TrendingUp, Clock, BarChart3, Percent, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { fixedDepositApi, type FixedDeposit, type RateTable } from '../api/fixedDepositApi';
import { MaturityLadderChart } from '../components/MaturityLadderChart';
import { TenorBreakdownChart } from '../components/TenorBreakdownChart';
import { RateDistributionChart } from '../components/RateDistributionChart';
import { ConcentrationRiskPanel } from '../components/ConcentrationRiskPanel';
import { MaturingSoonTable } from '../components/MaturingSoonTable';

const INSTRUCTION_COLORS: Record<string, string> = {
  ROLLOVER_ALL: '#10b981',
  ROLLOVER_PRINCIPAL: '#3b82f6',
  LIQUIDATE: '#f59e0b',
  MANUAL: '#ef4444',
};

export function DepositDashboardPage() {
  useEffect(() => { document.title = 'FD Portfolio Dashboard | CBS'; }, []);

  const { data: allDeposits = [], isLoading } = useQuery({
    queryKey: ['deposits', 'fixed', 'all'],
    queryFn: () => fixedDepositApi.getFixedDeposits({}),
    staleTime: 30_000,
  });

  const { data: rateTable = [] } = useQuery({
    queryKey: ['deposits', 'fixed', 'rates'],
    queryFn: () => fixedDepositApi.getRateTables(),
    staleTime: 60_000,
  });

  const deposits = Array.isArray(allDeposits) ? allDeposits : [];
  const rates = Array.isArray(rateTable) ? rateTable : [];

  // Computed metrics
  const active = useMemo(() => deposits.filter(d => d.status === 'ACTIVE'), [deposits]);
  const totalPortfolio = useMemo(() => active.reduce((s, d) => s + d.principalAmount, 0), [active]);
  const activeCount = active.length;

  const weightedAvgRate = useMemo(() => {
    if (totalPortfolio === 0) return 0;
    return active.reduce((s, d) => s + d.principalAmount * d.interestRate, 0) / totalPortfolio;
  }, [active, totalPortfolio]);

  const maturingIn30 = useMemo(() => {
    const cutoff = Date.now() + 30 * 86400000;
    return active.filter(d => new Date(d.maturityDate).getTime() <= cutoff);
  }, [active]);

  const totalInterestAccrued = useMemo(() => active.reduce((s, d) => s + (d.grossInterest ?? 0), 0), [active]);

  const rolloverRate = useMemo(() => {
    const matured = deposits.filter(d => d.status === 'MATURED' || d.status === 'ROLLED_OVER' || d.status === 'LIQUIDATED');
    if (matured.length === 0) return 0;
    const rolledOver = deposits.filter(d => d.status === 'ROLLED_OVER').length;
    return (rolledOver / matured.length) * 100;
  }, [deposits]);

  // Maturity instruction distribution
  const instructionData = useMemo(() => {
    const map: Record<string, number> = {};
    active.forEach(d => { map[d.maturityInstruction] = (map[d.maturityInstruction] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value, color: INSTRUCTION_COLORS[name] || '#6b7280' }));
  }, [active]);

  return (
    <>
      <PageHeader title="Fixed Deposit Portfolio" subtitle="Executive dashboard — portfolio analytics, maturity ladder, concentration risk" />

      <div className="page-container space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Portfolio" value={totalPortfolio} format="money" compact icon={Landmark} loading={isLoading} />
          <StatCard label="Active FDs" value={activeCount} format="number" icon={BarChart3} loading={isLoading} />
          <StatCard label="Weighted Avg Rate" value={`${weightedAvgRate.toFixed(2)}%`} icon={Percent} loading={isLoading} />
          <StatCard label="Maturing (30d)" value={maturingIn30.length} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Interest Accrued" value={totalInterestAccrued} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Rollover Rate" value={`${rolloverRate.toFixed(0)}%`} icon={RefreshCw} loading={isLoading} />
        </div>

        {/* Charts Row 1: Maturity Ladder + Tenor Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Maturity Ladder</h3>
            {isLoading ? <div className="h-64 bg-muted/30 animate-pulse rounded-lg" /> : <MaturityLadderChart deposits={deposits} />}
          </div>
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Tenor Distribution</h3>
            {isLoading ? <div className="h-64 bg-muted/30 animate-pulse rounded-lg" /> : <TenorBreakdownChart deposits={deposits} />}
          </div>
        </div>

        {/* Charts Row 2: Rate Distribution + Concentration Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Rate Distribution</h3>
            {isLoading ? <div className="h-64 bg-muted/30 animate-pulse rounded-lg" /> : <RateDistributionChart deposits={deposits} rateTable={rates} />}
          </div>
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Concentration Risk — Top 10 Customers</h3>
            {isLoading ? <div className="h-64 bg-muted/30 animate-pulse rounded-lg" /> : <ConcentrationRiskPanel deposits={deposits} />}
          </div>
        </div>

        {/* Maturity Instruction Distribution */}
        {instructionData.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Maturity Instruction Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={instructionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {instructionData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {instructionData.map(d => {
                  const total = instructionData.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm flex-1">{d.name}</span>
                      <span className="text-sm font-mono font-semibold">{d.value}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Maturing Soon Table */}
        <div className="bg-card rounded-lg border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">Maturing in Next 30 Days</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {maturingIn30.length}
            </span>
          </div>
          <div className="p-4">
            {isLoading ? <div className="h-48 bg-muted/30 animate-pulse rounded-lg" /> : <MaturingSoonTable deposits={maturingIn30} />}
          </div>
        </div>
      </div>
    </>
  );
}
