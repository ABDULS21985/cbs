import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Banknote, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { commissionsApi } from '../api/commissionApi';
import type { CommissionAgreement, CommissionPayout } from '../types/commission';
import type { ColumnDef } from '@tanstack/react-table';

const agreementSchema = z.object({
  agreementName: z.string().min(3),
  agreementType: z.enum(['FLAT', 'PERCENTAGE', 'TIERED']),
  partyName: z.string().min(2),
  partyId: z.string().min(1),
  commissionBasis: z.enum(['SALES_VALUE', 'TRANSACTION_COUNT', 'NEW_CUSTOMERS']),
  baseRatePct: z.number().min(0).max(100),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().min(1),
});
type AgreementFormData = z.infer<typeof agreementSchema>;

export function CommissionManagementPage() {
  useEffect(() => { document.title = 'Commissions | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'agreements' | 'payouts'>('agreements');
  const [showCreate, setShowCreate] = useState(false);

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['commissions', 'agreements'],
    queryFn: () => commissionsApi.getAllAgreements(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CommissionAgreement>) => commissionsApi.createAgreement(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commissions'] }); setShowCreate(false); toast.success('Agreement created'); },
    onError: () => toast.error('Failed to create agreement'),
  });
  const activateMutation = useMutation({
    mutationFn: (code: string) => commissionsApi.activateAgreement(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commissions'] }); toast.success('Agreement activated'); },
    onError: () => toast.error('Failed to activate'),
  });
  const calcPayoutMutation = useMutation({
    mutationFn: ({ code, params }: { code: string; params: { grossSales: number; qualifyingSales: number; period: string } }) =>
      commissionsApi.calculatePayout(code, params),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commissions'] }); toast.success('Payout calculated'); },
    onError: () => toast.error('Failed to calculate payout'),
  });

  const agreementCols = useMemo<ColumnDef<CommissionAgreement, unknown>[]>(() => [
    { accessorKey: 'partyName', header: 'Agent/Staff', cell: ({ row }) => <span className="text-sm font-medium">{row.original.partyName}</span> },
    { accessorKey: 'agreementName', header: 'Agreement', cell: ({ row }) => <span className="text-sm">{row.original.agreementName}</span> },
    { accessorKey: 'agreementType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{row.original.agreementType}</span> },
    { accessorKey: 'commissionBasis', header: 'Basis', cell: ({ row }) => <span className="text-sm">{row.original.commissionBasis}</span> },
    { accessorKey: 'baseRatePct', header: 'Rate %', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.baseRatePct}%</span> },
    { accessorKey: 'effectiveFrom', header: 'Effective', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.effectiveFrom)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.status === 'DRAFT' && <button onClick={() => activateMutation.mutate(row.original.agreementCode)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs" title="Activate"><CheckCircle className="w-4 h-4" /></button>}
        {row.original.status === 'ACTIVE' && <button onClick={() => calcPayoutMutation.mutate({ code: row.original.agreementCode, params: { grossSales: 0, qualifyingSales: 0, period: new Date().toISOString().slice(0, 7) } })} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs" title="Calculate Payout"><Banknote className="w-4 h-4" /></button>}
      </div>
    )},
  ], [activateMutation, calcPayoutMutation]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AgreementFormData>({ resolver: zodResolver(agreementSchema) });
  const onSubmit = (data: AgreementFormData) => createMutation.mutate(data);

  const tabs = [
    { key: 'agreements' as const, label: `Agreements (${agreements.length})` },
    { key: 'payouts' as const, label: 'Payout History' },
  ];

  return (
    <>
      <PageHeader title="Commission Management" subtitle="Manage commission agreements and payouts" actions={
        <button onClick={() => { reset(); setShowCreate(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Agreement</button>
      } />
      <div className="page-container space-y-6">
        <div className="flex border-b">
          {tabs.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t.label}</button>)}
        </div>
        {activeTab === 'agreements' ? (
          isLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={agreementCols} data={agreements} enableGlobalFilter emptyMessage="No commission agreements" pageSize={15} />
        ) : (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Payout history loaded from party queries</p>
            <p className="text-sm mt-1">Select a party in the agreements tab to view their payouts</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Commission Agreement</h2><button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Agreement Name *</label><input {...register('agreementName')} className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.agreementName && 'border-red-500')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Party Name *</label><input {...register('partyName')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Party ID *</label><input {...register('partyId')} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Type *</label><select {...register('agreementType')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="FLAT">Flat</option><option value="PERCENTAGE">Percentage</option><option value="TIERED">Tiered</option></select></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Basis *</label><select {...register('commissionBasis')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="SALES_VALUE">Sales Value</option><option value="TRANSACTION_COUNT">Transaction Count</option><option value="NEW_CUSTOMERS">New Customers</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Base Rate (%) *</label><input type="number" step="0.1" min="0" max="100" {...register('baseRatePct', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">From *</label><input type="date" {...register('effectiveFrom')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">To *</label><input type="date" {...register('effectiveTo')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{createMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="w-4 h-4" />}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
