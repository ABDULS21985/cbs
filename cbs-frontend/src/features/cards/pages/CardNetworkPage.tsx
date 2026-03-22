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

// Backend membership types: PRINCIPAL, ASSOCIATE, AFFILIATE, PROCESSOR, AGENT, SPONSOR
const MEMBERSHIP_TYPES = ['PRINCIPAL', 'ASSOCIATE', 'AFFILIATE', 'PROCESSOR', 'AGENT', 'SPONSOR'] as const;

export function CardNetworkPage() {
  useEffect(() => { document.title = 'Card Networks | CBS'; }, []);
  const queryClient = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({
    network: 'VISA',
    membershipType: 'PRINCIPAL' as string,
    memberId: '',
    institutionName: '',
    issuingEnabled: true,
    acquiringEnabled: false,
    settlementBic: '',
    settlementCurrency: 'USD',
    pciDssCompliant: true,
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

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
    { accessorKey: 'network', header: 'Network', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        row.original.network === 'VISA' ? 'bg-blue-100 text-blue-700' : row.original.network === 'MASTERCARD' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
        {row.original.network}
      </span>
    )},
    { accessorKey: 'membershipType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.membershipType}</span> },
    { accessorKey: 'memberId', header: 'Member ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.memberId || '—'}</span> },
    { accessorKey: 'institutionName', header: 'Institution', cell: ({ row }) => <span className="text-sm">{row.original.institutionName || '—'}</span> },
    { accessorKey: 'pciDssCompliant', header: 'PCI-DSS', cell: ({ row }) => (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium', row.original.pciDssCompliant ? 'text-green-600' : 'text-red-600')}>
        <Shield className="w-3 h-3" /> {row.original.pciDssCompliant ? 'Compliant' : 'Non-compliant'}
      </span>
    )},
    { accessorKey: 'effectiveFrom', header: 'Effective From', cell: ({ row }) => <span className="text-xs">{row.original.effectiveFrom ? formatDate(row.original.effectiveFrom) : '—'}</span> },
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
          <StatCard label="VISA" value={list.filter(m => m.network === 'VISA').length} format="number" loading={isLoading} />
          <StatCard label="Mastercard" value={list.filter(m => m.network === 'MASTERCARD').length} format="number" loading={isLoading} />
          <StatCard label="Verve" value={list.filter(m => m.network === 'VERVE').length} format="number" loading={isLoading} />
        </div>

        <DataTable columns={columns} data={list} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="card-networks" emptyMessage="No network memberships registered" />
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowRegister(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Register Network Membership</h3><button onClick={() => setShowRegister(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Network *</label>
                <select value={form.network} onChange={e => setForm(p => ({ ...p, network: e.target.value }))} className={fc}>
                  {['VISA', 'MASTERCARD', 'VERVE', 'AMEX', 'UNIONPAY', 'JCB', 'INTERSWITCH'].map(n => <option key={n} value={n}>{n}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Membership Type *</label>
                <select value={form.membershipType} onChange={e => setForm(p => ({ ...p, membershipType: e.target.value }))} className={fc}>
                  {MEMBERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Institution Name *</label>
              <input value={form.institutionName} onChange={e => setForm(p => ({ ...p, institutionName: e.target.value }))} placeholder="e.g. DigiCore Bank PLC" className={fc} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Member ID</label>
                <input value={form.memberId} onChange={e => setForm(p => ({ ...p, memberId: e.target.value }))} className={cn(fc, 'font-mono')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Effective From *</label>
                <input type="date" value={form.effectiveFrom} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} className={fc} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Settlement BIC</label>
                <input value={form.settlementBic} onChange={e => setForm(p => ({ ...p, settlementBic: e.target.value }))} placeholder="e.g. DCBKNGLA" maxLength={11} className={cn(fc, 'font-mono uppercase')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Settlement Currency</label>
                <select value={form.settlementCurrency} onChange={e => setForm(p => ({ ...p, settlementCurrency: e.target.value }))} className={fc}>
                  {['USD', 'NGN', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.issuingEnabled} onChange={e => setForm(p => ({ ...p, issuingEnabled: e.target.checked }))} className="rounded" /><span className="text-sm">Issuing Enabled</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.acquiringEnabled} onChange={e => setForm(p => ({ ...p, acquiringEnabled: e.target.checked }))} className="rounded" /><span className="text-sm">Acquiring Enabled</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.pciDssCompliant} onChange={e => setForm(p => ({ ...p, pciDssCompliant: e.target.checked }))} className="rounded" /><span className="text-sm">PCI-DSS Compliant</span></label>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowRegister(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => registerMut.mutate()} disabled={registerMut.isPending || !form.institutionName.trim() || !form.effectiveFrom}
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
