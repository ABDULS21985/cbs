import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  X,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useNostroPosition,
  useReconItems,
  useUnmatchedItems,
  useUpdateStatementBalance,
  useAddReconItem,
  useMatchReconItem,
} from '../hooks/useReconciliation';
import type {
  NostroReconItem,
  ReconItemType,
  MatchStatus,
  CreateReconItemRequest,
} from '../types/nostro';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MATCH_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  MATCHED: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
  UNMATCHED: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
  PARTIAL: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
  DISPUTED: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
  WRITTEN_OFF: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-500' },
};

const RECON_STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  RECONCILED: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
  DISCREPANCY: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
  PENDING: { icon: Clock, color: 'text-muted-foreground' },
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  DEBIT_OUR_BOOKS: 'Debit (Ours)',
  CREDIT_OUR_BOOKS: 'Credit (Ours)',
  DEBIT_THEIR_BOOKS: 'Debit (Theirs)',
  CREDIT_THEIR_BOOKS: 'Credit (Theirs)',
  UNMATCHED_OURS: 'Unmatched (Ours)',
  UNMATCHED_THEIRS: 'Unmatched (Theirs)',
};

const ALL_ITEM_TYPES: ReconItemType[] = [
  'DEBIT_OUR_BOOKS',
  'CREDIT_OUR_BOOKS',
  'DEBIT_THEIR_BOOKS',
  'CREDIT_THEIR_BOOKS',
  'UNMATCHED_OURS',
  'UNMATCHED_THEIRS',
];

// ─── Update Statement Balance Modal ──────────────────────────────────────────

function UpdateStatementModal({
  open,
  onClose,
  positionId,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  positionId: number;
  currency: string;
}) {
  const updateMutation = useUpdateStatementBalance();
  const [balance, setBalance] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(
      { positionId, statementBalance: parseFloat(balance), statementDate: date },
      {
        onSuccess: () => {
          onClose();
          setBalance('');
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Update Statement Balance</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Statement Balance ({currency})</label>
            <input
              type="number"
              required
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Statement Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !balance}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Balance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Recon Item Modal ────────────────────────────────────────────────────

function AddReconItemModal({
  open,
  onClose,
  positionId,
}: {
  open: boolean;
  onClose: () => void;
  positionId: number;
}) {
  const addMutation = useAddReconItem(positionId);
  const [form, setForm] = useState<CreateReconItemRequest>({
    itemType: 'DEBIT_OUR_BOOKS',
    reference: '',
    amount: 0,
    valueDate: new Date().toISOString().slice(0, 10),
    narration: '',
    notes: '',
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addMutation.mutate(form, {
      onSuccess: () => {
        onClose();
        setForm({ itemType: 'DEBIT_OUR_BOOKS', reference: '', amount: 0, valueDate: new Date().toISOString().slice(0, 10), narration: '', notes: '' });
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Add Reconciliation Item</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Item Type</label>
              <select
                value={form.itemType}
                onChange={(e) => setForm({ ...form, itemType: e.target.value as ReconItemType })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {ALL_ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reference</label>
              <input
                required
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="e.g. TXN-12345"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Value Date</label>
              <input
                type="date"
                required
                value={form.valueDate}
                onChange={(e) => setForm({ ...form, valueDate: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Narration</label>
            <input
              value={form.narration || ''}
              onChange={(e) => setForm({ ...form, narration: e.target.value })}
              placeholder="Description of entry"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          {addMutation.isError && (
            <p className="text-xs text-destructive">Failed to add item. Check required fields and permissions.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending || !form.reference || form.amount <= 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Match Item Modal ────────────────────────────────────────────────────────

function MatchItemModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: NostroReconItem | null;
}) {
  const matchMutation = useMatchReconItem();
  const [matchRef, setMatchRef] = useState('');
  const [resolvedBy, setResolvedBy] = useState('');

  if (!open || !item) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    matchMutation.mutate(
      { itemId: item!.id, matchReference: matchRef, resolvedBy },
      {
        onSuccess: () => {
          onClose();
          setMatchRef('');
          setResolvedBy('');
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Match Reconciliation Item</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="rounded-lg bg-muted/30 border p-3 mb-4 text-xs space-y-1">
          <p><span className="text-muted-foreground">Reference:</span> <span className="font-mono font-medium">{item.reference}</span></p>
          <p><span className="text-muted-foreground">Amount:</span> <span className="font-mono font-medium">{item.amount.toFixed(2)} {item.currencyCode}</span></p>
          <p><span className="text-muted-foreground">Type:</span> {ITEM_TYPE_LABELS[item.itemType] || item.itemType}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Match Reference</label>
            <input
              required
              value={matchRef}
              onChange={(e) => setMatchRef(e.target.value)}
              placeholder="Counterpart reference"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Resolved By</label>
            <input
              required
              value={resolvedBy}
              onChange={(e) => setResolvedBy(e.target.value)}
              placeholder="Your name / user ID"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          {matchMutation.isError && (
            <p className="text-xs text-destructive">Failed to match item. Please try again.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={matchMutation.isPending || !matchRef || !resolvedBy}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {matchMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Link2 className="w-4 h-4" />
              Confirm Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Recon Items Table ───────────────────────────────────────────────────────

function ReconItemsTable({
  items,
  loading,
  currency,
  onMatch,
}: {
  items: NostroReconItem[];
  loading: boolean;
  currency: string;
  onMatch: (item: NostroReconItem) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ReconItemType | 'ALL'>('ALL');

  const filtered = items.filter((item) => {
    if (statusFilter !== 'ALL' && item.matchStatus !== statusFilter) return false;
    if (typeFilter !== 'ALL' && item.itemType !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MatchStatus | 'ALL')}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="MATCHED">Matched</option>
          <option value="UNMATCHED">Unmatched</option>
          <option value="PARTIAL">Partial</option>
          <option value="DISPUTED">Disputed</option>
          <option value="WRITTEN_OFF">Written Off</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ReconItemType | 'ALL')}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs"
        >
          <option value="ALL">All Types</option>
          {ALL_ITEM_TYPES.map((t) => (
            <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
          No reconciliation items found.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Value Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Narration</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Match Ref</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const styles = MATCH_STATUS_STYLES[item.matchStatus] || MATCH_STATUS_STYLES.UNMATCHED;
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{item.valueDate}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium">{item.reference}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {ITEM_TYPE_LABELS[item.itemType] || item.itemType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(item.amount, currency)}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[200px] truncate text-muted-foreground" title={item.narration}>
                        {item.narration || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', styles.bg, styles.text)}>
                          {item.matchStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {item.matchReference || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.matchStatus === 'UNMATCHED' && (
                          <button
                            type="button"
                            onClick={() => onMatch(item)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <Link2 className="w-3 h-3" /> Match
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function NostroPositionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const positionId = parseInt(id || '0', 10);

  const { data: position, isLoading: positionLoading, isError: positionError } = useNostroPosition(positionId);
  const { data: reconItems = [], isLoading: itemsLoading } = useReconItems(positionId);
  const { data: unmatchedItems = [] } = useUnmatchedItems(positionId);

  const [activeTab, setActiveTab] = useState<'all' | 'unmatched'>('all');
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [matchItem, setMatchItem] = useState<NostroReconItem | null>(null);

  if (positionLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (positionError || !position) {
    return (
      <div className="page-container">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive font-medium">Position not found or could not be loaded.</p>
          <button
            type="button"
            onClick={() => navigate('/accounts/reconciliation/positions')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to Positions
          </button>
        </div>
      </div>
    );
  }

  const difference = position.bookBalance - position.statementBalance;
  const hasMismatch = Math.abs(difference) > 0.005;
  const currency = position.currencyCode;
  const statusCfg = RECON_STATUS_CONFIG[position.reconciliationStatus] || RECON_STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  return (
    <>
      <PageHeader
        title={`${position.correspondentBankName || 'Position'} — ${currency}`}
        subtitle={`${position.positionType} position · ${position.accountNumber || 'No account'} · ${position.correspondentSwiftBic || ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/accounts/reconciliation/positions')}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Position Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Book Balance</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(position.bookBalance, currency)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Statement Balance</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(position.statementBalance, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              as of {formatDate(position.lastStatementDate)}
            </p>
          </div>
          <div className={cn('rounded-xl border p-5', hasMismatch ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40' : 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40')}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3" /> Difference
            </p>
            <p className={cn('text-xl font-bold tabular-nums', hasMismatch ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
              {formatCurrency(difference, currency)}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon className={cn('w-5 h-5', statusCfg.color)} />
              <span className={cn('text-sm font-semibold', statusCfg.color)}>
                {position.reconciliationStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {position.outstandingItemsCount} outstanding item{position.outstandingItemsCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowStatementModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Update Statement Balance
          </button>
          <button
            type="button"
            onClick={() => setShowAddItemModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Recon Item
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b pb-0">
          {[
            { id: 'all' as const, label: 'All Items', count: reconItems.length },
            { id: 'unmatched' as const, label: 'Unmatched', count: unmatchedItems.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
              <span className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[11px] font-bold',
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Recon Items Table */}
        <ReconItemsTable
          items={activeTab === 'unmatched' ? unmatchedItems : reconItems}
          loading={itemsLoading}
          currency={currency}
          onMatch={(item) => setMatchItem(item)}
        />
      </div>

      {/* Modals */}
      <UpdateStatementModal
        open={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        positionId={positionId}
        currency={currency}
      />
      <AddReconItemModal
        open={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        positionId={positionId}
      />
      <MatchItemModal
        open={!!matchItem}
        onClose={() => setMatchItem(null)}
        item={matchItem}
      />
    </>
  );
}
