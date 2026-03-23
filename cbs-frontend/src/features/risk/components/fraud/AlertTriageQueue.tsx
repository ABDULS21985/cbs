import { ShieldOff } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { FraudAlert, FraudAlertSeverity } from '../../types/fraud';
import { AlertTriageCard } from './AlertTriageCard';

interface Props {
  alerts: FraudAlert[];
  isLoading: boolean;
  onInvestigate: (alertId: number) => void;
}

const severityOrder: Record<FraudAlertSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function AlertTriageQueue({ alerts, isLoading, onInvestigate }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn('surface-card p-4 animate-pulse', i === 0 && 'border-l-4 border-red-200')}>
            <div className="flex items-start gap-2 mb-3">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-5 w-40 bg-muted rounded" />
            </div>
            <div className="h-4 w-56 bg-muted rounded mb-2" />
            <div className="h-6 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-64 bg-muted rounded mb-3" />
            <div className="flex gap-2 pt-1 border-t">
              <div className="h-7 w-24 bg-muted rounded" />
              <div className="h-7 w-24 bg-muted rounded" />
              <div className="h-7 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="No active fraud alerts"
        description="All alerts have been reviewed or no new alerts have been triggered."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((alert) => (
        <AlertTriageCard
          key={alert.id}
          alert={alert}
          onInvestigate={onInvestigate}
        />
      ))}
    </div>
  );
}
