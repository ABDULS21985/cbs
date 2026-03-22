import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, TrendingDown, AlertTriangle, BarChart3, Clock, Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useNostroPositions, useCreatePosition, useCorrespondentBanks } from '../hooks/useReconciliation';
import { PositionCard } from '../components/PositionCard';
import type { NostroPosition, ReconciliationStatus, CreatePositionRequest, PositionType } from '../types/nostro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string;
  icon: typeof BarChart3; accent: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', accent)}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── New Position Modal ───────────────────────────────────────────────────────

interface NewPositionModalProps {
  open: boolean;
  onClose: () => void;
}

function NewPositionModal({ open, onClose }: NewPositionModalProps) {
  const { data: banks = [] } = useCorrespondentBanks();
  const createPosition = useCreatePosition();
  const [form, setForm] = useState<{ correspondentBankId: string; accountId: string; currencyCode: string; positionType: PositionType }>({
    correspondentBankId: '',
    accountId: '',
    currencyCode: 'USD',
    positionType: 'NOSTRO',
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CreatePositionRequest = {
      correspondentBankId: Number(form.correspondentBankId),
      accountId: Number(form.accountId),
      currencyCode: form.currencyCode,
      positionType: form.positionType,
    };
    createPosition.mutate(payload, {
      onSuccess: () => {
        onClose();
        setForm({ correspondentBankId: '', accountId: '', currencyCode: 'USD', positionType: 'NOSTRO' });
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">New Position</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Correspondent Bank</label>
            <select
              required
              value={form.correspondentBankId}
              onChange={(e) => setForm({ ...form, correspondentBankId: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select bank...</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.bankName} ({b.swiftBic})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account ID</label>
            <input
              type="number"
              required
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Internal account ID"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input
                required
                value={form.currencyCode}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
                maxLength={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Position Type</label>
              <select
                value={form.positionType}
                onChange={(e) => setForm({ ...form, positionType: e.target.value as 'NOSTRO' | 'VOSTRO' })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="NOSTRO">Nostro</option>
                <option value="VOSTRO">Vostro</option>
              </select>
            </div>
          </div>
          {createPosition.isError && (
            <p className="text-xs text-destructive">Failed to create position. Verify account ID and bank selection.</p>
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
              disabled={createPosition.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createPosition.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: ReconciliationStatus[] = ['PENDING', 'IN_PROGRESS', 'RECONCILED', 'DISCREPANCY'];
const CURRENCIES = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'ZAR', 'KES', 'NGN'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NostroPositionsPage() {
  const navigate = useNavigate();
  const { data: positions = [], isLoading } = useNostroPositions();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'ALL'>('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');

  // Derive unique banks from positions
  const bankNames = useMemo(() => {
    const names = new Set(positions.map((p) => p.correspondentBankName).filter(Boolean));
    return ['ALL', ...Array.from(names)] as string[];
  }, [positions]);

  // Filtered positions
  const filtered = useMemo(() => {
    return positions.filter((p) => {
      if (currencyFilter !== 'ALL' && p.currencyCode !== currencyFilter) return false;
      if (statusFilter !== 'ALL' && p.reconciliationStatus !== statusFilter) return false;
      if (bankFilter !== 'ALL' && p.correspondentBankName !== bankFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          (p.correspondentBankName?.toLowerCase().includes(q)) ||
          (p.accountNumber?.toLowerCase().includes(q)) ||
          (p.correspondentSwiftBic?.toLowerCase().includes(q)) ||
          p.currencyCode.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [positions, currencyFilter, statusFilter, bankFilter, search]);

  // Dashboard stats
  const stats = useMemo(() => {
    const totalBalance = positions.reduce((sum, p) => sum + p.bookBalance, 0);
    const unreconciledTotal = positions.reduce((sum, p) => sum + Math.abs(p.unreconciledAmount), 0);
    const withBreaks = positions.filter((p) => Math.abs(p.bookBalance - p.statementBalance) > 0.005).length;
    const agingValues = positions
      .map((p) => daysSince(p.lastReconciledDate))
      .filter((d): d is number => d !== null);
    const avgAging = agingValues.length > 0
      ? (agingValues.reduce((s, d) => s + d, 0) / agingValues.length).toFixed(1)
      : '--';
    return { totalBalance, unreconciledTotal, withBreaks, avgAging };
  }, [positions]);

  return (
    <>
      <PageHeader
        title="Nostro / Vostro Positions"
        subtitle="Monitor correspondent bank positions and reconciliation status"
        actions={
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Position
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Book Balance"
            value={`$${formatAmount(stats.totalBalance)}`}
            sub={`${positions.length} positions`}
            icon={BarChart3}
            accent="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <StatCard
            label="Unreconciled"
            value={`$${formatAmount(stats.unreconciledTotal)}`}
            sub="Across all positions"
            icon={TrendingDown}
            accent="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <StatCard
            label="Positions with Breaks"
            value={String(stats.withBreaks)}
            sub={`of ${positions.length} total`}
            icon={AlertTriangle}
            accent="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          />
          <StatCard
            label="Avg Aging"
            value={`${stats.avgAging}d`}
            sub="Since last reconciliation"
            icon={Clock}
            accent="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bank, account, SWIFT..."
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Currencies' : c}</option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReconciliationStatus | 'ALL')}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {bankNames.map((b) => (
              <option key={b} value={b}>{b === 'ALL' ? 'All Banks' : b}</option>
            ))}
          </select>
          {(currencyFilter !== 'ALL' || statusFilter !== 'ALL' || bankFilter !== 'ALL' || search) && (
            <button
              type="button"
              onClick={() => { setCurrencyFilter('ALL'); setStatusFilter('ALL'); setBankFilter('ALL'); setSearch(''); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Positions grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">No positions match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((pos) => (
              <PositionCard key={pos.id} position={pos} onClick={() => navigate(`/accounts/reconciliation/positions/${pos.id}`)} />
            ))}
          </div>
        )}
      </div>

      <NewPositionModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
