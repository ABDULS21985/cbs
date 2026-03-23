import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Gift, Users, Star, TrendingUp } from 'lucide-react';
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { loyaltyApi } from '../api/loyaltyApi';
import type { LoyaltyProgram, LoyaltyAccount } from '../types/loyalty';
import type { ColumnDef } from '@tanstack/react-table';

const programSchema = z.object({
  programName: z.string().min(3),
  programType: z.enum(['POINTS', 'CASHBACK', 'TIERED', 'HYBRID']),
  pointsCurrencyName: z.string().min(1).default('Points'),
  earnRatePerUnit: z.number().positive(),
  earnRateUnit: z.number().positive(),
  pointValue: z.number().positive(),
  minRedemptionPoints: z.number().int().positive(),
  expiryMonths: z.number().int().min(1).max(120),
});
type ProgramFormData = z.infer<typeof programSchema>;

const TIER_COLORS = ['#d97706', '#9ca3af', '#f59e0b', '#6366f1'];

export function LoyaltyProgramPage() {
  useEffect(() => { document.title = 'Loyalty Programs | CBS Admin'; }, []);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'programs' | 'members' | 'analytics'>('programs');
  const [showCreate, setShowCreate] = useState(false);

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['loyalty', 'programs'],
    queryFn: () => loyaltyApi.getPrograms(),
  });
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['loyalty', 'accounts'],
    queryFn: () => loyaltyApi.getAccounts(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyProgram>) => loyaltyApi.createProgram(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty'] }); setShowCreate(false); toast.success('Program created'); },
    onError: () => toast.error('Failed to create program'),
  });

  const activeMembers = accounts.filter((a: LoyaltyAccount) => a.status === 'ACTIVE');
  const totalPointsIssued = accounts.reduce((s: number, a: LoyaltyAccount) => s + a.lifetimeEarned, 0);
  const totalRedeemed = accounts.reduce((s: number, a: LoyaltyAccount) => s + a.lifetimeRedeemed, 0);

  const tierDistribution = useMemo(() => {
    const tiers: Record<string, number> = {};
    accounts.forEach((a: LoyaltyAccount) => { tiers[a.currentTier || 'NONE'] = (tiers[a.currentTier || 'NONE'] || 0) + 1; });
    return Object.entries(tiers).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  const programCols = useMemo<ColumnDef<LoyaltyProgram, unknown>[]>(() => [
    { accessorKey: 'programName', header: 'Program', cell: ({ row }) => <span className="text-sm font-medium">{row.original.programName}</span> },
    { accessorKey: 'programType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{row.original.programType}</span> },
    { accessorKey: 'pointsCurrencyName', header: 'Currency', cell: ({ row }) => <span className="text-sm">{row.original.pointsCurrencyName}</span> },
    { accessorKey: 'earnRatePerUnit', header: 'Earn Rate', cell: ({ row }) => <span className="text-sm font-mono">{row.original.earnRatePerUnit} per {row.original.earnRateUnit}</span> },
    { accessorKey: 'pointValue', header: 'Point Value', cell: ({ row }) => <span className="text-sm font-mono">{formatMoney(row.original.pointValue)}</span> },
    { accessorKey: 'expiryMonths', header: 'Expiry', cell: ({ row }) => <span className="text-sm">{row.original.expiryMonths} months</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
  ], []);

  const accountCols = useMemo<ColumnDef<LoyaltyAccount, unknown>[]>(() => [
    { accessorKey: 'loyaltyNumber', header: 'Number', cell: ({ row }) => <span className="font-mono text-sm">{row.original.loyaltyNumber}</span> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm font-mono">{row.original.customerId}</span> },
    { accessorKey: 'currentBalance', header: 'Balance', cell: ({ row }) => <span className="text-sm font-mono tabular-nums font-medium">{row.original.currentBalance.toLocaleString()}</span> },
    { accessorKey: 'currentTier', header: 'Tier', cell: ({ row }) => <span className="text-sm font-medium">{row.original.currentTier || 'None'}</span> },
    { accessorKey: 'lifetimeEarned', header: 'Earned', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.lifetimeEarned.toLocaleString()}</span> },
    { accessorKey: 'lifetimeRedeemed', header: 'Redeemed', cell: ({ row }) => <span className="text-sm font-mono tabular-nums">{row.original.lifetimeRedeemed.toLocaleString()}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ], []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProgramFormData>({ resolver: zodResolver(programSchema), defaultValues: { pointsCurrencyName: 'Points', expiryMonths: 24, earnRateUnit: 1000 } });
  const onSubmit = (data: ProgramFormData) => createMutation.mutate(data);

  const tabs = [
    { key: 'programs' as const, label: `Programs (${programs.length})` },
    { key: 'members' as const, label: `Members (${accounts.length})` },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <>
      <PageHeader title="Loyalty Programs" subtitle="Manage customer loyalty programs, tiers, and rewards" actions={
        <button onClick={() => { reset(); setShowCreate(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Program</button>
      } />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={accounts.length} format="number" icon={Users} loading={accountsLoading} />
          <StatCard label="Active" value={activeMembers.length} format="number" icon={Star} loading={accountsLoading} />
          <StatCard label="Points Issued" value={totalPointsIssued} format="number" icon={Gift} loading={accountsLoading} />
          <StatCard label="Points Redeemed" value={totalRedeemed} format="number" icon={TrendingUp} loading={accountsLoading} />
        </div>

        <div className="flex border-b">
          {tabs.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t.label}</button>)}
        </div>

        {activeTab === 'programs' && (programsLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={programCols} data={programs} enableGlobalFilter emptyMessage="No loyalty programs" pageSize={10} />)}
        {activeTab === 'members' && (accountsLoading ? <div className="h-48 rounded-lg bg-muted animate-pulse" /> : <DataTable columns={accountCols} data={accounts} enableGlobalFilter emptyMessage="No loyalty members" pageSize={15} />)}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold mb-4">Tier Distribution</h3>
              {tierDistribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={140} height={140}><PieChart><Pie data={tierDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} strokeWidth={2}>{tierDistribution.map((_, i) => <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /></PieChart></ResponsiveContainer>
                  <div className="space-y-1.5">{tierDistribution.map((d, i) => (<div key={d.name} className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TIER_COLORS[i % TIER_COLORS.length] }} /><span className="text-muted-foreground flex-1">{d.name}</span><span className="font-semibold tabular-nums">{d.value}</span></div>))}</div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
            </div>
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold mb-4">Points Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Issued</span><span className="font-semibold tabular-nums">{totalPointsIssued.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Redeemed</span><span className="font-semibold tabular-nums">{totalRedeemed.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Outstanding</span><span className="font-semibold tabular-nums">{(totalPointsIssued - totalRedeemed).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Redemption Rate</span><span className="font-semibold tabular-nums">{totalPointsIssued > 0 ? ((totalRedeemed / totalPointsIssued) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Loyalty Program</h2><button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Program Name *</label><input {...register('programName')} className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.programName && 'border-red-500')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Type *</label><select {...register('programType')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="POINTS">Points</option><option value="CASHBACK">Cashback</option><option value="TIERED">Tiered</option><option value="HYBRID">Hybrid</option></select></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Currency Name</label><input {...register('pointsCurrencyName')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Earn Rate *</label><input type="number" step="0.1" {...register('earnRatePerUnit', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Per Unit *</label><input type="number" {...register('earnRateUnit', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Point Value *</label><input type="number" step="0.01" {...register('pointValue', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-sm font-medium">Min Redemption *</label><input type="number" {...register('minRedemptionPoints', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Expiry (months) *</label><input type="number" {...register('expiryMonths', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
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
