import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, CheckCircle, Users, DollarSign, X, Plus,
  ArrowRight, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, InfoGrid, DataTable, EmptyState } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  usePlacementDetail,
  useClosePlacement,
  useRecordFunding,
} from '../hooks/useCapitalMarkets';
import { capitalMarketsApi, type PlacementInvestor, type InvestorInput } from '../api/capitalMarketsApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function PlacementDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { document.title = `Placement ${code} | CBS`; }, [code]);

  const { data: placement, isLoading } = usePlacementDetail(code);
  const closePlacement = useClosePlacement();
  const recordFunding = useRecordFunding();
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [investorForm, setInvestorForm] = useState<InvestorInput>({ name: '', bidAmount: 0 });

  const addInvestorMut = useMutation({
    mutationFn: (input: InvestorInput) => capitalMarketsApi.addPlacementInvestor(code, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['private-placements', code] });
      toast.success('Investor added');
      setShowAddInvestor(false);
      setInvestorForm({ name: '', bidAmount: 0 });
    },
    onError: () => toast.error('Failed to add investor'),
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/capital-markets" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!placement) {
    return (
      <>
        <PageHeader title="Placement Not Found" backTo="/capital-markets" />
        <div className="page-container">
          <EmptyState title="Placement not found" description={`No placement found with code "${code}".`} />
        </div>
      </>
    );
  }

  const investors = placement.investors ?? [];
  const totalCommitted = investors.reduce((s, inv) => s + inv.committedAmount, 0);
  const totalFunded = placement.totalFunded ?? investors.filter((i) => i.status === 'FUNDED').reduce((s, i) => s + (i.fundedAmount ?? 0), 0);
  const fundingPct = placement.targetAmount > 0 ? (totalFunded / placement.targetAmount) * 100 : 0;

  const investorCols: ColumnDef<PlacementInvestor, unknown>[] = [
    { accessorKey: 'name', header: 'Investor', cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span> },
    { accessorKey: 'committedAmount', header: 'Committed', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.committedAmount, placement.currency)}</span> },
    { accessorKey: 'fundedAmount', header: 'Funded', cell: ({ row }) => <span className="font-mono text-sm">{row.original.fundedAmount != null ? formatMoney(row.original.fundedAmount, placement.currency) : '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'fundedAt', header: 'Funded Date', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.fundedAt ? formatDate(row.original.fundedAt) : '—'}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => row.original.status === 'COMMITTED' ? (
        <button
          onClick={() => recordFunding.mutate({ code, investorId: row.original.id, input: { amount: row.original.committedAmount } }, {
            onSuccess: () => toast.success('Funding recorded'),
            onError: () => toast.error('Failed'),
          })}
          disabled={recordFunding.isPending}
          className="text-xs text-primary hover:underline font-medium"
        >
          Record Funding
        </button>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={`${placement.issuer} — ${placement.instrumentType}`}
        subtitle={`${placement.code} — ${placement.status}`}
        backTo="/capital-markets"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddInvestor(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              <Plus className="w-4 h-4" /> Add Investor
            </button>
            {placement.status !== 'CLOSED' && (
              <button
                onClick={() => closePlacement.mutate(code, { onSuccess: () => toast.success('Placement closed') })}
                disabled={closePlacement.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Close Placement
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Summary */}
        <div className="rounded-xl border bg-card p-6">
          <InfoGrid columns={4} items={[
            { label: 'Issuer', value: placement.issuer },
            { label: 'Instrument', value: placement.instrumentType },
            { label: 'Target Amount', value: formatMoney(placement.targetAmount, placement.currency) },
            { label: 'Currency', value: placement.currency },
            { label: 'Status', value: placement.status },
            { label: 'Total Funded', value: formatMoney(totalFunded, placement.currency) },
            { label: 'Investors', value: String(investors.length) },
            { label: 'Created', value: formatDate(placement.createdAt) },
          ]} />

          {/* Funding progress */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Funding Progress</span>
              <span className="font-mono font-bold">{fundingPct.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', fundingPct >= 100 ? 'bg-green-500' : fundingPct >= 50 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${Math.min(fundingPct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatMoney(totalFunded, placement.currency)} funded</span>
              <span>{formatMoney(placement.targetAmount, placement.currency)} target</span>
            </div>
          </div>
        </div>

        {/* Investors table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Investors ({investors.length})</h3>
            <div className="text-xs text-muted-foreground">
              Committed: <span className="font-mono font-medium text-foreground">{formatMoney(totalCommitted, placement.currency)}</span>
            </div>
          </div>
          <div className="p-4">
            <DataTable columns={investorCols} data={investors} enableGlobalFilter emptyMessage="No investors added yet" />
          </div>
        </div>
      </div>

      {/* Add Investor Dialog */}
      {showAddInvestor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddInvestor(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Add Investor</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Investor Name *</label>
                  <input className="w-full mt-1 input" value={investorForm.name} onChange={(e) => setInvestorForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Committed Amount *</label>
                  <input type="number" className="w-full mt-1 input" value={investorForm.bidAmount || ''} onChange={(e) => setInvestorForm((f) => ({ ...f, bidAmount: parseFloat(e.target.value) || 0 }))} min={0} />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAddInvestor(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => addInvestorMut.mutate(investorForm)} disabled={!investorForm.name || !investorForm.bidAmount || addInvestorMut.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {addInvestorMut.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
