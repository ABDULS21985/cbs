import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Tag, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { pricingApi } from '../api/pricingApi';
import type { DiscountScheme, SpecialPricingAgreement } from '../types/pricing';
import type { ColumnDef } from '@tanstack/react-table';

const discountSchema = z.object({
  schemeName: z.string().min(3),
  schemeType: z.enum(['VOLUME', 'RELATIONSHIP', 'LOYALTY', 'PROMOTIONAL', 'BUNDLED']),
  discountBasis: z.enum(['PERCENTAGE', 'FLAT_AMOUNT', 'RATE_REDUCTION']),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().nonnegative().optional(),
  maxTotalBudget: z.number().positive().optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().min(1),
});
type DiscountFormData = z.infer<typeof discountSchema>;

const spaSchema = z.object({
  customerId: z.number().positive(),
  customerName: z.string().min(2),
  agreementType: z.enum(['FEE_WAIVER', 'RATE_OVERRIDE', 'MARGIN_OVERRIDE', 'BUNDLE']),
  conditions: z.string().min(1),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().min(1),
});
type SpaFormData = z.infer<typeof spaSchema>;

export function PricingManagementPage() {
  useEffect(() => { document.title = 'Pricing | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'discounts' | 'special'>('discounts');
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [showSpaForm, setShowSpaForm] = useState(false);

  const { data: discounts = [], isLoading: discountsLoading } = useQuery({
    queryKey: ['pricing', 'discounts'],
    queryFn: () => pricingApi.getAllDiscounts(),
  });
  const { data: agreements = [], isLoading: spaLoading } = useQuery({
    queryKey: ['pricing', 'special'],
    queryFn: () => pricingApi.getAllSpecialPricing(),
  });

  const createDiscountMut = useMutation({
    mutationFn: (data: Partial<DiscountScheme>) => pricingApi.createDiscount(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricing'] }); setShowDiscountForm(false); toast.success('Discount created'); },
    onError: () => toast.error('Failed to create discount'),
  });
  const createSpaMut = useMutation({
    mutationFn: (data: Partial<SpecialPricingAgreement>) => pricingApi.createSpecialPricing(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricing'] }); setShowSpaForm(false); toast.success('Agreement created'); },
    onError: () => toast.error('Failed to create agreement'),
  });

  const discountCols = useMemo<ColumnDef<DiscountScheme, unknown>[]>(() => [
    { accessorKey: 'schemeName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.schemeName}</span> },
    { accessorKey: 'schemeType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{row.original.schemeType}</span> },
    { accessorKey: 'discountBasis', header: 'Basis', cell: ({ row }) => <span className="text-sm">{row.original.discountBasis}</span> },
    { accessorKey: 'discountValue', header: 'Value', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.discountBasis === 'PERCENTAGE' ? `${row.original.discountValue}%` : formatMoney(row.original.discountValue)}</span> },
    { accessorKey: 'effectiveFrom', header: 'Effective', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.effectiveFrom)}</span> },
    { accessorKey: 'currentUtilization', header: 'Utilization', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.currentUtilization?.toLocaleString() || 0}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ], []);

  const spaCols = useMemo<ColumnDef<SpecialPricingAgreement, unknown>[]>(() => [
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => <span className="text-sm font-medium">{row.original.customerName}</span> },
    { accessorKey: 'agreementType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">{row.original.agreementType}</span> },
    { accessorKey: 'negotiatedBy', header: 'Negotiated By', cell: ({ row }) => <span className="text-sm">{row.original.negotiatedBy}</span> },
    { accessorKey: 'approvalLevel', header: 'Approval', cell: ({ row }) => <span className="text-sm">{row.original.approvalLevel}</span> },
    { accessorKey: 'effectiveFrom', header: 'From', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.effectiveFrom)}</span> },
    { accessorKey: 'effectiveTo', header: 'To', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.effectiveTo)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ], []);

  const discForm = useForm<DiscountFormData>({ resolver: zodResolver(discountSchema) });
  const spaForm = useForm<SpaFormData>({ resolver: zodResolver(spaSchema) });

  const tabs = [
    { key: 'discounts' as const, label: `Discounts (${discounts.length})` },
    { key: 'special' as const, label: `Special Pricing (${agreements.length})` },
  ];

  return (
    <>
      <PageHeader title="Pricing Management" subtitle="Manage discount schemes and special pricing agreements" actions={
        <button onClick={() => activeTab === 'discounts' ? (discForm.reset(), setShowDiscountForm(true)) : (spaForm.reset(), setShowSpaForm(true))} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> {activeTab === 'discounts' ? 'New Discount' : 'New Agreement'}</button>
      } />
      <div className="page-container space-y-6">
        <div className="flex border-b">
          {tabs.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t.label}</button>)}
        </div>
        {activeTab === 'discounts' ? (
          discountsLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={discountCols} data={discounts} enableGlobalFilter emptyMessage="No discount schemes" pageSize={15} />
        ) : (
          spaLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={spaCols} data={agreements} enableGlobalFilter emptyMessage="No special pricing agreements" pageSize={15} />
        )}
      </div>

      {showDiscountForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowDiscountForm(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Discount Scheme</h2><button onClick={() => setShowDiscountForm(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <form onSubmit={discForm.handleSubmit(d => createDiscountMut.mutate(d))} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input {...discForm.register('schemeName')} className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', discForm.formState.errors.schemeName && 'border-red-500')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Type *</label><select {...discForm.register('schemeType')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="VOLUME">Volume</option><option value="RELATIONSHIP">Relationship</option><option value="LOYALTY">Loyalty</option><option value="PROMOTIONAL">Promotional</option><option value="BUNDLED">Bundled</option></select></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Basis *</label><select {...discForm.register('discountBasis')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="PERCENTAGE">Percentage</option><option value="FLAT_AMOUNT">Flat Amount</option><option value="RATE_REDUCTION">Rate Reduction</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Value *</label><input type="number" step="0.01" {...discForm.register('discountValue', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">From *</label><input type="date" {...discForm.register('effectiveFrom')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">To *</label><input type="date" {...discForm.register('effectiveTo')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowDiscountForm(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createDiscountMut.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{createDiscountMut.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="w-4 h-4" />}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSpaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowSpaForm(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Special Pricing Agreement</h2><button onClick={() => setShowSpaForm(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <form onSubmit={spaForm.handleSubmit(d => createSpaMut.mutate(d))} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Customer ID *</label><input type="number" {...spaForm.register('customerId', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Customer Name *</label><input {...spaForm.register('customerName')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Type *</label><select {...spaForm.register('agreementType')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="FEE_WAIVER">Fee Waiver</option><option value="RATE_OVERRIDE">Rate Override</option><option value="MARGIN_OVERRIDE">Margin Override</option><option value="BUNDLE">Bundle</option></select></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Conditions *</label><textarea {...spaForm.register('conditions')} rows={3} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">From *</label><input type="date" {...spaForm.register('effectiveFrom')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">To *</label><input type="date" {...spaForm.register('effectiveTo')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowSpaForm(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createSpaMut.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{createSpaMut.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="w-4 h-4" />}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
