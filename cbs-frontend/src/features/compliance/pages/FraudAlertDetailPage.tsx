import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, DataTable, ConfirmDialog } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatRelative, formatDateTime } from '@/lib/formatters';
import {
  Shield, Ban, Check, FileText, X, UserPlus, AlertTriangle,
  Smartphone, Globe, Fingerprint, Clock, CreditCard, Loader2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { FraudAlert } from '../types/fraud';
import {
  useFraudAlert, useFraudAlertTransactions,
  useBlockCardFromFraud, useBlockAccountFromFraud,
  useAllowTransaction, useDismissFraudAlert, useFileFraudCase,
  useAssignFraudAlert, useResolveFraudAlert,
} from '../hooks/useFraud';
import { toast } from 'sonner';

const actionColors: Record<string, string> = {
  BLOCK_TRANSACTION: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  STEP_UP_AUTH: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REVIEW: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const categoryColors: Record<string, string> = {
  AMOUNT_ANOMALY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  VELOCITY: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  GEO_ANOMALY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEVICE_ANOMALY: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ACCOUNT_TAKEOVER: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CARD_FRAUD: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

function riskScoreColor(score: number): string {
  if (score >= 81) return 'text-red-600';
  if (score >= 61) return 'text-orange-600';
  if (score >= 31) return 'text-amber-600';
  return 'text-green-600';
}

function riskScoreBorder(score: number): string {
  if (score >= 81) return 'border-red-500';
  if (score >= 61) return 'border-orange-500';
  if (score >= 31) return 'border-amber-500';
  return 'border-green-500';
}

function riskScoreBg(score: number): string {
  if (score >= 81) return 'bg-red-50 dark:bg-red-900/20';
  if (score >= 61) return 'bg-orange-50 dark:bg-orange-900/20';
  if (score >= 31) return 'bg-amber-50 dark:bg-amber-900/20';
  return 'bg-green-50 dark:bg-green-900/20';
}

// ── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({ alertId, onClose }: { alertId: number; onClose: () => void }) {
  const assign = useAssignFraudAlert();
  const [assignee, setAssignee] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Assign Alert</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Assign To</label>
            <input className="w-full mt-1 input" placeholder="Analyst name or ID" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => assign.mutate({ id: alertId, assignedTo: assignee }, { onSuccess: () => { toast.success('Alert assigned'); onClose(); } })}
              disabled={!assignee || assign.isPending}
              className="btn-primary"
            >
              {assign.isPending ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dismiss Dialog ───────────────────────────────────────────────────────────

function DismissDialog({ alertId, onClose }: { alertId: number; onClose: () => void }) {
  const dismiss = useDismissFraudAlert();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Dismiss Alert</h2>
        <p className="text-sm text-muted-foreground mb-4">This will mark the alert as dismissed. Are you sure?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => dismiss.mutate(alertId, { onSuccess: () => { toast.success('Alert dismissed'); onClose(); } })}
            disabled={dismiss.isPending}
            className="px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80"
          >
            {dismiss.isPending ? 'Dismissing...' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function FraudAlertDetailPage() {
  const { id: idParam = '' } = useParams<{ id: string }>();
  const id = parseInt(idParam, 10);

  const { data: alert, isLoading } = useFraudAlert(id);
  const { data: relatedTxns = [], isLoading: txnLoading } = useFraudAlertTransactions(id);

  const blockCard = useBlockCardFromFraud();
  const blockAccount = useBlockAccountFromFraud();
  const allow = useAllowTransaction();
  const fileCase = useFileFraudCase();

  const [showAssign, setShowAssign] = useState(false);
  const [showDismiss, setShowDismiss] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/compliance/fraud" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!alert) {
    return (
      <>
        <PageHeader title="Alert Not Found" backTo="/compliance/fraud" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No fraud alert found with ID {idParam}</p>
        </div>
      </>
    );
  }

  const isActive = alert.status === 'NEW' || alert.status === 'INVESTIGATING';
  const totalRuleWeight = alert.triggeredRules.reduce((s, r) => s + r.weight, 0);

  const txnCols: ColumnDef<Record<string, unknown>, any>[] = [
    { accessorKey: 'transactionRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.transactionRef ?? '')}</span> },
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => <span className="text-xs">{row.original.date ? formatDate(String(row.original.date)) : '--'}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{typeof row.original.amount === 'number' ? formatMoney(row.original.amount) : '--'}</span> },
    { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <span className="text-xs">{String(row.original.channel ?? '')}</span> },
    { accessorKey: 'merchantName', header: 'Merchant', cell: ({ row }) => <span className="text-sm">{String(row.original.merchantName ?? '')}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={String(row.original.status ?? '')} dot /> },
  ];

  return (
    <>
      <PageHeader
        title={alert.alertRef}
        subtitle={`Risk Score: ${alert.riskScore} · ${alert.status} · ${alert.actionTaken.replace(/_/g, ' ')}`}
        backTo="/compliance/fraud"
      />

      <div className="page-container space-y-6">
        {/* Emergency Actions Bar */}
        {isActive && (
          <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10 p-4">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-3">IMMEDIATE RESPONSE ACTIONS</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setConfirmAction('blockCard')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
              >
                <Ban className="w-3.5 h-3.5" /> Block Card
              </button>
              <button
                onClick={() => setConfirmAction('blockAccount')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
              >
                <Ban className="w-3.5 h-3.5" /> Block Account
              </button>
              <button
                onClick={() => setConfirmAction('allow')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-300 text-green-700 text-xs font-medium hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/10"
              >
                <Check className="w-3.5 h-3.5" /> Allow Transaction
              </button>
              <button
                onClick={() => fileCase.mutate(alert.id, { onSuccess: () => toast.success('Investigation case filed') })}
                disabled={fileCase.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" /> File Investigation
              </button>
              <button
                onClick={() => setShowDismiss(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
              <button
                onClick={() => setShowAssign(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium hover:bg-muted"
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Risk Score Breakdown */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-medium mb-4">Risk Score Breakdown</p>
              <div className="flex items-center gap-6 mb-6">
                <div className={cn('w-20 h-20 rounded-full flex items-center justify-center border-4', riskScoreBorder(alert.riskScore), riskScoreBg(alert.riskScore))}>
                  <span className={cn('text-2xl font-bold tabular-nums', riskScoreColor(alert.riskScore))}>{alert.riskScore}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">of {alert.maxScore} max score</p>
                  <p className="text-sm text-muted-foreground">{alert.triggeredRules.length} rule{alert.triggeredRules.length !== 1 ? 's' : ''} triggered</p>
                </div>
              </div>
              <div className="space-y-3">
                {alert.triggeredRules.map((rule) => (
                  <div key={rule.ruleCode} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rule.ruleName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{rule.ruleCode}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums">+{rule.weight}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${totalRuleWeight > 0 ? (rule.weight / totalRuleWeight) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {rule.weight}/{totalRuleWeight} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Details */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-medium mb-4">Transaction & Alert Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Alert Ref</p><p className="font-mono font-medium">{alert.alertRef}</p></div>
                <div><p className="text-xs text-muted-foreground">Transaction Ref</p><p className="font-mono font-medium">{alert.transactionRef}</p></div>
                <div><p className="text-xs text-muted-foreground">Customer ID</p><p className="font-medium tabular-nums">{alert.customerId}</p></div>
                <div><p className="text-xs text-muted-foreground">Account ID</p><p className="font-medium tabular-nums">{alert.accountId}</p></div>
                <div><p className="text-xs text-muted-foreground">Channel</p><p className="font-medium">{alert.channel}</p></div>
                <div><p className="text-xs text-muted-foreground">Action Taken</p>
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', actionColors[alert.actionTaken])}>
                    {alert.actionTaken.replace(/_/g, ' ')}
                  </span>
                </div>
                <div><p className="text-xs text-muted-foreground">Device ID</p><p className="font-mono text-xs">{alert.deviceId || '--'}</p></div>
                <div><p className="text-xs text-muted-foreground">IP Address</p><p className="font-mono text-xs">{alert.ipAddress || '--'}</p></div>
                <div><p className="text-xs text-muted-foreground">Geo Location</p><p className="text-xs">{alert.geoLocation || '--'}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="text-xs tabular-nums">{formatDateTime(alert.createdAt)}</p></div>
              </div>
            </div>

            {/* Related Transactions */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b">
                <p className="text-sm font-medium">Related Transactions</p>
                <p className="text-xs text-muted-foreground">Recent transactions from same customer/device</p>
              </div>
              <div className="p-4">
                <DataTable columns={txnCols} data={relatedTxns} isLoading={txnLoading} emptyMessage="No related transactions" />
              </div>
            </div>

            {/* Resolution */}
            {alert.resolvedAt && (
              <div className="rounded-xl border bg-card p-5">
                <p className="text-sm font-medium mb-3">Resolution</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={alert.status} dot /></div>
                  <div><p className="text-xs text-muted-foreground">Resolved By</p><p className="font-medium">{alert.resolvedBy || '--'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Resolved At</p><p className="text-xs tabular-nums">{formatDateTime(alert.resolvedAt)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-xs">{alert.resolutionNotes || '--'}</p></div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Investigation Timeline */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-medium mb-4">Timeline</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="text-xs font-medium">Alert Created</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{formatDateTime(alert.createdAt)}</p>
                  </div>
                </div>
                {alert.assignedTo && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div>
                      <p className="text-xs font-medium">Assigned to {alert.assignedTo}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{formatDateTime(alert.updatedAt)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5', actionColors[alert.actionTaken]?.includes('red') ? 'bg-red-500' : actionColors[alert.actionTaken]?.includes('amber') ? 'bg-amber-500' : 'bg-blue-500')} />
                  <div>
                    <p className="text-xs font-medium">Action: {alert.actionTaken.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-muted-foreground">Automated response</p>
                  </div>
                </div>
                {alert.resolvedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="text-xs font-medium">Resolved by {alert.resolvedBy}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{formatDateTime(alert.resolvedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Device Intelligence */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> Device Intelligence
              </p>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Device ID</p><p className="font-mono text-xs">{alert.deviceId || 'Unknown'}</p></div>
                <div><p className="text-xs text-muted-foreground">IP Address</p><p className="font-mono text-xs">{alert.ipAddress || 'Unknown'}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="text-xs">{alert.geoLocation || 'Unknown'}</p></div>
              </div>
            </div>

            {/* Customer Risk Summary */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Customer Risk Profile
              </p>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Customer ID</p><p className="font-medium tabular-nums">{alert.customerId}</p></div>
                <div><p className="text-xs text-muted-foreground">Account ID</p><p className="font-medium tabular-nums">{alert.accountId}</p></div>
                <div><p className="text-xs text-muted-foreground">Current Alert Score</p>
                  <span className={cn('text-lg font-bold tabular-nums', riskScoreColor(alert.riskScore))}>{alert.riskScore}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialogs */}
      {confirmAction === 'blockCard' && (
        <ConfirmDialog
          open
          title="Block Card"
          description="Block the card associated with this transaction? This will prevent all future card transactions."
          confirmLabel="Block Card"
          variant="destructive"
          onConfirm={() => { blockCard.mutate(alert.id, { onSuccess: () => toast.success('Card blocked') }); setConfirmAction(null); }}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'blockAccount' && (
        <ConfirmDialog
          open
          title="Freeze Account"
          description="Freeze the account? All debits will be prevented."
          confirmLabel="Freeze Account"
          variant="destructive"
          onConfirm={() => { blockAccount.mutate(alert.id, { onSuccess: () => toast.success('Account frozen') }); setConfirmAction(null); }}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'allow' && (
        <ConfirmDialog
          open
          title="Allow Transaction"
          description="Mark this transaction as legitimate? The alert will be resolved as false positive."
          confirmLabel="Allow"
          onConfirm={() => { allow.mutate(alert.id, { onSuccess: () => toast.success('Transaction allowed') }); setConfirmAction(null); }}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {showAssign && <AssignDialog alertId={alert.id} onClose={() => setShowAssign(false)} />}
      {showDismiss && <DismissDialog alertId={alert.id} onClose={() => setShowDismiss(false)} />}
    </>
  );
}
