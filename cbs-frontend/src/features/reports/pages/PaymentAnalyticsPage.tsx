import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { usePaymentAnalytics } from '../hooks/usePaymentAnalytics';
import { PaymentStatsCards } from '../components/payments/PaymentStatsCards';
import { VolumeTrendChart } from '../components/payments/VolumeTrendChart';
import { ChannelBreakdownCharts } from '../components/payments/ChannelBreakdownCharts';
import { FailureAnalysisCharts } from '../components/payments/FailureAnalysisCharts';
import { RailsUtilizationTable } from '../components/payments/RailsUtilizationTable';
import { ReconciliationSummaryTable } from '../components/payments/ReconciliationSummaryTable';
import { PaymentFlowSankey, type SankeyFlow } from '../components/payments/PaymentFlowSankey';

// ─── Real-Time Transaction Feed (SSE) ─────────────────────────────────────────

interface LiveTransaction {
  reference: string;
  channel: string;
  type: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  timestamp: string;
  processingTimeMs: number;
}

function statusColor(status: string): string {
  if (status === 'SUCCESS') return 'text-green-600 dark:text-green-400';
  if (status === 'FAILED') return 'text-red-600 dark:text-red-400';
  return 'text-amber-600 dark:text-amber-400';
}

function statusBadge(status: string): string {
  if (status === 'SUCCESS') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'FAILED') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
}

function RealTimeMonitor() {
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const url = `${baseUrl}/api/v1/reports/payments/live-feed`;
    const es = new EventSource(url);

    es.addEventListener('transaction', (event) => {
      const txn: LiveTransaction = JSON.parse(event.data);
      setTransactions((prev) => [txn, ...prev].slice(0, 20));
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => es.close();
  }, []);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-foreground">Real-Time Transaction Monitor</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {connected ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Wifi className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <WifiOff className="w-3.5 h-3.5" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Live feed of the most recent transactions across all payment channels via SSE.
      </p>

      {transactions.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          {connected ? 'Waiting for transactions...' : 'No live transaction data available'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Real-time transaction feed">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Reference</th>
                <th className="text-left font-medium text-muted-foreground pb-2 px-2">Channel</th>
                <th className="text-left font-medium text-muted-foreground pb-2 px-2">Type</th>
                <th className="text-right font-medium text-muted-foreground pb-2 px-2">Amount</th>
                <th className="text-center font-medium text-muted-foreground pb-2 px-2">Status</th>
                <th className="text-right font-medium text-muted-foreground pb-2 px-2">Latency</th>
                <th className="text-right font-medium text-muted-foreground pb-2 pl-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transactions.map((txn) => (
                <tr key={txn.reference} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-3 font-mono text-foreground">{txn.reference}</td>
                  <td className="py-2 px-2 text-muted-foreground">{txn.channel}</td>
                  <td className="py-2 px-2 text-muted-foreground">{txn.type.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-medium text-foreground">
                    {formatMoney(txn.amount)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold', statusBadge(txn.status))}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                    {txn.processingTimeMs}ms
                  </td>
                  <td className={cn('py-2 pl-2 text-right tabular-nums', statusColor(txn.status))}>
                    {format(new Date(txn.timestamp), 'HH:mm:ss')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sankey flow builder ───────────────────────────────────────────────────────

function buildSankeyFlows(channels: any[], failureReasons: any[]): SankeyFlow[] {
  if (!channels || channels.length === 0) return [];

  const flows: SankeyFlow[] = [];

  // Column 0 → 1: Channel → Payment type (approximate from volume)
  const paymentTypes = ['NIP Transfer', 'Bill Payment', 'Card Payment', 'USSD'];
  for (const ch of channels) {
    paymentTypes.forEach((pt, i) => {
      const share = [0.45, 0.25, 0.20, 0.10][i] || 0.1;
      flows.push({ source: ch.channel, target: pt, value: Math.round(ch.value * share) });
    });
  }

  // Column 1 → 2: Payment type → Outcome
  const successRate = channels.length > 0
    ? channels.reduce((s, c) => s + c.successRate, 0) / channels.length
    : 90;
  for (const pt of paymentTypes) {
    const total = flows.filter((f) => f.target === pt).reduce((s, f) => s + f.value, 0);
    const successAmt = Math.round(total * (successRate / 100));
    const failedAmt = Math.round(total * 0.04);
    const pendingAmt = total - successAmt - failedAmt;
    if (successAmt > 0) flows.push({ source: pt, target: 'Successful', value: successAmt });
    if (failedAmt > 0) flows.push({ source: pt, target: 'Failed', value: failedAmt });
    if (pendingAmt > 0) flows.push({ source: pt, target: 'Pending', value: pendingAmt });
  }

  return flows;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PaymentAnalyticsPage() {
  useEffect(() => { document.title = 'Payment Analytics | CBS'; }, []);
  const {
    dateRange,
    setDateRange,
    groupBy,
    setGroupBy,
    stats,
    statsLoading,
    trend,
    trendLoading,
    channels,
    channelsLoading,
    failureReasons,
    topFailed,
    failuresLoading,
    rails,
    railsLoading,
    reconciliation,
    reconciliationLoading,
  } = usePaymentAnalytics();

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
    } else if (range.from) {
      setDateRange({ from: range.from, to: range.from });
    }
  };

  const sankeyFlows = buildSankeyFlows(channels, failureReasons);

  return (
    <>
      <PageHeader
        title="Payment Analytics"
        subtitle={`${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`}
        actions={
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to }}
            onChange={handleDateRangeChange}
          />
        }
      />

      <div className="page-container space-y-6">
        <PaymentStatsCards stats={stats} isLoading={statsLoading} />

        <VolumeTrendChart
          data={trend}
          groupBy={groupBy}
          onGroupByChange={(g) => setGroupBy(g as 'day' | 'week' | 'month')}
          isLoading={trendLoading}
        />

        {/* Payment Flow Sankey */}
        {!channelsLoading && sankeyFlows.length > 0 && (
          <PaymentFlowSankey data={sankeyFlows} />
        )}

        {/* Real-Time Transaction Monitor (SSE) */}
        <RealTimeMonitor />

        <ChannelBreakdownCharts data={channels} isLoading={channelsLoading} />

        <FailureAnalysisCharts
          reasons={failureReasons}
          topFailed={topFailed}
          isLoading={failuresLoading}
        />

        <RailsUtilizationTable data={rails} isLoading={railsLoading} />

        <ReconciliationSummaryTable data={reconciliation} isLoading={reconciliationLoading} />
      </div>
    </>
  );
}
