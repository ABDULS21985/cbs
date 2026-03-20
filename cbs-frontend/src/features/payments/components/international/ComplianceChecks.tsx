import { CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import type { ComplianceCheck } from '../../api/internationalPaymentApi';

const statusConfig = {
  CLEAR: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  FLAG: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  BLOCK: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
};

interface Props {
  checks: ComplianceCheck[] | null;
  isLoading: boolean;
  onRerun?: () => void;
}

export function ComplianceChecks({ checks, isLoading, onRerun }: Props) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Running compliance checks...
      </div>
    );
  }

  if (!checks || checks.length === 0) return null;

  const clearCount = checks.filter((c) => c.status === 'CLEAR').length;
  const flagCount = checks.filter((c) => c.status === 'FLAG').length;
  const blockCount = checks.filter((c) => c.status === 'BLOCK').length;

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compliance Checks</h4>
        {onRerun && (
          <button
            type="button"
            onClick={onRerun}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Re-run Checks
          </button>
        )}
      </div>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-3.5 h-3.5" aria-label="Clear checks" /> {clearCount} Clear
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" aria-label="Flagged checks" /> {flagCount} Flagged
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="w-3.5 h-3.5" aria-label="Blocked checks" /> {blockCount} Blocked
        </span>
      </div>

      <div className="space-y-2">
        {checks.map((check, i) => {
          const config = statusConfig[check.status];
          const Icon = config.icon;
          return (
            <div key={i} className={`flex items-start gap-2 p-2 rounded-md ${config.bg}`}>
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} aria-label={check.status} />
              <div>
                <p className={`text-sm font-medium ${config.color}`}>{check.label}</p>
                {check.status === 'FLAG' && (
                  <p className="text-xs text-amber-600">{check.message}</p>
                )}
                {check.status === 'BLOCK' && (
                  <p className="text-xs text-red-600">Transfer cannot proceed. Contact Compliance team.</p>
                )}
                {check.status === 'CLEAR' && (
                  <p className="text-xs text-muted-foreground">{check.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
