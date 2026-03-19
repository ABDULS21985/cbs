import { X, Calendar, Tag, Radio } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CampaignDetail } from '../../api/marketingAnalyticsApi';
import { CampaignFunnelChart } from './CampaignFunnelChart';
import { AbTestResultCard } from './AbTestResultCard';

interface CampaignDetailViewProps {
  campaign: CampaignDetail | null;
  open: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  ACQUISITION: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CROSS_SELL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RETENTION: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REACTIVATION: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BRAND_AWARENESS: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export function CampaignDetailView({ campaign, open, onClose }: CampaignDetailViewProps) {
  if (!campaign) return null;

  const reachPercent =
    campaign.targetCount > 0
      ? ((campaign.reachedCount / campaign.targetCount) * 100).toFixed(1)
      : '0';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-3xl bg-background z-50 shadow-xl flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b bg-muted/20 flex-shrink-0">
            <div className="space-y-1.5 min-w-0">
              <Dialog.Title className="text-lg font-semibold text-foreground truncate">
                {campaign.name}
              </Dialog.Title>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TYPE_COLORS[campaign.type] ?? 'bg-gray-100 text-gray-600')}>
                  <Tag className="w-3 h-3 mr-1" />
                  {campaign.type.replace(/_/g, ' ')}
                </span>
                <StatusBadge status={campaign.status} dot />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Radio className="w-3 h-3" />
                  {campaign.channel}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                </span>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Target Reached"
                value={`${reachPercent}%`}
              />
              <StatCard
                label="Conversions"
                value={campaign.conversions.toLocaleString()}
              />
              <StatCard
                label="Total Cost"
                value={formatMoney(campaign.cost)}
              />
              <StatCard
                label="ROI"
                value={campaign.roi > 0 ? `${campaign.roi.toFixed(2)}x` : '—'}
              />
            </div>

            {/* Funnel */}
            {campaign.funnelSteps.length > 0 && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Campaign Funnel</h3>
                <CampaignFunnelChart steps={campaign.funnelSteps} />
              </div>
            )}

            {/* A/B Test */}
            {campaign.abTestVariants && campaign.abTestVariants.length >= 2 && (
              <AbTestResultCard variants={campaign.abTestVariants} />
            )}

            {/* Daily Performance */}
            {campaign.dailyPerformance.length > 0 && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Daily Performance</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={campaign.dailyPerformance} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="conversions"
                      name="Conversions"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="clicks"
                      name="Clicks"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
