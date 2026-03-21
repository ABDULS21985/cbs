import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Target, UserPlus, FileText, BookOpen, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { salesLeadsApi } from '../api/salesLeadApi';
import { salesPlansApi } from '../api/salesPlanApi';
import { salesSupportApi } from '../api/salesSupportApi';
import type { SalesLead } from '../types/salesLead';
import type { SalesPlan } from '../types/salesPlan';
import type { SalesKnowledgeArticle, SalesCollateral } from '../types/salesSupport';
import type { ColumnDef } from '@tanstack/react-table';

const leadSchema = z.object({
  prospectName: z.string().min(2),
  prospectPhone: z.string().optional(),
  prospectEmail: z.string().email().optional().or(z.literal('')),
  leadSource: z.enum(['REFERRAL', 'WALK_IN', 'DIGITAL', 'CAMPAIGN', 'PARTNER']),
  productInterest: z.string().min(1),
  estimatedValue: z.number().positive(),
  assignedTo: z.string().optional(),
});
type LeadFormData = z.infer<typeof leadSchema>;

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  QUALIFIED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PROPOSAL: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  NEGOTIATION: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  WON: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function SalesManagementPage() {
  useEffect(() => { document.title = 'Sales | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'leads' | 'plans' | 'collateral'>('leads');
  const [showCreate, setShowCreate] = useState(false);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['sales', 'leads'],
    queryFn: () => salesLeadsApi.getAll(),
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['sales', 'plans'],
    queryFn: () => salesPlansApi.getAll(),
  });
  const { data: articles = [] } = useQuery({
    queryKey: ['sales', 'articles'],
    queryFn: () => salesSupportApi.searchArticles(),
  });
  const { data: collateral = [] } = useQuery({
    queryKey: ['sales', 'collateral'],
    queryFn: () => salesSupportApi.searchCollateral(),
  });

  const createLeadMut = useMutation({
    mutationFn: (data: Partial<SalesLead>) => salesLeadsApi.createLead(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales', 'leads'] }); setShowCreate(false); toast.success('Lead created'); },
    onError: () => toast.error('Failed to create lead'),
  });
  const advanceMut = useMutation({
    mutationFn: ({ number, stage }: { number: string; stage: string }) => salesLeadsApi.advanceLead(number, { stage } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales', 'leads'] }); toast.success('Lead advanced'); },
    onError: () => toast.error('Failed to advance lead'),
  });

  const leadCols = useMemo<ColumnDef<SalesLead, unknown>[]>(() => [
    { accessorKey: 'prospectName', header: 'Lead Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.prospectName}</span> },
    { accessorKey: 'leadSource', header: 'Source', cell: ({ row }) => <span className="text-sm">{row.original.leadSource}</span> },
    { accessorKey: 'productInterest', header: 'Product Interest', cell: ({ row }) => <span className="text-sm">{row.original.productInterest}</span> },
    { accessorKey: 'assignedTo', header: 'Assigned To', cell: ({ row }) => <span className="text-sm">{row.original.assignedTo || '—'}</span> },
    { accessorKey: 'stage', header: 'Stage', cell: ({ row }) => <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', STAGE_COLORS[row.original.stage] || 'bg-gray-100 text-gray-600')}>{row.original.stage}</span> },
    { accessorKey: 'estimatedValue', header: 'Value', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{formatMoney(row.original.estimatedValue)}</span> },
    { accessorKey: 'leadScore', header: 'Score', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.leadScore}</span> },
    { id: 'actions', header: '', cell: ({ row }) => {
      const nextStages: Record<string, string> = { NEW: 'CONTACTED', CONTACTED: 'QUALIFIED', QUALIFIED: 'PROPOSAL', PROPOSAL: 'NEGOTIATION', NEGOTIATION: 'WON' };
      const next = nextStages[row.original.stage];
      return next ? <button onClick={() => advanceMut.mutate({ number: row.original.leadNumber, stage: next })} disabled={advanceMut.isPending} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title={`Advance to ${next}`}><ArrowRight className="w-4 h-4" /></button> : null;
    }},
  ], [advanceMut]);

  const planCols = useMemo<ColumnDef<SalesPlan, unknown>[]>(() => [
    { accessorKey: 'planName', header: 'Plan', cell: ({ row }) => <span className="text-sm font-medium">{row.original.planName}</span> },
    { accessorKey: 'region', header: 'Region', cell: ({ row }) => <span className="text-sm">{row.original.region}</span> },
    { accessorKey: 'planPeriod', header: 'Period', cell: ({ row }) => <span className="text-sm">{row.original.planPeriod}</span> },
    { accessorKey: 'revenueTarget', header: 'Target', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{formatMoney(row.original.revenueTarget)}</span> },
    { accessorKey: 'revenueActual', header: 'Actual', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{formatMoney(row.original.revenueActual)}</span> },
    { accessorKey: 'achievementPct', header: 'Achievement', cell: ({ row }) => (
      <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-muted rounded-full max-w-[60px]"><div className={cn('h-full rounded-full', row.original.achievementPct >= 100 ? 'bg-green-500' : row.original.achievementPct >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(row.original.achievementPct, 100)}%` }} /></div><span className="text-sm tabular-nums">{row.original.achievementPct?.toFixed(0) || 0}%</span></div>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ], []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadFormData>({ resolver: zodResolver(leadSchema) });

  const tabs = [
    { key: 'leads' as const, label: `Leads (${leads.length})`, icon: Target },
    { key: 'plans' as const, label: `Sales Plans (${plans.length})`, icon: FileText },
    { key: 'collateral' as const, label: `Collateral (${(articles as any[]).length + (collateral as any[]).length})`, icon: BookOpen },
  ];

  return (
    <>
      <PageHeader title="Sales Management" subtitle="Manage leads, sales plans, and collateral" actions={activeTab === 'leads' ? (
        <button onClick={() => { reset(); setShowCreate(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Lead</button>
      ) : undefined} />
      <div className="page-container space-y-6">
        <div className="flex border-b">
          {tabs.map(t => { const Icon = t.icon; return <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}><Icon className="w-4 h-4" />{t.label}</button>; })}
        </div>

        {activeTab === 'leads' && (leadsLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={leadCols} data={leads} enableGlobalFilter emptyMessage="No sales leads" pageSize={15} />)}
        {activeTab === 'plans' && (plansLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={planCols} data={plans} enableGlobalFilter emptyMessage="No sales plans" pageSize={15} />)}
        {activeTab === 'collateral' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...(articles as SalesKnowledgeArticle[]).map(a => ({ type: 'article' as const, title: a.title, code: a.articleCode, category: a.articleType, status: a.status, views: a.viewCount })),
              ...(collateral as unknown as SalesCollateral[]).map(c => ({ type: 'collateral' as const, title: c.title, code: c.collateralCode, category: c.collateralType, status: c.status, views: c.downloadCount })),
            ].map((item) => (
              <div key={item.code} className="rounded-xl border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-2">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', item.type === 'article' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400')}>{item.type === 'article' ? 'Article' : 'Collateral'}</span>
                  <StatusBadge status={item.status} dot />
                </div>
                <h4 className="text-sm font-medium mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">{item.views} {item.type === 'article' ? 'views' : 'downloads'}</div>
              </div>
            ))}
            {(articles as any[]).length + (collateral as any[]).length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="font-medium">No collateral materials</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Sales Lead</h2><button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSubmit(d => createLeadMut.mutate({ ...d, stage: 'NEW' }))} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Prospect Name *</label><input {...register('prospectName')} className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.prospectName && 'border-red-500')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><input {...register('prospectPhone')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Email</label><input type="email" {...register('prospectEmail')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Source *</label><select {...register('leadSource')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="REFERRAL">Referral</option><option value="WALK_IN">Walk-in</option><option value="DIGITAL">Digital</option><option value="CAMPAIGN">Campaign</option><option value="PARTNER">Partner</option></select></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Product *</label><input {...register('productInterest')} placeholder="e.g. SME Loan" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Est. Value *</label><input type="number" {...register('estimatedValue', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Assign To</label><input {...register('assignedTo')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={createLeadMut.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{createLeadMut.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="w-4 h-4" />}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
