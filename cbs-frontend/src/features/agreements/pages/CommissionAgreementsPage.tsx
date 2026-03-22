import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Calculator, Check, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { PayoutBreakdownCard } from '../components/PayoutBreakdownCard';
import {
  useCommissionAgreements,
  usePartyPayouts,
  useCreateCommissionAgreement,
  useActivateCommissionAgreement,
  useCalculatePayout,
  useApprovePayout,
} from '../hooks/useAgreementsExt';
import { useHasRole } from '@/hooks/usePermission';
import type { CommissionAgreement, CommissionPayout, CreateCommissionAgreementPayload } from '../types/agreementExt';

// ── Create Agreement Dialog ──────────────────────────────────────────────────

function CreateAgreementDialog({ onClose }: { onClose: () => void }) {
  const createMut = useCreateCommissionAgreement();
  const [form, setForm] = useState({
    agreementName: '',
    agreementType: 'SALES_OFFICER',
    partyId: '',
    partyName: '',
    commissionBasis: 'PERCENTAGE',
    baseRatePct: 5,
    applicableProducts: '',
    minPayout: 0,
    maxPayoutMonthly: 0,
    maxPayoutAnnual: 0,
    clawbackPeriodDays: 90,
    effectiveFrom: '',
    effectiveTo: '',
  });

  const handleSubmit = () => {
    if (!form.agreementName || !form.partyId || !form.effectiveFrom) {
      toast.error('Please fill all required fields');
      return;
    }
    createMut.mutate(
      {
        agreementName: form.agreementName,
        agreementType: form.agreementType,
        partyId: form.partyId,
        partyName: form.partyName,
        commissionBasis: form.commissionBasis,
        baseRatePct: form.baseRatePct,
        applicableProducts: form.applicableProducts.split(',').map((s) => s.trim()).filter(Boolean),
        minPayout: form.minPayout,
        maxPayoutMonthly: form.maxPayoutMonthly,
        maxPayoutAnnual: form.maxPayoutAnnual,
        clawbackPeriodDays: form.clawbackPeriodDays,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || '',
      } as CreateCommissionAgreementPayload,
      {
        onSuccess: () => {
          toast.success('Commission agreement created');
          onClose();
        },
        onError: () => toast.error('Failed to create agreement'),
      },
    );
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';
  const labelCls = 'block text-sm font-medium mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background">
          <h2 className="text-base font-semibold">New Commission Agreement</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Agreement Name <span className="text-red-500">*</span></label>
            <input value={form.agreementName} onChange={(e) => setForm({ ...form, agreementName: e.target.value })} placeholder="e.g. Agent Commission Q1" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.agreementType} onChange={(e) => setForm({ ...form, agreementType: e.target.value })} className={inputCls}>
                <option value="SALES_OFFICER">Sales Officer</option>
                <option value="AGENT_BANKING">Agent Banking</option>
                <option value="REFERRAL">Referral</option>
                <option value="PARTNER">Partner</option>
                <option value="BROKER">Broker</option>
                <option value="INSURANCE_AGENT">Insurance Agent</option>
                <option value="MERCHANT">Merchant</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Commission Basis</label>
              <select value={form.commissionBasis} onChange={(e) => setForm({ ...form, commissionBasis: e.target.value })} className={inputCls}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT_PER_UNIT">Flat Per Unit</option>
                <option value="TIERED">Tiered</option>
                <option value="MILESTONE">Milestone</option>
                <option value="REVENUE_SHARE">Revenue Share</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Party ID <span className="text-red-500">*</span></label>
              <input value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })} placeholder="e.g. AGT-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Party Name</label>
              <input value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} placeholder="Agent name" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Base Rate (%)</label>
            <div className="relative">
              <input type="number" step="0.01" min="0" max="100" value={form.baseRatePct} onChange={(e) => setForm({ ...form, baseRatePct: Number(e.target.value) })} className={cn(inputCls, 'pr-8')} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Applicable Products (comma-separated)</label>
            <input value={form.applicableProducts} onChange={(e) => setForm({ ...form, applicableProducts: e.target.value })} placeholder="SAV-001, CUR-002" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MoneyInput label="Min Payout" value={form.minPayout} onChange={(v) => setForm({ ...form, minPayout: v })} currency="NGN" />
            <MoneyInput label="Max Monthly" value={form.maxPayoutMonthly} onChange={(v) => setForm({ ...form, maxPayoutMonthly: v })} currency="NGN" />
            <MoneyInput label="Max Annual" value={form.maxPayoutAnnual} onChange={(v) => setForm({ ...form, maxPayoutAnnual: v })} currency="NGN" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Clawback Days</label>
              <input type="number" min="0" value={form.clawbackPeriodDays} onChange={(e) => setForm({ ...form, clawbackPeriodDays: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Effective From <span className="text-red-500">*</span></label>
              <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Effective To</label>
              <input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={createMut.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {createMut.isPending ? 'Creating...' : 'Create Agreement'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calculate Payout Dialog ──────────────────────────────────────────────────

function CalculatePayoutDialog({ agreement, onClose }: { agreement: CommissionAgreement; onClose: () => void }) {
  const calcMut = useCalculatePayout();
  const approveMut = useApprovePayout();
  const [grossSales, setGrossSales] = useState(0);
  const [qualifyingSales, setQualifyingSales] = useState(0);
  const [period, setPeriod] = useState('');
  const [result, setResult] = useState<CommissionPayout | null>(null);

  const handleCalculate = () => {
    if (!grossSales || !qualifyingSales || !period) {
      toast.error('Please fill all fields');
      return;
    }
    calcMut.mutate(
      { code: agreement.agreementCode, params: { grossSales, qualifyingSales, period } },
      {
        onSuccess: (payout) => {
          toast.success('Payout calculated');
          setResult(payout);
        },
        onError: () => toast.error('Failed to calculate payout'),
      },
    );
  };

  const handleApprove = () => {
    if (!result) return;
    approveMut.mutate(result.payoutCode, {
      onSuccess: () => {
        toast.success('Payout approved');
        onClose();
      },
      onError: () => toast.error('Failed to approve payout'),
    });
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold">Calculate Payout</h2>
            <p className="text-xs text-muted-foreground font-mono">{agreement.agreementCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <MoneyInput label="Gross Sales" value={grossSales} onChange={setGrossSales} currency="NGN" />
              <MoneyInput label="Qualifying Sales" value={qualifyingSales} onChange={setQualifyingSales} currency="NGN" />
              <div>
                <label className="block text-sm font-medium mb-1">Period</label>
                <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. 2025-Q1 or 2025-01" className={inputCls} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCalculate} disabled={calcMut.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <Calculator className="w-4 h-4" />
                  {calcMut.isPending ? 'Calculating...' : 'Calculate'}
                </button>
              </div>
            </>
          ) : (
            <>
              <PayoutBreakdownCard payout={result} />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Close</button>
                {result.status === 'CALCULATED' && (
                  <button onClick={handleApprove} disabled={approveMut.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                    <Check className="w-4 h-4" />
                    {approveMut.isPending ? 'Approving...' : 'Approve Payout'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function CommissionAgreementsPage() {
  const navigate = useNavigate();
  const isAdmin = useHasRole('CBS_ADMIN');
  const { data: agreements = [], isLoading } = useCommissionAgreements();
  const activateMut = useActivateCommissionAgreement();
  const approveMut = useApprovePayout();

  const [showCreate, setShowCreate] = useState(false);
  const [calcTarget, setCalcTarget] = useState<CommissionAgreement | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'agreements' | 'payouts'>('agreements');
  const [partySearch, setPartySearch] = useState('');
  const [searchedParty, setSearchedParty] = useState('');

  const { data: payouts = [], isLoading: payoutsLoading } = usePartyPayouts(searchedParty);

  const filteredAgreements = useMemo(() => {
    if (!statusFilter) return agreements;
    return agreements.filter((a) => a.status === statusFilter);
  }, [agreements, statusFilter]);

  // Stats
  const totalAgreements = agreements.length;
  const activeAgreements = agreements.filter((a) => a.status === 'ACTIVE').length;
  const uniqueParties = new Set(agreements.map((a) => a.partyId)).size;
  const pendingPayouts = payouts.filter((p) => p.status === 'CALCULATED').length;

  const agreementColumns: ColumnDef<CommissionAgreement>[] = [
    { accessorKey: 'agreementCode', header: 'Code', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'agreementName', header: 'Name' },
    { accessorKey: 'partyName', header: 'Party Name' },
    { accessorKey: 'partyId', header: 'Party ID', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'agreementType', header: 'Type' },
    { accessorKey: 'commissionBasis', header: 'Basis' },
    { accessorKey: 'baseRatePct', header: 'Rate %', cell: ({ getValue }) => <span className="tabular-nums">{formatPercent(getValue<number>())}</span> },
    { accessorKey: 'minPayout', header: 'Min Payout', cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue<number>() || 0, 'NGN')}</span> },
    { accessorKey: 'maxPayoutMonthly', header: 'Max Monthly', cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue<number>() || 0, 'NGN')}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
    { accessorKey: 'effectiveFrom', header: 'Effective From', cell: ({ getValue }) => getValue<string>() ? formatDate(getValue<string>()) : '—' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {a.status === 'DRAFT' && isAdmin && (
              <button
                onClick={() => activateMut.mutate(a.agreementCode, { onSuccess: () => toast.success('Agreement activated') })}
                className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
              >
                Activate
              </button>
            )}
            {a.status === 'ACTIVE' && isAdmin && (
              <button
                onClick={() => setCalcTarget(a)}
                className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              >
                Calc Payout
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const payoutColumns: ColumnDef<CommissionPayout>[] = [
    { accessorKey: 'payoutCode', header: 'Code', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'partyName', header: 'Party' },
    { accessorKey: 'payoutPeriod', header: 'Period' },
    { accessorKey: 'periodStart', header: 'Start', cell: ({ getValue }) => getValue<string>() ? formatDate(getValue<string>()) : '—' },
    { accessorKey: 'periodEnd', header: 'End', cell: ({ getValue }) => getValue<string>() ? formatDate(getValue<string>()) : '—' },
    { accessorKey: 'grossSales', header: 'Gross Sales', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.grossSales, row.original.currency || 'NGN')}</span> },
    { accessorKey: 'qualifyingSales', header: 'Qualifying', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.qualifyingSales, row.original.currency || 'NGN')}</span> },
    { accessorKey: 'commissionRateApplied', header: 'Rate', cell: ({ getValue }) => <span className="tabular-nums">{formatPercent(getValue<number>())}</span> },
    { accessorKey: 'grossCommission', header: 'Gross Comm.', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.grossCommission, row.original.currency || 'NGN')}</span> },
    { accessorKey: 'taxAmount', header: 'Tax', cell: ({ row }) => <span className="tabular-nums text-amber-600">{formatMoney(row.original.taxAmount, row.original.currency || 'NGN')}</span> },
    {
      accessorKey: 'netCommission',
      header: 'Net Commission',
      cell: ({ row }) => (
        <span className={cn('tabular-nums font-bold', row.original.netCommission > 0 ? 'text-green-700' : 'text-red-600')}>
          {formatMoney(row.original.netCommission, row.original.currency || 'NGN')}
        </span>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const p = row.original;
        if (p.status !== 'CALCULATED' || !isAdmin) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              approveMut.mutate(p.payoutCode, { onSuccess: () => toast.success('Payout approved') });
            }}
            className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
          >
            Approve
          </button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Commission Management"
        subtitle="Manage commission agreements, calculate and approve payouts"
        actions={isAdmin ? (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Agreement
          </button>
        ) : undefined}
      />

      <div className="page-container space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Agreements</div>
            <div className="stat-value">{totalAgreements}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Agreements</div>
            <div className="stat-value text-green-700">{activeAgreements}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Parties</div>
            <div className="stat-value">{uniqueParties}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Payouts</div>
            <div className="stat-value text-amber-700">{pendingPayouts}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {(['agreements', 'payouts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize',
                  activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Agreements Tab */}
        {activeTab === 'agreements' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <DataTable
              columns={agreementColumns}
              data={filteredAgreements}
              isLoading={isLoading}
              enableGlobalFilter
              onRowClick={(row) => navigate(`/agreements/commissions/${row.agreementCode}`)}
            />
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter Party ID..."
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSearchedParty(partySearch); }}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => setSearchedParty(partySearch)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>
            {searchedParty ? (
              <DataTable
                columns={payoutColumns}
                data={payouts}
                isLoading={payoutsLoading}
                enableGlobalFilter
                emptyMessage={`No payouts found for party "${searchedParty}"`}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Enter a Party ID to view payouts</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && <CreateAgreementDialog onClose={() => setShowCreate(false)} />}
      {calcTarget && <CalculatePayoutDialog agreement={calcTarget} onClose={() => setCalcTarget(null)} />}
    </>
  );
}
