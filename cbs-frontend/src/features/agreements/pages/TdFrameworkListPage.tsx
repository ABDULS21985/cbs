import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, CheckCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useTdFrameworks,
  useCreateTdFramework,
  useApproveTdFramework,
  useCheckTdRate,
  useLargeDeposits,
} from '../hooks/useAgreementsExt';
import type { TdFrameworkAgreement, CreateTdFrameworkPayload, RateCheckResult } from '../types/agreementExt';

// ── Rate Tier Row ────────────────────────────────────────────────────────────

interface TierRow {
  min_amount: number;
  max_amount: number;
  rate: number;
}

// ── Create Dialog ────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
}

function CreateDialog({ open, onClose }: CreateDialogProps) {
  const createMutation = useCreateTdFramework();
  const [form, setForm] = useState<CreateTdFrameworkPayload>({
    customerId: 0,
    agreementType: 'INSTITUTIONAL',
    currency: 'USD',
    minDepositAmount: 100000,
    rateStructure: 'FIXED',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [tiers, setTiers] = useState<TierRow[]>([{ min_amount: 0, max_amount: 1000000, rate: 3.5 }]);

  const set = <K extends keyof CreateTdFrameworkPayload>(k: K, v: CreateTdFrameworkPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const payload: CreateTdFrameworkPayload = {
      ...form,
      rateTiers: form.rateStructure === 'TIERED' ? tiers : undefined,
    };
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('TD Framework created');
        onClose();
      },
      onError: () => toast.error('Failed to create TD Framework'),
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">New TD Framework Agreement</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* General */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Customer ID *</label>
                <input type="number" value={form.customerId || ''} onChange={(e) => set('customerId', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Agreement Type</label>
                <select value={form.agreementType} onChange={(e) => set('agreementType', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="INSTITUTIONAL">Institutional</option>
                  <option value="RETAIL">Retail</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Currency</label>
                <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {['USD', 'EUR', 'GBP', 'KES'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Rate Structure</label>
                <select value={form.rateStructure} onChange={(e) => set('rateStructure', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="FIXED">Fixed</option>
                  <option value="TIERED">Tiered</option>
                  <option value="BENCHMARK">Benchmark</option>
                </select>
              </div>
            </div>

            {/* Deposit Limits */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Min Deposit *</label>
                <input type="number" value={form.minDepositAmount || ''} onChange={(e) => set('minDepositAmount', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Max Deposit</label>
                <input type="number" value={form.maxDepositAmount || ''} onChange={(e) => set('maxDepositAmount', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Min Tenor (days)</label>
                <input type="number" value={form.minTenorDays ?? 30} onChange={(e) => set('minTenorDays', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Max Tenor (days)</label>
                <input type="number" value={form.maxTenorDays ?? 3650} onChange={(e) => set('maxTenorDays', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>

            {/* Rate */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Base Rate (%)</label>
                <input type="number" step="0.01" value={form.baseRate ?? ''} onChange={(e) => set('baseRate', Number(e.target.value) || undefined)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {form.rateStructure === 'BENCHMARK' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide">Benchmark Ref</label>
                    <input type="text" value={form.benchmarkReference ?? ''} onChange={(e) => set('benchmarkReference', e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide">Spread Over Benchmark (%)</label>
                    <input type="number" step="0.01" value={form.spreadOverBenchmark ?? ''} onChange={(e) => set('spreadOverBenchmark', Number(e.target.value) || undefined)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </>
              )}
            </div>

            {/* Tiered Rates */}
            {form.rateStructure === 'TIERED' && (
              <div className="space-y-2 p-4 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-semibold uppercase tracking-wide">Rate Tiers</h4>
                {tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input type="number" placeholder="Min Amount" value={tier.min_amount} onChange={(e) => setTiers((t) => t.map((x, j) => j === i ? { ...x, min_amount: Number(e.target.value) } : x))}
                      className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input type="number" placeholder="Max Amount" value={tier.max_amount} onChange={(e) => setTiers((t) => t.map((x, j) => j === i ? { ...x, max_amount: Number(e.target.value) } : x))}
                      className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <input type="number" step="0.01" placeholder="Rate %" value={tier.rate} onChange={(e) => setTiers((t) => t.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))}
                      className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <button onClick={() => setTiers((t) => t.filter((_, j) => j !== i))} disabled={tiers.length === 1}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30">✕</button>
                  </div>
                ))}
                <button onClick={() => setTiers((t) => [...t, { min_amount: 0, max_amount: 0, rate: 0 }])}
                  className="text-xs text-primary hover:underline">+ Add Tier</button>
              </div>
            )}

            {/* Rollover Policy */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Auto Rollover</label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.autoRolloverEnabled ?? false} onChange={(e) => set('autoRolloverEnabled', e.target.checked)} className="rounded" />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>
              {form.autoRolloverEnabled && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide">Rollover Tenor (days)</label>
                  <input type="number" value={form.rolloverTenorDays ?? ''} onChange={(e) => set('rolloverTenorDays', Number(e.target.value) || undefined)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Rollover Rate Type</label>
                <select value={form.rolloverRateType ?? 'PREVAILING'} onChange={(e) => set('rolloverRateType', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="PREVAILING">Prevailing</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Maturity Instruction</label>
                <select value={form.maturityInstruction ?? 'CREDIT_ACCOUNT'} onChange={(e) => set('maturityInstruction', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="CREDIT_ACCOUNT">Credit Account</option>
                  <option value="ROLLOVER">Rollover</option>
                  <option value="NOTIFY">Notify</option>
                </select>
              </div>
            </div>

            {/* Withdrawal Rules */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Early Withdrawal</label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.earlyWithdrawalAllowed ?? false} onChange={(e) => set('earlyWithdrawalAllowed', e.target.checked)} className="rounded" />
                  <span className="text-sm">Allowed</span>
                </label>
              </div>
              {form.earlyWithdrawalAllowed && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide">Penalty (%)</label>
                  <input type="number" step="0.01" value={form.earlyWithdrawalPenaltyPct ?? ''} onChange={(e) => set('earlyWithdrawalPenaltyPct', Number(e.target.value) || undefined)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Partial Withdrawal</label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.partialWithdrawalAllowed ?? false} onChange={(e) => set('partialWithdrawalAllowed', e.target.checked)} className="rounded" />
                  <span className="text-sm">Allowed</span>
                </label>
              </div>
              {form.partialWithdrawalAllowed && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide">Partial Min</label>
                  <input type="number" value={form.partialWithdrawalMin ?? ''} onChange={(e) => set('partialWithdrawalMin', Number(e.target.value) || undefined)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Effective From *</label>
                <input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Effective To</label>
                <input type="date" value={form.effectiveTo ?? ''} onChange={(e) => set('effectiveTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={createMutation.isPending || !form.customerId || !form.minDepositAmount}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Plus className="w-4 h-4" /> Create Framework
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Approve Dialog ───────────────────────────────────────────────────────────

function ApproveDialog({ agreement, onClose }: { agreement: TdFrameworkAgreement | null; onClose: () => void }) {
  const [approvedBy, setApprovedBy] = useState('');
  const approveMutation = useApproveTdFramework();

  if (!agreement) return null;

  const handleApprove = () => {
    approveMutation.mutate(
      { number: agreement.agreementNumber, approvedBy },
      {
        onSuccess: () => { toast.success('Framework approved'); onClose(); },
        onError: () => toast.error('Failed to approve'),
      },
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold">Approve {agreement.agreementNumber}</h3>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide">Approved By *</label>
            <input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Your name"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleApprove} disabled={!approvedBy.trim() || approveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {approveMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Rate Calculator Dialog ───────────────────────────────────────────────────

function RateCalcDialog({ agreement, onClose }: { agreement: TdFrameworkAgreement | null; onClose: () => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [tenorDays, setTenorDays] = useState<number>(90);
  const [result, setResult] = useState<RateCheckResult | null>(null);
  const checkRate = useCheckTdRate();

  if (!agreement) return null;

  const handleCheck = () => {
    checkRate.mutate(
      { number: agreement.agreementNumber, amount, tenorDays },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error('Rate check failed — check amount and tenor bounds'),
      },
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold">Rate Calculator — {agreement.agreementNumber}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Amount</label>
              <input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Tenor (days)</label>
              <input type="number" value={tenorDays} onChange={(e) => setTenorDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <button onClick={handleCheck} disabled={checkRate.isPending || !amount}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {checkRate.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Calculator className="w-4 h-4" /> Check Rate
          </button>
          {result && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Applicable Rate</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPercent(result.applicable_rate)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                For {formatMoney(result.amount, agreement.currency)} over {result.tenor_days} days
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Close</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function TdFrameworkListPage() {
  useEffect(() => { document.title = 'TD Frameworks | CBS'; }, []);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [approveTarget, setApproveTarget] = useState<TdFrameworkAgreement | null>(null);
  const [rateTarget, setRateTarget] = useState<TdFrameworkAgreement | null>(null);

  const { data: frameworks = [], isLoading } = useTdFrameworks();
  const { data: deposits = [] } = useLargeDeposits(0);

  const totalPrincipal = deposits.reduce((s, d) => s + (d.totalPrincipal ?? 0), 0);
  const active = frameworks.filter((f) => f.status === 'ACTIVE').length;
  const pending = frameworks.filter((f) => f.status === 'DRAFT' || f.status === 'PENDING_APPROVAL').length;

  const columns: ColumnDef<TdFrameworkAgreement>[] = [
    { accessorKey: 'agreementNumber', header: 'Agreement #', cell: ({ row }) => <code className="text-xs font-mono">{row.original.agreementNumber}</code> },
    { accessorKey: 'customerId', header: 'Customer ID' },
    { accessorKey: 'currency', header: 'Currency' },
    { accessorKey: 'rateStructure', header: 'Rate Structure' },
    { accessorKey: 'baseRate', header: 'Base Rate (%)', cell: ({ row }) => row.original.baseRate != null ? formatPercent(row.original.baseRate) : '—' },
    { accessorKey: 'minDepositAmount', header: 'Min Deposit', cell: ({ row }) => formatMoney(row.original.minDepositAmount, row.original.currency) },
    { accessorKey: 'maxDepositAmount', header: 'Max Deposit', cell: ({ row }) => row.original.maxDepositAmount ? formatMoney(row.original.maxDepositAmount, row.original.currency) : '—' },
    { accessorKey: 'minTenorDays', header: 'Min Tenor' },
    { accessorKey: 'maxTenorDays', header: 'Max Tenor' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
    { accessorKey: 'effectiveFrom', header: 'Effective From', cell: ({ row }) => formatDate(row.original.effectiveFrom) },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const f = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {(f.status === 'DRAFT' || f.status === 'PENDING_APPROVAL') && (
              <button onClick={() => setApproveTarget(f)} className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 transition-colors">
                Approve
              </button>
            )}
            {f.status === 'ACTIVE' && (
              <button onClick={() => setRateTarget(f)} className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 transition-colors">
                Check Rate
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Term Deposit Frameworks"
        subtitle="Manage TD framework agreements — rate structures, rollover policies, withdrawal rules"
        actions={
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Framework
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card"><div className="stat-label">Total Frameworks</div><div className="stat-value">{frameworks.length}</div></div>
          <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value text-green-600">{active}</div></div>
          <div className="stat-card"><div className="stat-label">Pending Approval</div><div className="stat-value text-amber-600">{pending}</div></div>
          <div className="stat-card"><div className="stat-label">Total Principal</div><div className="stat-value text-sm">{formatMoney(totalPrincipal, 'USD')}</div></div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={frameworks}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/agreements/td-frameworks/${row.agreementNumber}`)}
          enableGlobalFilter
          emptyMessage="No TD framework agreements found."
        />
      </div>

      <CreateDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <ApproveDialog agreement={approveTarget} onClose={() => setApproveTarget(null)} />
      <RateCalcDialog agreement={rateTarget} onClose={() => setRateTarget(null)} />
    </>
  );
}
