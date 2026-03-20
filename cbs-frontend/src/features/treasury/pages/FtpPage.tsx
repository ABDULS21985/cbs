import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Plus, Play, Loader2, TrendingUp, DollarSign, BarChart3, Percent } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useFtpProfitability, useAddFtpRatePoint, useFtpAllocate,
} from '../hooks/useTreasuryExt';
import { ftpApi } from '../api/ftpApi';
import type { FtpAllocation } from '../types/ftp';
import { useQuery } from '@tanstack/react-query';

export function FtpPage() {
  useEffect(() => { document.title = 'Funds Transfer Pricing | CBS'; }, []);
  const [entityType, setEntityType] = useState('BRANCH');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [tenor, setTenor] = useState('1M');
  const [rate, setRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: profitability = [], isLoading: profLoading } = useFtpProfitability(entityType);
  const { data: curve = [], isLoading: curveLoading } = useQuery({
    queryKey: ['ftp', 'curve'],
    queryFn: () => ftpApi.getCurve('NGN'),
    staleTime: 60_000,
  });
  const addRatePoint = useAddFtpRatePoint();
  const allocate = useFtpAllocate();

  const profList = Array.isArray(profitability) ? profitability as FtpAllocation[] : [];

  // Stats from profitability data
  const totalAssets = profList.reduce((s, a) => s + (a.averageBalance > 0 ? a.averageBalance : 0), 0);
  const totalFtpCharge = profList.reduce((s, a) => s + (a.ftpCharge ?? 0), 0);
  const totalNetMargin = profList.reduce((s, a) => s + (a.netMargin ?? 0), 0);
  const avgFtpRate = profList.length > 0 ? profList.reduce((s, a) => s + (a.ftpRate ?? 0), 0) / profList.length : 0;

  // Chart data
  const chartData = profList.map(a => ({
    name: a.entityRef || `Entity ${a.entityId}`,
    grossIncome: a.interestIncomeExpense ?? 0,
    ftpCharge: a.ftpCharge ?? 0,
    netMargin: a.netMargin ?? 0,
  }));

  const curveData = curve.map((point) => ({
    tenor: point.tenor ?? `${point.days ?? point.tenorDays}D`,
    days: point.days ?? point.tenorDays,
    rate: point.rate,
  }));

  return (
    <>
      <PageHeader title="Funds Transfer Pricing" subtitle="Internal pricing framework, allocation, and profitability analysis"
        actions={
          <button onClick={() => allocate.mutate({ entityType, period }, { onSuccess: () => toast.success(`FTP allocation run completed for ${entityType}`) })}
            disabled={allocate.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {allocate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run Allocation
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Allocated" value={totalAssets} format="money" compact icon={DollarSign} loading={profLoading} />
          <StatCard label="Total FTP Charge" value={totalFtpCharge} format="money" compact icon={BarChart3} loading={profLoading} />
          <StatCard label="Net Margin" value={totalNetMargin} format="money" compact icon={TrendingUp} loading={profLoading} />
          <StatCard label="Avg FTP Rate" value={`${avgFtpRate.toFixed(2)}%`} icon={Percent} loading={profLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          // ── FTP Rate Curve ──────────────────────────────────────────
          { id: 'curve', label: 'Rate Curve', content: (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">FTP Rate Curve (NGN)</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={tenor} onChange={(event) => setTenor(event.target.value)} className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
                    {['O/N', '1W', '1M', '3M', '6M', '1Y', '2Y', '5Y'].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <input value={rate} onChange={(event) => setRate(event.target.value)} type="number" min="0" step="0.0001" placeholder="Rate %" className="w-28 rounded-lg border bg-background px-2.5 py-1.5 text-xs" />
                  <input value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} type="date" className="rounded-lg border bg-background px-2.5 py-1.5 text-xs" />
                  <button
                    onClick={() => addRatePoint.mutate({ tenor, rate: Number(rate), effectiveDate, currency: 'NGN' }, {
                      onSuccess: () => {
                        toast.success('Rate point added');
                        setRate('');
                      },
                    })}
                    disabled={addRatePoint.isPending || !rate}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Rate Point
                  </button>
                </div>
              </div>
              {curveLoading ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Loading FTP curve…</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={curveData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="tenor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Line type="monotone" dataKey="rate" name="FTP Rate" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )},

          // ── FTP Allocations ─────────────────────────────────────────
          { id: 'allocations', label: 'Allocations', content: (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
                <select value={entityType} onChange={e => setEntityType(e.target.value)}
                  className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {['BRANCH', 'PRODUCT', 'CUSTOMER', 'ACCOUNT'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={period} onChange={(event) => setPeriod(event.target.value)} type="month" className="rounded-md border bg-background px-3 py-1.5 text-sm" />
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 border-b">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Entity</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Avg Balance</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actual Rate</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">FTP Rate</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">FTP Charge</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net Margin</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {profList.map(a => (
                      <tr key={a.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{a.entityRef || `#${a.entityId}`}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{a.entityType}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(a.averageBalance)}</td>
                        <td className="px-4 py-3 text-right font-mono">{(a.actualRate ?? 0).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right font-mono">{(a.ftpRate ?? 0).toFixed(2)}%</td>
                        <td className={cn('px-4 py-3 text-right font-mono font-semibold', (a.ftpCharge ?? 0) >= 0 ? 'text-red-600' : 'text-green-600')}>
                          {formatMoney(a.ftpCharge ?? 0)}
                        </td>
                        <td className={cn('px-4 py-3 text-right font-mono font-semibold', (a.netMargin ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatMoney(a.netMargin ?? 0)}
                        </td>
                      </tr>
                    ))}
                    {profList.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No FTP allocations. Run allocation to generate.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )},

          // ── Profitability Analysis ──────────────────────────────────
          { id: 'profitability', label: 'Profitability', content: (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
                <select value={entityType} onChange={e => setEntityType(e.target.value)}
                  className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {['BRANCH', 'PRODUCT', 'CUSTOMER', 'ACCOUNT'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="grossIncome" name="Gross Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ftpCharge" name="FTP Charge" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netMargin" name="Net Margin" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">No profitability data available. Run FTP allocation first.</div>
              )}
            </div>
          )},
        ]} />
      </div>
    </>
  );
}
