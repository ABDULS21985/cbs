import { useState, useMemo } from 'react';
import { Loader2, Plus, X, Search, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  useOpenMarginCalls,
  useMarginCallsByCounterparty,
  useIssueMarginCall,
  useAcknowledgeMarginCall,
  useSettleMarginCall,
} from '../hooks/useRiskExt';
import type { MarginCall } from '../types/creditMargin';

// ─── Constants ───────────────────────────────────────────────────────────────

const CALL_DIRECTIONS = ['ISSUED', 'RECEIVED'] as const;
const CALL_TYPES = ['VARIATION', 'INITIAL', 'DEFAULT_FUND'] as const;

// ─── Issue Margin Call Modal ─────────────────────────────────────────────────

function IssueMarginCallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const issueMutation = useIssueMarginCall();

  const [form, setForm] = useState({
    counterpartyCode: '',
    counterpartyName: '',
    callDirection: 'ISSUED' as string,
    callType: 'VARIATION' as string,
    currency: 'NGN',
    callAmount: 0,
    portfolioMtm: 0,
    thresholdAmount: 0,
    minimumTransfer: 0,
    responseDeadline: '',
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    issueMutation.mutate(
      {
        counterpartyCode: form.counterpartyCode,
        counterpartyName: form.counterpartyName,
        callDirection: form.callDirection,
        callType: form.callType,
        currency: form.currency,
        callAmount: form.callAmount,
        portfolioMtm: form.portfolioMtm,
        thresholdAmount: form.thresholdAmount,
        minimumTransfer: form.minimumTransfer,
        responseDeadline: form.responseDeadline,
      },
      {
        onSuccess: () => {
          toast.success('Margin call issued successfully');
          setForm({
            counterpartyCode: '',
            counterpartyName: '',
            callDirection: 'ISSUED',
            callType: 'VARIATION',
            currency: 'NGN',
            callAmount: 0,
            portfolioMtm: 0,
            thresholdAmount: 0,
            minimumTransfer: 0,
            responseDeadline: '',
          });
          onClose();
        },
        onError: () => {
          toast.error('Failed to issue margin call');
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Issue Margin Call</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Counterparty Code</label>
              <input
                required
                value={form.counterpartyCode}
                onChange={(e) => setForm({ ...form, counterpartyCode: e.target.value })}
                placeholder="e.g. CP001"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Counterparty Name</label>
              <input
                required
                value={form.counterpartyName}
                onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })}
                placeholder="Counterparty name"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Direction</label>
              <select
                value={form.callDirection}
                onChange={(e) => setForm({ ...form, callDirection: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {CALL_DIRECTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Call Type</label>
              <select
                value={form.callType}
                onChange={(e) => setForm({ ...form, callType: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {CALL_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input
                required
                value={form.currency}
                maxLength={3}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Call Amount</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={form.callAmount || ''}
                onChange={(e) => setForm({ ...form, callAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Portfolio MtM</label>
              <input
                type="number"
                step="0.01"
                value={form.portfolioMtm || ''}
                onChange={(e) => setForm({ ...form, portfolioMtm: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Threshold Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.thresholdAmount || ''}
                onChange={(e) => setForm({ ...form, thresholdAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Transfer</label>
              <input
                type="number"
                step="0.01"
                value={form.minimumTransfer || ''}
                onChange={(e) => setForm({ ...form, minimumTransfer: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Response Deadline</label>
              <input
                type="datetime-local"
                required
                value={form.responseDeadline}
                onChange={(e) => setForm({ ...form, responseDeadline: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {issueMutation.isError && (
            <p className="text-xs text-destructive">Failed to issue margin call. Check input and permissions.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issueMutation.isPending || form.callAmount <= 0 || !form.counterpartyCode}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {issueMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Issue Call
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Settle Modal ────────────────────────────────────────────────────────────

function SettleModal({
  open,
  onClose,
  call,
}: {
  open: boolean;
  onClose: () => void;
  call: MarginCall | null;
}) {
  const settleMutation = useSettleMarginCall();
  const [agreedAmount, setAgreedAmount] = useState('');
  const [collateralType, setCollateralType] = useState('CASH');

  if (!open || !call) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    settleMutation.mutate(
      {
        ref: call!.callRef,
        data: {
          agreedAmount: parseFloat(agreedAmount) || 0,
          collateralType,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Margin call ${call!.callRef} settled`);
          setAgreedAmount('');
          setCollateralType('CASH');
          onClose();
        },
        onError: () => {
          toast.error('Failed to settle margin call');
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Settle Margin Call</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-lg bg-muted/30 border p-3 mb-4 text-xs space-y-1">
          <p>
            <span className="text-muted-foreground">Call Ref:</span>{' '}
            <span className="font-medium font-mono">{call.callRef}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Counterparty:</span>{' '}
            <span className="font-medium">{call.counterpartyName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Direction:</span>{' '}
            <span className="font-medium">{call.callDirection}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Call Amount:</span>{' '}
            <span className="font-mono font-medium">{formatMoney(call.callAmount, call.currency)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className="font-medium">{call.status}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Agreed Amount</label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={agreedAmount}
              onChange={(e) => setAgreedAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Collateral Type</label>
            <select
              value={collateralType}
              onChange={(e) => setCollateralType(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="GOVERNMENT_BONDS">Government Bonds</option>
              <option value="CORPORATE_BONDS">Corporate Bonds</option>
              <option value="EQUITIES">Equities</option>
              <option value="LETTER_OF_CREDIT">Letter of Credit</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {settleMutation.isError && (
            <p className="text-xs text-destructive">Failed to settle margin call.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={settleMutation.isPending || !agreedAmount}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {settleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Settle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Margin Calls Table ──────────────────────────────────────────────────────

function MarginCallsTable({
  calls,
  isLoading,
  onAcknowledge,
  onSettle,
}: {
  calls: MarginCall[];
  isLoading: boolean;
  onAcknowledge: (call: MarginCall) => void;
  onSettle: (call: MarginCall) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">No margin calls found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Call Ref</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Direction</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Counterparty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Call Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Call Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Deadline</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium">{call.callRef}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      call.callDirection === 'ISSUED'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
                    )}
                  >
                    {call.callDirection}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{call.counterpartyName}</p>
                  <p className="text-xs text-muted-foreground">{call.counterpartyCode}</p>
                </td>
                <td className="px-4 py-3 text-xs">{call.callType.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                  {formatMoney(call.callAmount, call.currency)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={call.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {call.callDate ? new Date(call.callDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {call.responseDeadline ? new Date(call.responseDeadline).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {['ISSUED', 'PENDING', 'OPEN'].includes(call.status) && (
                      <button
                        type="button"
                        onClick={() => onAcknowledge(call)}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
                      >
                        Ack
                      </button>
                    )}
                    {['ACKNOWLEDGED', 'AGREED'].includes(call.status) && (
                      <button
                        type="button"
                        onClick={() => onSettle(call)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function CreditMarginPage() {
  const [showIssue, setShowIssue] = useState(false);
  const [settleCall, setSettleCall] = useState<MarginCall | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'counterparty'>('open');
  const [counterpartyInput, setCounterpartyInput] = useState('');
  const [counterpartyCode, setCounterpartyCode] = useState('');

  const openCallsQuery = useOpenMarginCalls();
  const counterpartyQuery = useMarginCallsByCounterparty(counterpartyCode);
  const acknowledgeMutation = useAcknowledgeMarginCall();

  const openCalls = openCallsQuery.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const totalAmount = openCalls.reduce((sum, c) => sum + (c.callAmount || 0), 0);
    const pendingSettlement = openCalls.filter((c) =>
      ['ACKNOWLEDGED', 'AGREED'].includes(c.status),
    ).length;
    return { openCount: openCalls.length, totalAmount, pendingSettlement };
  }, [openCalls]);

  function handleAcknowledge(call: MarginCall) {
    acknowledgeMutation.mutate(
      { ref: call.callRef, data: { status: 'ACKNOWLEDGED' } },
      {
        onSuccess: () => toast.success(`Call ${call.callRef} acknowledged`),
        onError: () => toast.error('Failed to acknowledge margin call'),
      },
    );
  }

  function handleCounterpartySearch(e: React.FormEvent) {
    e.preventDefault();
    setCounterpartyCode(counterpartyInput.trim());
  }

  const tabs = [
    { key: 'open' as const, label: 'Open Margin Calls' },
    { key: 'counterparty' as const, label: 'By Counterparty' },
  ];

  return (
    <>
      <PageHeader
        title="Credit Margin & Collateral"
        subtitle="Manage margin calls, collateral posting, and settlement across counterparties"
        actions={
          <button
            type="button"
            onClick={() => setShowIssue(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Issue Margin Call
          </button>
        }
      />

      <div className="px-6 space-y-6 pb-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Open Calls</p>
            </div>
            <p className="text-2xl font-bold">{stats.openCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Total Call Amount</p>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums">{formatMoney(stats.totalAmount)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Pending Settlement</p>
            </div>
            <p className="text-2xl font-bold">{stats.pendingSettlement}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'open' && (
          <MarginCallsTable
            calls={openCalls}
            isLoading={openCallsQuery.isLoading}
            onAcknowledge={handleAcknowledge}
            onSettle={(call) => setSettleCall(call)}
          />
        )}

        {activeTab === 'counterparty' && (
          <div className="space-y-4">
            <form onSubmit={handleCounterpartySearch} className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={counterpartyInput}
                  onChange={(e) => setCounterpartyInput(e.target.value)}
                  placeholder="Enter counterparty code..."
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={!counterpartyInput.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Search
              </button>
            </form>

            {!counterpartyCode ? (
              <div className="rounded-xl border border-dashed p-16 text-center text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Enter a counterparty code to view margin calls</p>
              </div>
            ) : (
              <MarginCallsTable
                calls={counterpartyQuery.data ?? []}
                isLoading={counterpartyQuery.isLoading}
                onAcknowledge={handleAcknowledge}
                onSettle={(call) => setSettleCall(call)}
              />
            )}
          </div>
        )}
      </div>

      <IssueMarginCallModal open={showIssue} onClose={() => setShowIssue(false)} />
      <SettleModal open={!!settleCall} onClose={() => setSettleCall(null)} call={settleCall} />
    </>
  );
}
