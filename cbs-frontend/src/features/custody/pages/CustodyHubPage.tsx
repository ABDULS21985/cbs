import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import {
  Landmark, ArrowRightLeft, FileWarning, BarChart3, Users, Wallet, RefreshCw,
} from 'lucide-react';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useSettlementDashboard,
  useAllCustodyAccounts,
  useFailedSettlements,
  useSubmitSettlement,
} from '../hooks/useCustody';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  MATCHED: '#3b82f6',
  SUBMITTED: '#8b5cf6',
  SETTLED: '#22c55e',
  FAILED: '#ef4444',
};

const NAV_CARDS = [
  { label: 'Settlement Instructions', desc: 'Create, match, submit settlements', path: '/custody/settlements', icon: ArrowRightLeft },
  { label: 'Custody Accounts', desc: 'Manage custody accounts and holdings', path: '/custody/settlements?tab=accounts', icon: Wallet },
  { label: 'Settlement Batches', desc: 'Batch processing for settlements', path: '/custody/settlements?tab=batches', icon: BarChart3 },
  { label: 'Failed Settlements', desc: 'Review and retry failed instructions', path: '/custody/settlements?tab=dashboard', icon: FileWarning },
];

export function CustodyHubPage() {
  useEffect(() => { document.title = 'Custody & Settlement | CBS'; }, []);
  const navigate = useNavigate();

  const { data: dashboard } = useSettlementDashboard();
  const { data: accounts = [] } = useAllCustodyAccounts();
  const { data: failed = [] } = useFailedSettlements();
  const submitSettlement = useSubmitSettlement();

  const totalAum = accounts.reduce((s, a) =>
    s + (a.holdings?.reduce((hs, h) => hs + (h.marketValue ?? 0), 0) ?? 0), 0);

  const statusData = dashboard ? [
    { name: 'Pending', value: dashboard.pending, color: STATUS_COLORS.PENDING },
    { name: 'Settled', value: dashboard.settled, color: STATUS_COLORS.SETTLED },
    { name: 'Failed', value: dashboard.failed, color: STATUS_COLORS.FAILED },
  ].filter((d) => d.value > 0) : [];

  const handleRetry = (ref: string) => {
    submitSettlement.mutate(ref, {
      onSuccess: () => toast.success(`Resubmitted ${ref}`),
      onError: () => toast.error('Failed to resubmit'),
    });
  };

  return (
    <>
      <PageHeader title="Custody & Settlement" subtitle="Securities custody accounts, settlement instructions, and position management" />

      <div className="page-container space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Custody Accounts" value={accounts.length} format="number" icon={Landmark} />
          <StatCard label="Settlements Today" value={dashboard?.totalToday ?? 0} format="number" icon={ArrowRightLeft} />
          <StatCard label="Settlement Rate" value={dashboard?.settledPercent != null ? `${dashboard.settledPercent.toFixed(1)}%` : '--'} icon={BarChart3} />
          <StatCard label="Failed" value={dashboard?.failed ?? 0} format="number" icon={FileWarning} />
          <StatCard label="Value Pending" value={formatMoney(dashboard?.totalValuePending ?? 0, 'USD')} icon={Wallet} />
          <StatCard label="AUM" value={formatMoney(totalAum, 'USD')} icon={Landmark} />
        </div>

        {/* Nav cards + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {NAV_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button key={card.label} onClick={() => navigate(card.path)}
                  className="rounded-xl border bg-card p-5 text-left hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{card.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Status donut */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Settlement Status</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={2}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No settlements today</p>
            )}
          </div>
        </div>

        {/* Recent failed */}
        {failed.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recent Failed Settlements</h3>
              <span className="text-xs text-red-600 font-medium">{failed.length} failed</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">From</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Instrument</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Settle Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Reason</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {failed.slice(0, 10).map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-xs">{f.ref}</td>
                      <td className="px-4 py-2.5 text-xs">{f.fromAccount}</td>
                      <td className="px-4 py-2.5 text-xs">{f.toAccount}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMoney(f.amount, f.currency)}</td>
                      <td className="px-4 py-2.5 text-xs">{f.instrumentCode}</td>
                      <td className="px-4 py-2.5 text-xs">{formatDate(f.settlementDate)}</td>
                      <td className="px-4 py-2.5 text-xs text-red-600 max-w-[150px] truncate">{f.failureReason ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleRetry(f.ref)} disabled={submitSettlement.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 ml-auto">
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
