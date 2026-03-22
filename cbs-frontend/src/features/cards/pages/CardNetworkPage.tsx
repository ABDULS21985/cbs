import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Network, Plus, Loader2, X, Shield } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { cardNetworksApi } from '../api/cardNetworkApi';
import type { CardNetworkMembership } from '../types/cardNetwork';

export function CardNetworkPage() {
  useEffect(() => { document.title = 'Card Networks | CBS'; }, []);
  const queryClient = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ networkName: 'VISA', membershipType: 'ISSUING', binPrefix: '', memberBankId: '', pciDssCompliant: true });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['card-networks'], queryFn: () => cardNetworksApi.getAll(), staleTime: 60_000,
  });

  const registerMut = useMutation({
    mutationFn: () => cardNetworksApi.register(form as Partial<CardNetworkMembership>),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['card-networks'] }); toast.success('Network membership registered'); setShowRegister(false); },
    onError: () => toast.error('Registration failed'),
  });

  const list = Array.isArray(memberships) ? memberships : [];

  const columns = useMemo<ColumnDef<CardNetworkMembership, unknown>[]>(() => [
    { accessorKey: 'networkName', header: 'Network', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        row.original.networkName === 'VISA' ? 'bg-blue-100 text-blue-700' : row.original.networkName === 'MASTERCARD' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
        {row.original.networkName}
      </span>
    )},
    { accessorKey: 'membershipType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.membershipType}</span> },
    { accessorKey: 'binPrefix', header: 'BIN Prefix', cell: ({ row }) => <span className="font-mono text-xs">{row.original.binPrefix || '—'}</span> },
    { accessorKey: 'memberBankId', header: 'Member ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.memberBankId || '—'}</span> },
    { accessorKey: 'pciDssCompliant', header: 'PCI-DSS', cell: ({ row }) => (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium', row.original.pciDssCompliant ? 'text-green-600' : 'text-red-600')}>
        <Shield className="w-3 h-3" /> {row.original.pciDssCompliant ? 'Compliant' : 'Non-compliant'}
      </span>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status || 'ACTIVE'} /> },
  ], []);

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Card Network Memberships" subtitle="Visa, Mastercard, Verve — BIN ranges and PCI-DSS compliance"
        actions={<button onClick={() => setShowRegister(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Register Membership</button>} />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Memberships" value={list.length} format="number" icon={Network} loading={isLoading} />
          <StatCard label="VISA" value={list.filter(m => m.networkName === 'VISA').length} format="number" loading={isLoading} />
          <StatCard label="Mastercard" value={list.filter(m => m.networkName === 'MASTERCARD').length} format="number" loading={isLoading} />
          <StatCard label="Verve" value={list.filter(m => m.networkName === 'VERVE').length} format="number" loading={isLoading} />
        </div>

        <DataTable columns={columns} data={list} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="card-networks" emptyMessage="No network memberships registered" />
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowRegister(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Register Network Membership</h3><button onClick={() => setShowRegister(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Network *</label>
                <select value={form.networkName} onChange={e => setForm(p => ({ ...p, networkName: e.target.value }))} className={fc}>
                  {['VISA', 'MASTERCARD', 'VERVE', 'AMEX', 'UNIONPAY'].map(n => <option key={n} value={n}>{n}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Type *</label>
                <select value={form.membershipType} onChange={e => setForm(p => ({ ...p, membershipType: e.target.value }))} className={fc}>
                  {['ISSUING', 'ACQUIRING', 'BOTH'].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">BIN Prefix</label>
                <input value={form.binPrefix} onChange={e => setForm(p => ({ ...p, binPrefix: e.target.value }))} placeholder="e.g. 428604" className={cn(fc, 'font-mono')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Member Bank ID</label>
                <input value={form.memberBankId} onChange={e => setForm(p => ({ ...p, memberBankId: e.target.value }))} className={cn(fc, 'font-mono')} /></div>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.pciDssCompliant} onChange={e => setForm(p => ({ ...p, pciDssCompliant: e.target.checked }))} className="rounded" /><span className="text-sm">PCI-DSS Compliant</span></label>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowRegister(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => registerMut.mutate()} disabled={registerMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {registerMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Register
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
