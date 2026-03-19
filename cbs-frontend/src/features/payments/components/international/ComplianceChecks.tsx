import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { ComplianceCheck } from '../../api/internationalPaymentApi';

const statusConfig = {
  CLEAR: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  FLAG: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  BLOCK: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
};

interface Props {
  checks: ComplianceCheck[] | null;
  isLoading: boolean;
}

export function ComplianceChecks({ checks, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Running compliance checks...
      </div>
    );
  }

  if (!checks || checks.length === 0) return null;

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compliance Checks</h4>
      <div className="space-y-2">
        {checks.map((check, i) => {
          const config = statusConfig[check.status];
          const Icon = config.icon;
          return (
            <div key={i} className={`flex items-start gap-2 p-2 rounded-md ${config.bg}`}>
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
              <div>
                <p className={`text-sm font-medium ${config.color}`}>{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
