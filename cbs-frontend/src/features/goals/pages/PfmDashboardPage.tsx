import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Heart, TrendingUp, Wallet, PiggyBank, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Lightbulb,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePfmLatest, usePfmHistory, useGeneratePfmSnapshot } from '../hooks/usePfm';
import type { PfmSnapshot } from '../types/pfm';

const DEFAULT_CUSTOMER_ID = 1;
const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

// ── Health Score Gauge ──────────────────────────────────────────────────────

function HealthScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444';
  const label = pct >= 80 ? 'EXCELLENT' : pct >= 60 ? 'GOOD' : pct >= 40 ? 'FAIR' : 'NEEDS WORK';
  const circumference = 2 * Math.PI * 60;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="60" fill="none" stroke="currentColor" className="text-muted" strokeWidth="12" />
        <circle cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`} transform="rotate(-90 80 80)" className="transition-all duration-1000" />
        <text x="80" y="70" textAnchor="middle" className="fill-foreground text-3xl font-bold" fontSize="32">{score}</text>
        <text x="80" y="95" textAnchor="middle" className="fill-muted-foreground" fontSize="11">{label}</text>
      </svg>
    </div>
  );
}

// ── Spending Breakdown ──────────────────────────────────────────────────────

function SpendingBreakdown({ expenses }: { expenses: Record<string, unknown> }) {
  const data = useMemo(() => {
    return Object.entries(expenses).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value: typeof value === 'number' ? value : 0,
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatMoney(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-sm flex-1">{d.name}</span>
              <span className="text-sm font-mono">{formatMoney(d.value)}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function PfmDashboardPage() {
  useEffect(() => { document.title = 'Financial Health | CBS'; }, []);
  const [customerId, setCustomerId] = useState(DEFAULT_CUSTOMER_ID);

  const { data: latestData, isLoading: latestLoading } = usePfmLatest(customerId);
  const { data: historyData = [], isLoading: historyLoading } = usePfmHistory(customerId);
  const generateSnapshot = useGeneratePfmSnapshot();

  // Latest snapshot — may be array or single object
  const latest: PfmSnapshot | null = useMemo(() => {
    if (!latestData) return null;
    if (Array.isArray(latestData)) return latestData[0] ?? null;
    return latestData as PfmSnapshot;
  }, [latestData]);

  // History sorted by date
  const history = useMemo(() => {
    const arr = Array.isArray(historyData) ? historyData : [];
    return [...arr].sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
  }, [historyData]);

  // Health factors
  const healthFactors = useMemo(() => {
    if (!latest?.healthFactors) return [];
    return Object.entries(latest.healthFactors).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      status: typeof value === 'boolean' ? (value ? 'PASS' : 'FAIL') : typeof value === 'string' ? value : 'UNKNOWN',
    }));
  }, [latest]);

  // Insights
  const insights = useMemo(() => {
    if (!latest?.insights) return [];
    if (Array.isArray(latest.insights)) return latest.insights as unknown as string[];
    return Object.values(latest.insights).filter(v => typeof v === 'string') as string[];
  }, [latest]);

  const handleGenerate = () => {
    generateSnapshot.mutate(customerId, {
      onSuccess: () => toast.success('Snapshot generated'),
      onError: () => toast.error('Failed to generate snapshot'),
    });
  };

  return (
    <>
      <PageHeader title="Financial Health" subtitle="Personal Finance Manager"
        actions={
          <div className="flex items-center gap-3">
            <input type="number" value={customerId} onChange={e => setCustomerId(Number(e.target.value))} placeholder="Customer ID"
              className="w-32 px-3 py-1.5 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button onClick={handleGenerate} disabled={generateSnapshot.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {generateSnapshot.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Generate Snapshot
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Health Score */}
        {latest && (
          <div className="bg-card rounded-lg border p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <HealthScoreGauge score={latest.financialHealthScore ?? 0} />
              <div className="flex-1 space-y-3">
                <h3 className="text-sm font-semibold">Health Factors</h3>
                <div className="flex flex-wrap gap-2">
                  {healthFactors.map(f => (
                    <span key={f.name} className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                      f.status === 'PASS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      f.status === 'FAIL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')}>
                      {f.status === 'PASS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Income" value={latest?.totalIncome ?? 0} format="money" compact icon={TrendingUp} loading={latestLoading} />
          <StatCard label="Total Expenses" value={latest?.totalExpenses ?? 0} format="money" compact icon={Wallet} loading={latestLoading} />
          <StatCard label="Savings Rate" value={latest ? `${Number(latest.savingsRate ?? 0).toFixed(0)}%` : '—'} icon={PiggyBank} loading={latestLoading} />
          <StatCard label="Net Worth" value={latest?.netWorth ?? 0} format="money" compact icon={Heart} loading={latestLoading} />
        </div>

        {/* Income vs Expenses Chart */}
        {history.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Income vs Expenses Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={history.slice(-6)} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="snapshotDate" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
                  tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short' })} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
                  tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="totalIncome" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalExpenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spending Breakdown */}
        {latest?.expenseBreakdown && Object.keys(latest.expenseBreakdown).length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Spending Breakdown</h3>
            <SpendingBreakdown expenses={latest.expenseBreakdown} />
          </div>
        )}

        {/* Net Worth Trend */}
        {history.length > 1 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Net Worth Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={history} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="snapshotDate" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
                  tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short', year: '2-digit' })} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
                  tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="totalAssets" name="Assets" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalLiabilities" name="Liabilities" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Financial Insights</h3>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="text-sm">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Snapshot History */}
        {history.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-3">Snapshot History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Health Score</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Savings Rate</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net Worth</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Income</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...history].reverse().map(s => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs">{formatDate(s.snapshotDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('font-semibold', (s.financialHealthScore ?? 0) >= 70 ? 'text-green-600' : (s.financialHealthScore ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600')}>
                          {s.financialHealthScore ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{Number(s.savingsRate ?? 0).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(s.netWorth ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">{formatMoney(s.totalIncome ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatMoney(s.totalExpenses ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!latest && !latestLoading && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No financial snapshot available for this customer.</p>
            <button onClick={handleGenerate} disabled={generateSnapshot.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              Generate First Snapshot
            </button>
          </div>
        )}
      </div>
    </>
  );
}
