import { Send, CheckCircle, XCircle, ArrowDownLeft, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeliveryByChannelChart } from './DeliveryByChannelChart';
import type { DeliveryStats, NotificationChannel } from '../../api/notificationAdminApi';

interface DeliveryDashboardProps {
  stats: DeliveryStats[];
}

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PUSH: 'Push',
  IN_APP: 'In-App',
};

function getTodayStats(stats: DeliveryStats[]) {
  const today = new Date().toISOString().split('T')[0];
  return stats.filter((s) => s.date === today);
}

function sumField(stats: DeliveryStats[], field: keyof DeliveryStats): number {
  return stats.reduce((acc, s) => acc + (Number(s[field]) || 0), 0);
}

interface MiniStatProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
  subValue?: string;
}

function MiniStat({ label, value, icon: Icon, iconClass, subValue }: MiniStatProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('p-1.5 rounded-md', iconClass)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
    </div>
  );
}

export function DeliveryDashboard({ stats }: DeliveryDashboardProps) {
  const todayStats = getTodayStats(stats);
  const totalSent = sumField(todayStats, 'sent');
  const totalDelivered = sumField(todayStats, 'delivered');
  const totalFailed = sumField(todayStats, 'failed');
  const totalBounced = sumField(todayStats, 'bounced');
  const totalCost = sumField(todayStats, 'cost');
  const overallRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';

  // Per-channel aggregation over all loaded stats (for table)
  const channelAgg: Record<string, { sent: number; delivered: number; failed: number }> = {};
  CHANNELS.forEach((ch) => { channelAgg[ch] = { sent: 0, delivered: 0, failed: 0 }; });
  stats.forEach((s) => {
    if (channelAgg[s.channel]) {
      channelAgg[s.channel].sent += s.sent;
      channelAgg[s.channel].delivered += s.delivered;
      channelAgg[s.channel].failed += s.failed;
    }
  });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniStat
          label="Sent Today"
          value={totalSent.toLocaleString()}
          icon={Send}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          subValue="All channels"
        />
        <MiniStat
          label="Delivered"
          value={totalDelivered.toLocaleString()}
          icon={CheckCircle}
          iconClass="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          subValue={`${overallRate}% rate`}
        />
        <MiniStat
          label="Failed"
          value={totalFailed.toLocaleString()}
          icon={XCircle}
          iconClass="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          subValue={`${totalSent > 0 ? ((totalFailed / totalSent) * 100).toFixed(1) : 0}% of sent`}
        />
        <MiniStat
          label="Bounced"
          value={totalBounced.toLocaleString()}
          icon={ArrowDownLeft}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          subValue="Email / SMS"
        />
        <MiniStat
          label="Cost Today"
          value={`₦${totalCost.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          iconClass="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          subValue="SMS cost only"
        />
      </div>

      {/* Grouped bar chart */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="font-semibold text-sm mb-4">Delivery by Channel (Last 30 Days – Aggregated)</h3>
        <DeliveryByChannelChart stats={stats} />
      </div>

      {/* Per-channel breakdown table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">Per-Channel Breakdown (Last 30 Days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Sent</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Delivered</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Failed</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Delivery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CHANNELS.map((ch) => {
                const agg = channelAgg[ch];
                const rate = agg.sent > 0 ? ((agg.delivered / agg.sent) * 100).toFixed(1) : '0';
                const rateNum = parseFloat(rate);
                return (
                  <tr key={ch} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{CHANNEL_LABELS[ch]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{agg.sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-400">
                      {agg.delivered.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                      {agg.failed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              rateNum >= 95 ? 'bg-green-500' : rateNum >= 85 ? 'bg-amber-500' : 'bg-red-500',
                            )}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className={cn(
                          'font-medium tabular-nums text-xs',
                          rateNum >= 95 ? 'text-green-600 dark:text-green-400' : rateNum >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
                        )}>
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
