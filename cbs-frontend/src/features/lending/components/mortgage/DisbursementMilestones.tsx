import { CheckCircle, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney } from '@/lib/formatters';
import type { DisbursementMilestone } from '../../types/mortgage';

interface DisbursementMilestonesProps {
  milestones?: DisbursementMilestone[];
  currency?: string;
}

const STATUS_CONFIG = {
  DISBURSED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Disbursed' },
  APPROVED: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Approved' },
  PENDING: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted/40 border-border', label: 'Pending' },
};

export function DisbursementMilestones({ milestones = [], currency = 'NGN' }: DisbursementMilestonesProps) {
  const total = milestones.reduce((sum, m) => sum + m.amount, 0);
  const disbursed = milestones
    .filter((m) => m.status === 'DISBURSED')
    .reduce((sum, m) => sum + m.amount, 0);
  const pct = total > 0 ? (disbursed / total) * 100 : 0;

  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Disbursement Milestones</h3>
        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% disbursed</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-5 overflow-hidden">
        <div
          className="h-2 rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones defined (lump sum disbursement).</p>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const config = STATUS_CONFIG[milestone.status];
            const Icon = config.icon;
            const isLast = index === milestones.length - 1;
            return (
              <div key={milestone.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0', config.bg)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  {!isLast && <div className="w-0.5 h-full bg-border mt-1 mb-0" style={{ minHeight: '12px' }} />}
                </div>
                <div className={cn('flex-1 pb-3', isLast ? '' : '')}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{milestone.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-semibold', config.bg, config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm font-mono font-semibold mt-0.5">{formatMoney(milestone.amount, currency)}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                    <span>Scheduled: {formatDate(milestone.scheduledDate)}</span>
                    {milestone.disbursedDate && (
                      <span>Disbursed: {formatDate(milestone.disbursedDate)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
