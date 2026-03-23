import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';
import type { ChannelAnalytics } from '../../api/transactionAnalyticsApi';

const CHANNEL_COLORS: Record<string, string> = {
  MOBILE: '#2563eb',
  WEB: '#0f766e',
  ATM: '#7c3aed',
  POS: '#f59e0b',
  BRANCH: '#dc2626',
  USSD: '#ea580c',
  AGENT: '#0891b2',
  SYSTEM: '#475569',
  API: '#1d4ed8',
  PORTAL: '#4f46e5',
};

interface ChannelPerformanceGridProps {
  data: ChannelAnalytics | null;
  priorData?: ChannelAnalytics | null;
  isLoading?: boolean;
}

function buildMonthlyTrend(data: ChannelAnalytics | null, priorData?: ChannelAnalytics | null) {
  const map = new Map<string, Record<string, string | number>>();
  for (const point of data?.successRateTrend ?? []) {
    const row = map.get(point.period) ?? { period: point.period };
    row[point.channel] = point.successRate;
    map.set(point.period, row);
  }
  const priorUssd = (priorData?.successRateTrend ?? []).filter((point) => point.channel === 'USSD');
  return Array.from(map.values()).map((row, index) => ({
    ...row,
    priorUSSD: priorUssd[index]?.successRate ?? null,
  }));
}

export function ChannelPerformanceGrid({
  data,
  priorData,
  isLoading = false,
}: ChannelPerformanceGridProps) {
  if (isLoading) {
    return <div className="h-[620px] animate-pulse surface-card" />;
  }

  const channels = data?.channels ?? [];
  const trendRows = buildMonthlyTrend(data, priorData ?? null);

  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Channel Performance Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Volume, value, success rate, and average value by payment channel.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Volume by Channel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={channels}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                {channels.map((channel) => <Cell key={channel.channel} fill={CHANNEL_COLORS[channel.channel] ?? '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Value by Channel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={channels} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatMoneyCompact(Number(value))} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 12 }} width={60} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {channels.map((channel) => <Cell key={channel.channel} fill={CHANNEL_COLORS[channel.channel] ?? '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Success Rate Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatPercent(value)} />
              <Legend />
              {(data?.channels ?? []).map((channel) => (
                <Line
                  key={channel.channel}
                  type="monotone"
                  dataKey={channel.channel}
                  stroke={CHANNEL_COLORS[channel.channel] ?? '#64748b'}
                  strokeWidth={channel.channel === 'USSD' ? 3 : 2}
                  dot={false}
                  name={channel.channel}
                />
              ))}
              {priorData && (
                <Line type="monotone" dataKey="priorUSSD" stroke="#fb923c" strokeDasharray="4 4" strokeWidth={2} dot={false} name="USSD Prior" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Average Value by Channel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={channels}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => formatMoneyCompact(Number(value))} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Bar dataKey="averageValue" radius={[6, 6, 0, 0]}>
                {channels.map((channel) => <Cell key={channel.channel} fill={CHANNEL_COLORS[channel.channel] ?? '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {channels.map((channel) => (
          <div key={channel.channel} className="rounded-lg border p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[channel.channel] ?? '#64748b' }} />
              <span className="text-sm font-medium text-foreground">{channel.channel}</span>
            </div>
            <p className="text-sm text-muted-foreground">Volume {channel.volume.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Value {formatMoneyCompact(channel.value)}</p>
            <p className="text-sm text-muted-foreground">Success {formatPercent(channel.successRate)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
