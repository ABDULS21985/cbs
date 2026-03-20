import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, EmptyState, StatCard, TabsPage } from '@/components/shared';
import { FormSection } from '@/components/shared/FormSection';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Play, TrendingDown, ShoppingBag, XCircle, Loader2 } from 'lucide-react';
import { useLease, useLeaseAmortization } from '../hooks/useLeases';
import { useActivateLease, useDepreciateLease, useLeaseBuyout, useTerminateLease, useLeasedAssetByContract, useInspectLeasedAsset, useReturnLeasedAsset } from '../hooks/useLendingExt';
import { LeasedAssetCard } from '../components/leasing/LeasedAssetCard';
import { Ifrs16Panel } from '../components/leasing/Ifrs16Panel';
import { DepreciationChart } from '../components/leasing/DepreciationChart';
import { AssetReturnChecklist } from '../components/leasing/AssetReturnChecklist';
import type { AmortizationRow } from '../types/lease';
import type { LeasedAsset } from '../types/leasedAsset';

const amortCols: ColumnDef<AmortizationRow>[] = [
  { accessorKey: 'month', header: '#', cell: ({ row }) => <span className="font-semibold">{row.original.month}</span> },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'openingLiability', header: 'Opening', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.openingLiability)}</span> },
  { accessorKey: 'payment', header: 'Payment', cell: ({ row }) => <span className="font-mono text-sm font-semibold">{formatMoney(row.original.payment)}</span> },
  { accessorKey: 'interestCharge', header: 'Interest', cell: ({ row }) => <span className="font-mono text-sm text-amber-600">{formatMoney(row.original.interestCharge)}</span> },
  { accessorKey: 'principalRepayment', header: 'Principal', cell: ({ row }) => <span className="font-mono text-sm text-green-600">{formatMoney(row.original.principalRepayment)}</span> },
  { accessorKey: 'closingLiability', header: 'Closing', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.closingLiability)}</span> },
  { accessorKey: 'rouAsset', header: 'ROU', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.rouAsset)}</span> },
  { accessorKey: 'depreciation', header: 'Deprec.', cell: ({ row }) => <span className="font-mono text-sm text-red-600">{formatMoney(row.original.depreciation)}</span> },
];

const statusColor = (s: string) => s === 'ACTIVE' ? 'bg-green-100 text-green-800' : s === 'CLOSED' || s === 'TERMINATED' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800';
const COND_COLORS: Record<string, string> = { EXCELLENT: 'bg-green-100 text-green-700', GOOD: 'bg-blue-100 text-blue-700', FAIR: 'bg-amber-100 text-amber-700', POOR: 'bg-orange-100 text-orange-700', DAMAGED: 'bg-red-100 text-red-700' };

export default function LeaseDetailPage() {
  useEffect(() => { document.title = 'Lease Detail | CBS'; }, []);
  const { id } = useParams<{ id: string }>();
  const leaseId = Number(id);
  const [inspectTarget, setInspectTarget] = useState<LeasedAsset | null>(null);
  const [condition, setCondition] = useState('GOOD');
  const [nextDue, setNextDue] = useState('');

  const { data: lease, isLoading } = useLease(leaseId);
  const { data: amortization, isLoading: amortLoading } = useLeaseAmortization(leaseId);
  const { data: assets } = useLeasedAssetByContract(leaseId);
  const activateMut = useActivateLease();
  const depreciateMut = useDepreciateLease();
  const buyoutMut = useLeaseBuyout();
  const terminateMut = useTerminateLease();
  const inspectMut = useInspectLeasedAsset();
  const returnMut = useReturnLeasedAsset();

  if (isLoading) return <div className="p-6 space-y-4 animate-pulse"><div className="h-8 w-64 bg-muted rounded" /><div className="h-64 bg-muted rounded-lg" /></div>;
  if (!lease) return <EmptyState title="Lease not found" description="The requested lease could not be found." />;

  const ext = lease as any;
  const isDraft = lease.status === 'DRAFT';
  const isActive = lease.status === 'ACTIVE';
  const hasBuyout = (ext.purchaseOptionPrice ?? 0) > 0;
  const leasedAssets: LeasedAsset[] = Array.isArray(assets) ? assets : assets ? [assets] : [];
  const totalPay = (amortization ?? []).reduce((s, r) => s + r.payment, 0);
  const totalInt = (amortization ?? []).reduce((s, r) => s + r.interestCharge, 0);

  const handleInspect = () => {
    if (!inspectTarget) return;
    inspectMut.mutate({ code: inspectTarget.assetCode, data: { condition, nextInspectionDue: nextDue } as any }, {
      onSuccess: () => { toast.success('Inspection recorded'); setInspectTarget(null); },
      onError: () => toast.error('Failed'),
    });
  };

  const tabs = [
    {
      id: 'overview', label: 'Asset & IFRS 16',
      content: (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <LeasedAssetCard lease={lease} />
            <Ifrs16Panel lease={lease} amortization={amortization} />
            {ext.rouAssetAmount > 0 && (
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold">ROU & Liability</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">ROU Asset</span><span className="font-mono">{formatMoney(ext.rouAssetAmount, lease.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Accum. Depreciation</span><span className="font-mono text-red-600">−{formatMoney(ext.accumulatedDepreciation ?? 0, lease.currency)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Net Book Value</span><span className="font-mono">{formatMoney((ext.rouAssetAmount ?? 0) - (ext.accumulatedDepreciation ?? 0), lease.currency)}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${(ext.accumulatedDepreciation ?? 0) / (ext.rouAssetAmount || 1) * 100}%` }} /></div>
                  <div className="flex justify-between pt-1"><span className="text-muted-foreground">Lease Liability</span><span className="font-mono">{formatMoney(ext.leaseLiability ?? 0, lease.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Interest YTD</span><span className="font-mono">{formatMoney(ext.interestExpenseYtd ?? 0, lease.currency)}</span></div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <DepreciationChart data={amortization} currency={lease.currency} />
            <AssetReturnChecklist leaseId={leaseId} />
          </div>
        </div>
      ),
    },
    {
      id: 'amortization', label: 'Amortization',
      content: (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Payments" value={formatMoney(totalPay, lease.currency)} />
            <StatCard label="Total Interest" value={formatMoney(totalInt, lease.currency)} />
            <StatCard label="Total Principal" value={formatMoney(totalPay - totalInt, lease.currency)} />
            <StatCard label="Remaining" value={formatMoney(ext.currentBalance ?? 0, lease.currency)} />
          </div>
          <DataTable columns={amortCols} data={amortization ?? []} isLoading={amortLoading} emptyMessage="No schedule" pageSize={24}
            enableExport exportFilename={`lease-${lease.leaseNumber}-amortization`} />
        </div>
      ),
    },
    {
      id: 'assets', label: 'Asset Management', badge: leasedAssets.length || undefined,
      content: (
        <div className="p-6">
          {leasedAssets.length === 0 ? <EmptyState title="No tracked assets" description="No leased assets registered." /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leasedAssets.map((a) => {
                const overdue = a.nextInspectionDue && new Date(a.nextInspectionDue) < new Date();
                return (
                  <div key={a.id} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div><code className="text-[10px] font-mono text-muted-foreground">{a.assetCode}</code><p className="text-sm font-semibold">{a.description}</p><p className="text-xs text-muted-foreground">{a.manufacturer} {a.model}</p></div>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', COND_COLORS[a.condition] ?? 'bg-muted')}>{a.condition}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Cost:</span> <span className="font-mono">{formatMoney(a.originalCost)}</span></div>
                      <div><span className="text-muted-foreground">Book:</span> <span className="font-mono">{formatMoney(a.currentBookValue)}</span></div>
                      <div><span className="text-muted-foreground">Last Inspect:</span> {a.lastInspectionDate ? formatDate(a.lastInspectionDate) : '—'}</div>
                      <div className={overdue ? 'text-red-600 font-medium' : ''}><span className="text-muted-foreground">Next:</span> {a.nextInspectionDue ? formatDate(a.nextInspectionDue) : '—'}{overdue ? ' (overdue)' : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setInspectTarget(a)} className="flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">Inspect</button>
                      <button onClick={() => returnMut.mutate({ code: a.assetCode, returnCondition: a.condition }, { onSuccess: () => toast.success('Returned'), onError: () => toast.error('Failed') })}
                        className="flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium text-red-600 hover:bg-red-50">Return</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'depreciation', label: 'Depreciation',
      content: (
        <div className="p-6 space-y-6">
          <DepreciationChart data={amortization} currency={lease.currency} />
          <FormSection title="Depreciation Details">
            <InfoGrid columns={3} items={[
              { label: 'Method', value: ext.depreciationMethod ?? '—' },
              { label: 'Monthly', value: formatMoney(lease.monthlyDepreciation ?? 0, lease.currency) },
              { label: 'Residual', value: formatMoney(ext.residualValue ?? 0, lease.currency) },
              { label: 'Useful Life', value: ext.usefulLifeMonths ? `${ext.usefulLifeMonths}mo` : '—' },
            ]} />
            {ext.usefulLifeMonths && (
              <div className="mt-3 space-y-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${((ext.termMonths - (ext.remainingMonths ?? 0)) / ext.usefulLifeMonths) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-right">{ext.termMonths - (ext.remainingMonths ?? 0)}/{ext.usefulLifeMonths} months</p>
              </div>
            )}
          </FormSection>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={ext.leaseNumber ?? lease.leaseNumber} subtitle={`${lease.customerName} — ${lease.assetDescription}`} backTo="/lending/leases"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && <button onClick={() => activateMut.mutate(ext.leaseNumber ?? lease.leaseNumber, { onSuccess: () => toast.success('Activated'), onError: () => toast.error('Failed') })}
              disabled={activateMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {activateMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}<Play className="w-3.5 h-3.5" /> Activate</button>}
            {isActive && <button onClick={() => depreciateMut.mutate(ext.leaseNumber ?? lease.leaseNumber, { onSuccess: () => toast.success('Recorded'), onError: () => toast.error('Failed') })}
              disabled={depreciateMut.isPending} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50"><TrendingDown className="w-3.5 h-3.5 inline mr-1" />Depreciate</button>}
            {isActive && hasBuyout && <button onClick={() => buyoutMut.mutate(ext.leaseNumber ?? lease.leaseNumber, { onSuccess: () => toast.success('Purchased'), onError: () => toast.error('Failed') })}
              disabled={buyoutMut.isPending} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"><ShoppingBag className="w-3.5 h-3.5 inline mr-1" />Buyout ({formatMoney(ext.purchaseOptionPrice, lease.currency)})</button>}
            {isActive && <button onClick={() => terminateMut.mutate(ext.leaseNumber ?? lease.leaseNumber, { onSuccess: () => toast.success('Terminated'), onError: () => toast.error('Failed') })}
              disabled={terminateMut.isPending} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"><XCircle className="w-3.5 h-3.5 inline mr-1" />Terminate</button>}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor(lease.status)}`}>{lease.status}</span>
          </div>
        }
      />
      <div className="border rounded-lg mx-6 overflow-hidden bg-card"><TabsPage tabs={tabs} syncWithUrl /></div>

      {inspectTarget && (
        <><div className="fixed inset-0 bg-black/50 z-50" onClick={() => setInspectTarget(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Inspect {inspectTarget.assetCode}</h3>
              <div><label className="text-xs font-medium text-muted-foreground">Condition</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                  {['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Next Due</label>
                <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setInspectTarget(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleInspect} disabled={inspectMut.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Record</button>
              </div>
            </div>
          </div></>
      )}
    </div>
  );
}
