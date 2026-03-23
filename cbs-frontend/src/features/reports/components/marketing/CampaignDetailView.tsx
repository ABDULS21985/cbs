import { X, BarChart2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { CampaignDetail } from '../../api/marketingAnalyticsApi';
import { CampaignFunnelChart } from './CampaignFunnelChart';

interface CampaignDetailViewProps {
  campaign: CampaignDetail | null;
  open: boolean;
  onClose: () => void;
}

export function CampaignDetailView({ campaign, open, onClose }: CampaignDetailViewProps) {
  if (!campaign) return null;

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
                <StatusBadge status={campaign.status} dot />
                <span className="text-xs font-mono text-muted-foreground">{campaign.code}</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                label="Delivered"
                value={campaign.deliveredCount}
                format="number"
              />
              <StatCard
                label="Opened"
                value={campaign.openedCount}
                format="number"
              />
              <StatCard
                label="Clicked"
                value={campaign.clickedCount}
                format="number"
              />
              <StatCard
                label="Converted"
                value={campaign.convertedCount}
                format="number"
              />
              <StatCard
                label="Revenue"
                value={formatMoney(campaign.revenueGenerated)}
              />
              <StatCard
                label="Conversion Rate"
                value={formatPercent(campaign.conversionRate, 1)}
              />
            </div>

            {campaign.funnelSteps.length > 0 && (
              <div className="surface-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Campaign Funnel</h3>
                <CampaignFunnelChart steps={campaign.funnelSteps} />
              </div>
            )}

            <div className="surface-card p-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                Live Delivery Snapshot
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Delivery Rate</div>
                  <div className="font-semibold">{formatPercent(campaign.deliveryRate, 1)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Open Rate</div>
                  <div className="font-semibold">{formatPercent(campaign.openRate, 1)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Click-Through Rate</div>
                  <div className="font-semibold">{formatPercent(campaign.clickThroughRate, 1)}</div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
