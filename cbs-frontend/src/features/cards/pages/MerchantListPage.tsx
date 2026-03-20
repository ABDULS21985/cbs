import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { Plus, Store, TrendingUp, AlertTriangle, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { toast } from 'sonner';
import { useMerchants } from '../hooks/useCardData';
import { cardApi } from '../api/cardApi';
import type { ColumnDef } from '@tanstack/react-table';
import type { Merchant } from '../types/card';
import { cn } from '@/lib/utils';

// ─── Onboard Merchant Form ──────────────────────────────────────────────────

function OnboardMerchantForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    mcc: '',
    settlementAccount: '',
    mdrRate: 1.5,
    contactEmail: '',
    address: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    cardApi.onboardMerchant({
      merchantName: form.businessName,
      mcc: form.mcc,
      settlementAccount: form.settlementAccount,
      mdrRate: form.mdrRate,
      email: form.contactEmail,
      address: form.address,
    }).then(() => {
      toast.success('Merchant onboarded successfully');
      qc.invalidateQueries({ queryKey: ['merchants'] });
      onClose();
    }).catch(() => {
      toast.error('Failed to onboard merchant');
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Onboard New Merchant</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Business Name</label>
            <input className="w-full mt-1 input" placeholder="Business name" value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">MCC Code</label>
              <input className="w-full mt-1 input" placeholder="e.g. 5411" value={form.mcc} onChange={(e) => setForm((f) => ({ ...f, mcc: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">MDR Rate (%)</label>
              <input type="number" className="w-full mt-1 input" value={form.mdrRate} onChange={(e) => setForm((f) => ({ ...f, mdrRate: parseFloat(e.target.value) || 0 }))} required min={0} step="0.01" max={10} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Settlement Account</label>
            <input className="w-full mt-1 input" placeholder="Account number" value={form.settlementAccount} onChange={(e) => setForm((f) => ({ ...f, settlementAccount: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
            <input type="email" className="w-full mt-1 input" placeholder="merchant@example.com" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <input className="w-full mt-1 input" placeholder="Business address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Onboarding...' : 'Onboard Merchant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const riskColors: Record<string, string> = { LOW: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600', PROHIBITED: 'text-red-800' };

const columns: ColumnDef<Merchant, any>[] = [
  { accessorKey: 'merchantId', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.merchantId}</span> },
  { accessorKey: 'merchantName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.merchantName}</span> },
  { accessorKey: 'mccDescription', header: 'MCC' },
  { accessorKey: 'terminalCount', header: 'Terminals', cell: ({ row }) => row.original.terminalCount.toLocaleString() },
  { accessorKey: 'monthlyVolume', header: 'Monthly Vol.', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.monthlyVolume)}</span> },
  { accessorKey: 'mdrRate', header: 'MDR', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.mdrRate)}</span> },
  { accessorKey: 'chargebackRate', header: 'CB %', cell: ({ row }) => <span className={cn('font-mono text-sm', row.original.chargebackRate > 1 ? 'text-red-600 font-bold' : '')}>{formatPercent(row.original.chargebackRate)}</span> },
  { accessorKey: 'riskCategory', header: 'Risk', cell: ({ row }) => <span className={cn('text-xs font-bold', riskColors[row.original.riskCategory])}>{row.original.riskCategory}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function MerchantListPage() {
  useEffect(() => { document.title = 'Merchant Management | CBS'; }, []);
  const navigate = useNavigate();
  const [showOnboard, setShowOnboard] = useState(false);
  const { data: merchants = [], isLoading, isError, refetch } = useMerchants();

  const totalVolume = merchants.reduce((s, m) => s + m.monthlyVolume, 0);
  const mdrRevenue = merchants.reduce((s, m) => s + m.monthlyVolume * m.mdrRate / 100, 0);

  return (
    <>
      {showOnboard && <OnboardMerchantForm onClose={() => setShowOnboard(false)} />}

      <PageHeader title="Merchant Management" actions={
        <button onClick={() => setShowOnboard(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Onboard Merchant
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Merchants" value={merchants.filter((m) => m.status === 'ACTIVE').length} format="number" icon={Store} />
          <StatCard label="Monthly Volume" value={totalVolume} format="money" compact icon={TrendingUp} />
          <StatCard label="MDR Revenue" value={mdrRevenue} format="money" compact />
          <StatCard label="High Risk" value={merchants.filter((m) => m.riskCategory === 'HIGH').length} format="number" icon={AlertTriangle} />
        </div>
        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm">Failed to load merchants.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading merchants…
          </div>
        ) : merchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Store className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No merchants found.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={merchants} enableGlobalFilter enableExport exportFilename="merchants" onRowClick={(row) => navigate(`/cards/merchants/${row.id}`)} />
        )}
      </div>
    </>
  );
}
