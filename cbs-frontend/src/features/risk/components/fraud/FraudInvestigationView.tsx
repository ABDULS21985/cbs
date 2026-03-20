import { useState } from 'react';
import { ShieldOff, Briefcase, Eye, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFraudAlert,
  useFraudAlertTransactions,
  useBlockAccount,
  useFileFraudCase,
  useAllowTransaction,
} from '../../hooks/useFraud';
import { TransactionTimelineViz } from './TransactionTimelineViz';

interface Props {
  alertId: number;
}

export function FraudInvestigationView({ alertId }: Props) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const { data: alert, isLoading: alertLoading } = useFraudAlert(alertId);
  const { data: transactions, isLoading: txnsLoading } = useFraudAlertTransactions(alertId, true);

  const blockAccount = useBlockAccount();
  const fileFraudCase = useFileFraudCase();
  const allowTransaction = useAllowTransaction();

  if (alertLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 w-64 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-[140px] bg-muted rounded-lg" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Alert not found</div>
    );
  }

  const handleAction = async (action: string) => {
    switch (action) {
      case 'block-account':
        await blockAccount.mutateAsync(alert.id);
        break;
      case 'file-case':
        await fileFraudCase.mutateAsync(alert.id);
        break;
      case 'allow':
        await allowTransaction.mutateAsync(alert.id);
        break;
    }
    setConfirmAction(null);
  };

  const suspiciousIds = (transactions ?? []).filter((t) => t.suspicious).map((t) => t.id);

  return (
    <div className="space-y-4">
      {/* Alert summary header */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-base font-semibold">{alert.type}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{alert.alertNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">Risk Score {alert.score}/100</div>
            <div className="text-xs text-muted-foreground">{alert.status.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Customer: </span>
            <span className="font-medium">{alert.customerLabel}</span>
          </div>
          {alert.accountLabel && (
            <div>
              <span className="text-muted-foreground">Account: </span>
              <span className="font-mono">{alert.accountLabel}</span>
            </div>
          )}
          {alert.channel && (
            <div>
              <span className="text-muted-foreground">Channel: </span>
              <span>{alert.channel}</span>
            </div>
          )}
          {alert.location && (
            <div>
              <span className="text-muted-foreground">Location: </span>
              <span>{alert.location}</span>
            </div>
          )}
          {alert.assignedTo && (
            <div>
              <span className="text-muted-foreground">Assigned To: </span>
              <span>{alert.assignedTo}</span>
            </div>
          )}
          {alert.transactionRef && (
            <div>
              <span className="text-muted-foreground">Transaction Ref: </span>
              <span className="font-mono">{alert.transactionRef}</span>
            </div>
          )}
        </div>
        <div className="mt-3 rounded-lg bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {alert.description}
        </div>
        {alert.rules.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {alert.rules.map((rule) => (
              <span
                key={rule}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {rule}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transaction timeline */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">Transaction Timeline</h4>
        {txnsLoading ? (
          <div className="h-[140px] bg-muted/40 rounded animate-pulse" />
        ) : (
          <TransactionTimelineViz
            transactions={transactions ?? []}
            suspiciousIds={suspiciousIds}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">Actions</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirmAction('block-account')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 transition-colors"
          >
            <ShieldOff className="w-3.5 h-3.5" />
            Block Account
          </button>
          <button
            onClick={() => setConfirmAction('file-case')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
            File Fraud Case
          </button>
          <button
            onClick={() => setConfirmAction('allow')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Allow &amp; Monitor
          </button>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-xl border bg-background shadow-2xl p-6">
            <button
              onClick={() => setConfirmAction(null)}
              className="absolute right-4 top-4 p-1 rounded-md hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Confirm Action</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {confirmAction === 'block-account' && 'This will immediately block the customer\'s account from all transactions.'}
                  {confirmAction === 'file-case' && 'This will file a formal fraud case and notify the fraud investigation team.'}
                  {confirmAction === 'allow' && 'This will allow the transaction and add it to the monitoring watchlist.'}
                </div>
              </div>
            </div>
            <div className={cn('flex gap-2 justify-end')}>
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmAction)}
                disabled={blockAccount.isPending || fileFraudCase.isPending || allowTransaction.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
