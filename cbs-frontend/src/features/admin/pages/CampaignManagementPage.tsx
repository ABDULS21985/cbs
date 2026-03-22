import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Megaphone, Rocket, XCircle, BarChart3, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { campaignsApi } from '../api/campaignApi';
import type { MarketingCampaign } from '../types/campaign';
import type { ColumnDef } from '@tanstack/react-table';

const campaignSchema = z.object({
  campaignName: z.string().min(3),
  campaignType: z.enum(['EMAIL', 'SMS', 'PUSH', 'MULTI_CHANNEL']),
  targetSegment: z.string().min(1),
  channel: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  budgetAmount: z.number().positive(),
});
type CampaignFormData = z.infer<typeof campaignSchema>;

export function CampaignManagementPage() {
  useEffect(() => { document.title = 'Campaigns | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'completed' | 'analytics'>('active');
  const [showCreate, setShowCreate] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignsApi.getActive(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<MarketingCampaign>) => campaignsApi.createCampaign(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setShowCreate(false); toast.success('Campaign created'); },
    onError: () => toast.error('Failed to create campaign'),
  });
  const launchMutation = useMutation({
    mutationFn: (code: string) => campaignsApi.launch(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign launched'); },
    onError: () => toast.error('Failed to launch campaign'),
  });

  const activeCampaigns = campaigns.filter((c: MarketingCampaign) => c.status === 'ACTIVE');
  const draftCampaigns = campaigns.filter((c: MarketingCampaign) => c.status === 'DRAFT' || c.status === 'APPROVED');
  const completedCampaigns = campaigns.filter((c: MarketingCampaign) => c.status === 'COMPLETED' || c.status === 'CLOSED');
  const totalConversion = campaigns.length > 0 ? campaigns.reduce((s: number, c: MarketingCampaign) => s + c.convertedCount, 0) / Math.max(campaigns.reduce((s: number, c: MarketingCampaign) => s + c.sentCount, 0), 1) * 100 : 0;

  const columns = useMemo<ColumnDef<MarketingCampaign, unknown>[]>(() => [
    { accessorKey: 'campaignName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.campaignName}</span> },
    { accessorKey: 'campaignType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{row.original.campaignType}</span> },
    { accessorKey: 'targetSegment', header: 'Segment', cell: ({ row }) => <span className="text-sm">{row.original.targetSegment}</span> },
    { accessorKey: 'startDate', header: 'Start', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.startDate)}</span> },
    { accessorKey: 'endDate', header: 'End', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.endDate)}</span> },
    { accessorKey: 'sentCount', header: 'Reach', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.sentCount.toLocaleString()}</span> },
    { accessorKey: 'convertedCount', header: 'Conversions', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.convertedCount.toLocaleString()}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-1">
          {(row.original.status === 'DRAFT' || row.original.status === 'APPROVED') && (
            <button onClick={() => launchMutation.mutate(row.original.campaignCode)} disabled={launchMutation.isPending} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Launch"><Rocket className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ], [launchMutation]);

  const analyticsData = useMemo(() => campaigns.slice(0, 10).map((c: MarketingCampaign) => ({
    name: c.campaignName.substring(0, 15),
    sent: c.sentCount,
    opened: c.openedCount,
    converted: c.convertedCount,
  })), [campaigns]);

  const currentData = activeTab === 'active' ? activeCampaigns : activeTab === 'draft' ? draftCampaigns : completedCampaigns;
  const tabs = [
    { key: 'active' as const, label: `Active (${activeCampaigns.length})` },
    { key: 'draft' as const, label: `Draft (${draftCampaigns.length})` },
    { key: 'completed' as const, label: `Completed (${completedCampaigns.length})` },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignFormData>({ resolver: zodResolver(campaignSchema) });
  const onSubmit = (data: CampaignFormData) => createMutation.mutate(data);

  return (
    <>
      <PageHeader title="Campaign Management" subtitle="Create and manage marketing campaigns" actions={
        <button onClick={() => { reset(); setShowCreate(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      } />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Campaigns" value={campaigns.length} format="number" icon={Megaphone} loading={isLoading} />
          <StatCard label="Active" value={activeCampaigns.length} format="number" icon={Rocket} loading={isLoading} />
          <StatCard label="Completed" value={completedCampaigns.length} format="number" icon={XCircle} loading={isLoading} />
          <StatCard label="Conversion Rate" value={`${totalConversion.toFixed(1)}%`} icon={BarChart3} loading={isLoading} />
        </div>

        <div className="flex border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t.label}</button>
          ))}
        </div>

        {activeTab !== 'analytics' ? (
          <DataTable columns={columns} data={currentData} enableGlobalFilter emptyMessage="No campaigns found" pageSize={15} />
        ) : (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Campaign Performance</h3>
            {analyticsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData}><CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="sent" fill="#6366f1" name="Sent" radius={[3,3,0,0]} /><Bar dataKey="opened" fill="#22c55e" name="Opened" radius={[3,3,0,0]} /><Bar dataKey="converted" fill="#f59e0b" name="Converted" radius={[3,3,0,0]} /></BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">No analytics data available</p>}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input {...register('campaignName')} className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.campaignName && 'border-red-500')} />{errors.campaignName && <p className="text-xs text-red-600">{errors.campaignName.message}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Type *</label><select {...register('campaignType')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="PUSH">Push</option><option value="MULTI_CHANNEL">Multi-Channel</option></select></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Channel *</label><input {...register('channel')} placeholder="e.g. Mobile App" className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Target Segment *</label><input {...register('targetSegment')} placeholder="e.g. High-Value Retail" className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.targetSegment && 'border-red-500')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Start Date *</label><input type="date" {...register('startDate')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">End Date *</label><input type="date" {...register('endDate')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Budget *</label><input type="number" step="1000" {...register('budgetAmount', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="flex gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{createMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="w-4 h-4" />}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
