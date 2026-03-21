import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { formatPercent } from '@/lib/formatters';
import type { FailureAnalysis } from '../../api/transactionAnalyticsApi';

const FAILURE_COLORS = ['#dc2626', '#f97316', '#f59e0b', '#7c3aed', '#64748b'];

interface FailureAnalysisPanelProps {
  data: FailureAnalysis | null;
  priorData?: FailureAnalysis | null;
  isLoading?: boolean;
}

function buildTrendRows(data: FailureAnalysis | null, priorData?: FailureAnalysis | null) {
  return (data?.trend ?? []).map((point, index) => ({
    ...point,
    priorFailureRate: priorData?.trend[index]?.failureRate ?? null,
  }));
}

export function FailureAnalysisPanel({
  data,
  priorData,
  isLoading = false,
}: FailureAnalysisPanelProps) {
  if (isLoading) {
    return <div className="h-[640px] animate-pulse rounded-xl border bg-card" />;
  }

  const trendRows = buildTrendRows(data, priorData);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Failure Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Failure trend, root-cause buckets, time hotspots, and repeat failing accounts.
        </p>
      </div>

      {data?.thresholdBreached && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            Failure rate is {formatPercent(data.failureRate)} and has breached the 5% control threshold.
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Failure Rate Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 'dataMax + 1']} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatPercent(value)} />
              <Legend />
              <Line type="monotone" dataKey="failureRate" name="Current Failure Rate" stroke="#dc2626" strokeWidth={2.5} dot={false} />
              {priorData && <Line type="monotone" dataKey="priorFailureRate" name="Prior Failure Rate" stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={2} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Failures by Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data?.reasons ?? []} dataKey="count" nameKey="reason" innerRadius={58} outerRadius={86}>
                {(data?.reasons ?? []).map((_, index) => <Cell key={index} fill={FAILURE_COLORS[index % FAILURE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Failure Hotspots</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.hotspots ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Top Failing Accounts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium text-right">Fails</th>
                  <th className="pb-2 font-medium">Last Reason</th>
                  <th className="pb-2 font-medium">Last Date</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topFailingAccounts ?? []).map((account) => (
                  <tr key={account.accountNumber} className="border-b last:border-b-0">
                    <td className="py-2">
                      <div className="font-medium text-foreground">{account.accountNumber}</div>
                      <div className="text-xs text-muted-foreground">{account.accountName}</div>
                    </td>
                    <td className="py-2 text-right">{account.failureCount.toLocaleString()}</td>
                    <td className="py-2">{account.lastFailureReason}</td>
                    <td className="py-2">{account.lastFailureDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
