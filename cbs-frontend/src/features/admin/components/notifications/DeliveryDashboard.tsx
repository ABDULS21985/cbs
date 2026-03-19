import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { DeliveryByChannelChart } from './DeliveryByChannelChart';
import type { DeliveryStats, DeliveryTrendEntry, DeliveryByChannelEntry } from '../../api/notificationAdminApi';

interface DeliveryDashboardProps {
  stats: DeliveryStats;
  trend: DeliveryTrendEntry[];
  byChannel: DeliveryByChannelEntry[];
}

function StatMini({ label, value, icon: Icon, colorClass }: { label: string; value: number; icon: React.ElementType; colorClass?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        <Icon className={cn('w-5 h-5 text-muted-foreground/50', colorClass)} />
      </div>
      <div className="stat-value">{value.toLocaleString()}</div>
    </div>
  );
}

export function DeliveryDashboard({ stats, trend, byChannel }: DeliveryDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatMini label="Total Sent" value={stats.total} icon={Send} />
        <StatMini label="Delivered" value={stats.delivered} icon={CheckCircle} colorClass="text-green-500" />
        <StatMini label="Failed" value={stats.failed} icon={XCircle} colorClass="text-red-500" />
        <StatMini label="Pending" value={stats.pending} icon={Clock} colorClass="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend chart */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">30-Day Delivery Trend</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => new Date(v).toLocaleDateString('en', { day: '2-digit', month: 'short' })} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={6} />
                <Area type="monotone" dataKey="delivered" name="Delivered" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="failed" name="Failed" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                <Area type="monotone" dataKey="pending" name="Pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">No trend data available.</div>
          )}
        </div>

        {/* By channel */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">Delivery by Channel</h3>
          <DeliveryByChannelChart data={byChannel} />
        </div>
      </div>
    </div>
  );
}
