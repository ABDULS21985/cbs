import { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, X, Loader2, CreditCard, Users, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, EmptyState } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useInterbankRelationships, useCreateInterbankRelationship } from '../hooks/useInvestments';
import type { InterbankRelationship } from '../types/interbank';

const TYPE_COLORS: Record<string, string> = {
  CORRESPONDENT: 'bg-blue-100 text-blue-700',
  CREDIT_LINE: 'bg-green-100 text-green-700',
  NOSTRO_VOSTRO: 'bg-purple-100 text-purple-700',
  SWAP: 'bg-amber-100 text-amber-700',
  SETTLEMENT: 'bg-teal-100 text-teal-700',
};

const TYPES = ['CORRESPONDENT', 'CREDIT_LINE', 'NOSTRO_VOSTRO', 'SWAP', 'SETTLEMENT'];

function CreateDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateInterbankRelationship();
  const fc = 'w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';
  const [form, setForm] = useState({
    bankName: '', bicCode: '', relationshipType: 'CORRESPONDENT',
    creditLineAmount: 0, agreementDate: new Date().toISOString().split('T')[0], reviewDate: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">New Interbank Relationship</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Counterparty Bank *</label><input className={cn(fc, 'mt-1')} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">BIC Code *</label><input className={cn(fc, 'mt-1 font-mono uppercase')} maxLength={11} value={form.bicCode} onChange={(e) => setForm((f) => ({ ...f, bicCode: e.target.value.toUpperCase() }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Type</label>
              <select className={cn(fc, 'mt-1')} value={form.relationshipType} onChange={(e) => setForm((f) => ({ ...f, relationshipType: e.target.value }))}>
                {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Credit Line Amount</label>
              <input type="number" className={cn(fc, 'mt-1')} value={form.creditLineAmount || ''} onChange={(e) => setForm((f) => ({ ...f, creditLineAmount: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Agreement Date</label><input type="date" className={cn(fc, 'mt-1')} value={form.agreementDate} onChange={(e) => setForm((f) => ({ ...f, agreementDate: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Review Date</label><input type="date" className={cn(fc, 'mt-1')} value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => create.mutate(form as Partial<InterbankRelationship>, {
              onSuccess: () => { toast.success('Relationship created'); onClose(); },
              onError: () => toast.error('Failed'),
            })} disabled={!form.bankName || !form.bicCode || create.isPending} className="btn-primary flex items-center gap-2">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InterbankPage() {
  useEffect(() => { document.title = 'Interbank Relationships | CBS'; }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const { data: relationships = [], isLoading } = useInterbankRelationships();
  const filtered = typeFilter ? relationships.filter((r) => r.relationshipType === typeFilter) : relationships;

  const totalCreditLines = relationships.filter((r) => r.creditLineAmount > 0).reduce((s, r) => s + r.creditLineAmount, 0);
  const totalUsed = relationships.reduce((s, r) => s + r.creditLineUsed, 0);
  const utilization = totalCreditLines > 0 ? (totalUsed / totalCreditLines) * 100 : 0;
  const activeCorrespondents = relationships.filter((r) => r.relationshipType === 'CORRESPONDENT' && r.status === 'ACTIVE').length;

  const columns: ColumnDef<InterbankRelationship, unknown>[] = [
    { accessorKey: 'relationshipCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.relationshipCode}</span> },
    { accessorKey: 'bankName', header: 'Counterparty', cell: ({ row }) => <span className="font-semibold text-sm">{row.original.bankName}</span> },
    { accessorKey: 'bicCode', header: 'BIC', cell: ({ row }) => <span className="font-mono text-xs">{row.original.bicCode}</span> },
    {
      accessorKey: 'relationshipType', header: 'Type',
      cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', TYPE_COLORS[row.original.relationshipType] ?? 'bg-gray-100')}>{row.original.relationshipType.replace(/_/g, ' ')}</span>,
    },
    { accessorKey: 'creditLineAmount', header: 'Credit Line', cell: ({ row }) => <span className="font-mono text-xs">{row.original.creditLineAmount > 0 ? formatMoney(row.original.creditLineAmount) : '—'}</span> },
    { accessorKey: 'creditLineUsed', header: 'Used', cell: ({ row }) => <span className="font-mono text-xs">{row.original.creditLineUsed > 0 ? formatMoney(row.original.creditLineUsed) : '—'}</span> },
    {
      id: 'available', header: 'Available',
      cell: ({ row }) => {
        const avail = row.original.creditLineAmount - row.original.creditLineUsed;
        return <span className={cn('font-mono text-xs font-medium', avail < 0 ? 'text-red-600' : 'text-green-600')}>{avail > 0 ? formatMoney(avail) : '—'}</span>;
      },
    },
    { accessorKey: 'agreementDate', header: 'Agreement', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.agreementDate)}</span> },
    {
      accessorKey: 'reviewDate', header: 'Review',
      cell: ({ row }) => {
        const overdue = row.original.reviewDate && new Date(row.original.reviewDate) < new Date();
        return <span className={cn('text-xs', overdue ? 'text-red-600 font-medium' : '')}>{row.original.reviewDate ? formatDate(row.original.reviewDate) : '—'}</span>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  return (
    <>
      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} />}

      <PageHeader title="Interbank Relationships" subtitle="Manage correspondent banking, credit lines, and counterparty exposures"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> New Relationship</button>}
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Relationships" value={relationships.length} format="number" icon={Building2} loading={isLoading} />
          <StatCard label="Total Credit Lines" value={totalCreditLines} format="money" compact icon={CreditCard} loading={isLoading} />
          <StatCard label="Line Utilization" value={utilization} format="percent" icon={TrendingUp} loading={isLoading} />
          <StatCard label="Active Correspondents" value={activeCorrespondents} format="number" icon={Users} loading={isLoading} />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTypeFilter('')} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border', !typeFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>All</button>
          {TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border', typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <DataTable columns={columns} data={filtered} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="interbank-relationships" emptyMessage="No interbank relationships found" />
      </div>
    </>
  );
}
