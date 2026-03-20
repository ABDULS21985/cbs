import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '@/lib/formatters';
import { useDeliveryTrend, useDeliveryByChannel } from '../hooks/useCommunications';

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: '#3b82f6',
  SMS: '#22c55e',
  PUSH: '#f59e0b',
  IN_APP: '#8b5cf6',
  WEBHOOK: '#6b7280',
};

export function DeliveryDashboard() {
  const {
    data: trend = [],
    isLoading: trendLoading,
    isError: trendError,
  } = useDeliveryTrend();
  const {
    data: byChannel = [],
    isLoading: channelLoading,
    isError: channelError,
  } = useDeliveryByChannel();

  if (trendError || channelError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Delivery dashboard data could not be loaded from the backend.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: 30-day delivery trend */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">30-Day Delivery Trend</h3>
        {trendLoading ? (
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5, 10)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(l) => formatDate(l)} />
              <Area type="monotone" dataKey="delivered" stackId="1" fill="#22c55e" fillOpacity={0.6} stroke="#16a34a" name="Delivered" />
              <Area type="monotone" dataKey="failed" stackId="1" fill="#ef4444" fillOpacity={0.6} stroke="#dc2626" name="Failed" />
              <Area type="monotone" dataKey="pending" stackId="1" fill="#f59e0b" fillOpacity={0.6} stroke="#d97706" name="Pending" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 2: Channel breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Volume by Channel</h3>
          {channelLoading ? (
            <div className="h-48 rounded-lg bg-muted animate-pulse" />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={byChannel.map((c) => ({ name: c.channel, value: c.sent + c.delivered + c.failed }))}
                    dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {byChannel.map((c, i) => <Cell key={i} fill={CHANNEL_COLORS[c.channel] ?? '#6b7280'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {byChannel.map((c) => (
                  <div key={c.channel} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[c.channel] ?? '#6b7280' }} />
                    <span className="text-sm">{c.channel}: {c.sent + c.delivered + c.failed}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Delivery Rate by Channel</h3>
          {channelLoading ? (
            <div className="h-48 rounded-lg bg-muted animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byChannel}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="delivered" stackId="a" fill="#22c55e" name="Delivered" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
