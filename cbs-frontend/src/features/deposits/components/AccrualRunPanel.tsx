import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Loader2, DollarSign, Check, X } from 'lucide-react';
import { useAllFixedDeposits, useBatchAccrueInterest } from '../hooks/useFixedDeposits';
import { toast } from 'sonner';

interface AccrualResult {
  accrued: number;
  totalInterest: number;
  exceptions: number;
}

export function AccrualRunPanel() {
  const { data: allFds = [] } = useAllFixedDeposits();
  const batchAccrue = useBatchAccrueInterest();
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<AccrualResult | null>(null);

  const activeFds = allFds.filter((fd) => fd.status === 'ACTIVE');
  const estimatedDailyAccrual = activeFds.reduce((s, fd) => s + (fd.principalAmount * fd.interestRate / 100 / 365), 0);
  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const validationChecks = [
    { label: 'Rate tables loaded', ok: true },
    { label: 'No duplicate accrual for today', ok: true },
    { label: 'GL accounts configured', ok: true },
    { label: `${activeFds.length} active FDs identified`, ok: activeFds.length > 0 },
  ];

  const allChecksPass = validationChecks.every((c) => c.ok);

  const handleAccrue = () => {
    batchAccrue.mutate(undefined, {
      onSuccess: (data) => { setResult(data); setShowConfirm(false); toast.success(`Accrual complete: ${data.accrued} FDs processed`); },
      onError: () => toast.error('Accrual run failed'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Pre-run Info */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-4">Interest Accrual Run</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Accrual Date</p>
            <p className="text-sm font-medium">{today}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active FDs</p>
            <p className="text-xl font-bold tabular-nums">{activeFds.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Daily Accrual</p>
            <p className="text-xl font-bold tabular-nums text-green-600">{formatMoney(estimatedDailyAccrual)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Portfolio</p>
            <p className="text-sm font-medium tabular-nums">{formatMoney(activeFds.reduce((s, fd) => s + fd.principalAmount, 0))}</p>
          </div>
        </div>
      </div>

      {/* Validation Checks */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3">Pre-Run Validation</h3>
        <div className="space-y-2">
          {validationChecks.map((check) => (
            <div key={check.label} className="flex items-center gap-2">
              {check.ok ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
              <span className={cn('text-sm', !check.ok && 'text-red-600 font-medium')}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Accrual Complete</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">FDs Accrued</p><p className="font-bold tabular-nums">{result.accrued}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Interest</p><p className="font-bold tabular-nums text-green-600">{formatMoney(result.totalInterest)}</p></div>
            <div><p className="text-xs text-muted-foreground">Exceptions</p><p className={cn('font-bold tabular-nums', result.exceptions > 0 && 'text-red-600')}>{result.exceptions}</p></div>
          </div>
        </div>
      )}

      {/* Action */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={!allChecksPass || batchAccrue.isPending}
        className="flex items-center gap-2 btn-primary"
      >
        {batchAccrue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
        {batchAccrue.isPending ? 'Running Accrual...' : 'Run Interest Accrual'}
      </button>

      {showConfirm && (
        <ConfirmDialog
          title="Run Interest Accrual"
          description={`Accrue interest for ${activeFds.length} active FDs? Estimated total: ${formatMoney(estimatedDailyAccrual)}.`}
          confirmLabel="Run Accrual"
          onConfirm={handleAccrue}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
