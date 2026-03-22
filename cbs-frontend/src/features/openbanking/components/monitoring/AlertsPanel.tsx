import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import {
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertType = 'HIGH_LATENCY' | 'HIGH_ERROR_RATE' | 'DOWNTIME' | 'RATE_LIMIT_BREACH';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface MonitoringAlert {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  currentValue: string;
  threshold: string;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface AlertsPanelProps {
  alerts: MonitoringAlert[];
  onAcknowledge: (id: number) => Promise<void>;
  onResolve: (id: number) => Promise<void>;
  loading?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<AlertType, typeof AlertTriangle> = {
  HIGH_LATENCY: Clock,
  HIGH_ERROR_RATE: XCircle,
  DOWNTIME: ShieldAlert,
  RATE_LIMIT_BREACH: AlertTriangle,
};

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

const STATUS_STYLES: Record<AlertStatus, string> = {
  active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AlertsPanel({ alerts, onAcknowledge, onResolve, loading }: AlertsPanelProps) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleAction = async (id: number, action: 'acknowledge' | 'resolve') => {
    setProcessingId(id);
    try {
      if (action === 'acknowledge') {
        await onAcknowledge(id);
        toast.success('Alert acknowledged');
      } else {
        await onResolve(id);
        toast.success('Alert resolved');
      }
    } catch {
      toast.error(`Failed to ${action} alert`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 animate-pulse">
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-3 w-72 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No active alerts</p>
        <p className="text-xs mt-1">All systems are operating normally.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-6">
      {alerts.map((alert) => {
        const Icon = TYPE_ICONS[alert.type];
        const severity = SEVERITY_STYLES[alert.severity];
        const isProcessing = processingId === alert.id;

        return (
          <div
            key={alert.id}
            className={cn(
              'rounded-lg border p-4 transition-colors',
              severity.bg,
              severity.border,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', severity.icon)} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={cn(
                        'ui-chip uppercase',
                        STATUS_STYLES[alert.status],
                      )}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      Current: <strong className="text-foreground">{alert.currentValue}</strong>
                    </span>
                    <span>
                      Threshold: <strong className="text-foreground">{alert.threshold}</strong>
                    </span>
                    <span>{formatDateTime(alert.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleAction(alert.id, 'acknowledge')}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-background/50 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    Acknowledge
                  </button>
                )}
                {(alert.status === 'active' || alert.status === 'acknowledged') && (
                  <button
                    onClick={() => handleAction(alert.id, 'resolve')}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Resolve
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
