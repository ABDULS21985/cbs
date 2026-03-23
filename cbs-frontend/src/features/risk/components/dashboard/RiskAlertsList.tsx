import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RiskAlert } from '../../types/dashboard';

interface Props {
  data: RiskAlert[];
  isLoading?: boolean;
}

const severityIcon = (severity: 'RED' | 'AMBER' | 'GREEN') => {
  if (severity === 'RED') return '🔴';
  if (severity === 'AMBER') return '🟡';
  return '🟢';
};

const moduleRoute = (module: string) => {
  if (module === 'aml') return '/risk/aml';
  if (module === 'liquidity') return '/risk/liquidity';
  return '/risk/dashboard';
};

export function RiskAlertsList({ data, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="surface-card p-4">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 py-3 animate-pulse">
            <div className="w-5 h-5 bg-muted rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const order = { RED: 0, AMBER: 1, GREEN: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="surface-card p-4">
      <h3 className="text-sm font-semibold mb-2">Risk Alerts</h3>
      <div className="divide-y max-h-80 overflow-y-auto">
        {sorted.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 py-2.5',
              alert.severity === 'RED' && 'animate-pulse',
            )}
          >
            <span className="text-base flex-shrink-0 mt-0.5">{severityIcon(alert.severity)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{alert.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alert.module.toUpperCase()} · {formatRelative(alert.timestamp)}
              </p>
            </div>
            <button
              onClick={() => navigate(moduleRoute(alert.module))}
              className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
              title="View module"
            >
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No active alerts</p>
        )}
      </div>
    </div>
  );
}
