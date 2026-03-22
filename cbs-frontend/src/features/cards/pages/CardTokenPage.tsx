import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Smartphone, Plus, Pause, Play, XCircle, Loader2, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { cardsApi } from '../api/cardExtApi';
import type { CardToken } from '../types/cardExt';

const WALLET_ICONS: Record<string, string> = { APPLE_PAY: '🍎', GOOGLE_PAY: '🟢', SAMSUNG_PAY: '🔵', GARMIN_PAY: '⌚', FITBIT_PAY: '⌚', MERCHANT_TOKEN: '🏪', ISSUER_TOKEN: '🏦', COF_TOKEN: '💳' };

export function CardTokenPage() {
  useEffect(() => { document.title = 'Card Tokens | CBS'; }, []);
  const queryClient = useQueryClient();
  const [showProvision, setShowProvision] = useState(false);
  const [provisionForm, setProvisionForm] = useState({ cardId: 0, walletProvider: 'APPLE_PAY', deviceName: '', deviceType: 'MOBILE' });

  // Fetch all tokens via customer endpoint (use customerId 0 to get all — or iterate)
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['card-tokens', 'all'],
    queryFn: () => cardsApi.getCustomerTokens(0).catch(() => []),
    staleTime: 30_000,
  });

  const suspendMut = useMutation({ mutationFn: (id: number) => cardsApi.suspend(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['card-tokens'] }); toast.success('Token suspended'); } });
  const resumeMut = useMutation({ mutationFn: (id: number) => cardsApi.resume(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['card-tokens'] }); toast.success('Token resumed'); } });
  const deactivateMut = useMutation({ mutationFn: (id: number) => cardsApi.deactivate(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['card-tokens'] }); toast.success('Token deactivated'); } });
  const provisionMut = useMutation({
    mutationFn: () => cardsApi.provisionToken(provisionForm.cardId, { walletProvider: provisionForm.walletProvider, deviceName: provisionForm.deviceName, deviceType: provisionForm.deviceType }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['card-tokens'] }); toast.success('Token provisioned'); setShowProvision(false); },
    onError: () => toast.error('Provisioning failed'),
  });

  const list = Array.isArray(tokens) ? tokens : [];
  const activeCount = list.filter(t => t.status === 'ACTIVE').length;

  const columns = useMemo<ColumnDef<CardToken, unknown>[]>(() => [
    { accessorKey: 'tokenRef', header: 'Token Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.tokenRef}</span> },
    { accessorKey: 'walletProvider', header: 'Wallet', cell: ({ row }) => (
      <span className="flex items-center gap-1.5 text-sm">
        <span>{WALLET_ICONS[row.original.walletProvider] || '📱'}</span>
        <span>{row.original.walletProvider.replace(/_/g, ' ')}</span>
      </span>
    )},
    { accessorKey: 'deviceName', header: 'Device', cell: ({ row }) => <span className="text-sm">{row.original.deviceName || '—'}</span> },
    { accessorKey: 'deviceType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.deviceType || '—'}</span> },
    { accessorKey: 'tokenNumberSuffix', header: 'Token Suffix', cell: ({ row }) => <span className="font-mono text-xs">****{row.original.tokenNumberSuffix}</span> },
    { accessorKey: 'transactionCount', header: 'Txns', cell: ({ row }) => <span className="font-mono text-xs">{row.original.transactionCount ?? 0}</span> },
    { accessorKey: 'lastUsedAt', header: 'Last Used', cell: ({ row }) => <span className="text-xs">{row.original.lastUsedAt ? formatDateTime(row.original.lastUsedAt) : '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => {
      const t = row.original;
      return (
        <div className="flex items-center gap-1">
          {t.status === 'ACTIVE' && (
            <button onClick={() => suspendMut.mutate(t.id)} disabled={suspendMut.isPending}
              className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Suspend"><Pause className="w-3.5 h-3.5" /></button>
          )}
          {t.status === 'SUSPENDED' && (
            <button onClick={() => resumeMut.mutate(t.id)} disabled={resumeMut.isPending}
              className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Resume"><Play className="w-3.5 h-3.5" /></button>
          )}
          {(t.status === 'ACTIVE' || t.status === 'SUSPENDED') && (
            <button onClick={() => deactivateMut.mutate(t.id)} disabled={deactivateMut.isPending}
              className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Deactivate"><XCircle className="w-3.5 h-3.5" /></button>
          )}
        </div>
      );
    }},
  ], [suspendMut, resumeMut, deactivateMut]);

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Card Tokens & Digital Wallets" subtitle="Manage tokenized cards across Apple Pay, Google Pay, Samsung Pay"
        actions={<button onClick={() => setShowProvision(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Provision Token</button>} />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tokens" value={list.length} format="number" icon={Smartphone} loading={isLoading} />
          <StatCard label="Active" value={activeCount} format="number" loading={isLoading} />
          <StatCard label="Suspended" value={list.filter(t => t.status === 'SUSPENDED').length} format="number" loading={isLoading} />
          <StatCard label="Deactivated" value={list.filter(t => t.status === 'DEACTIVATED').length} format="number" loading={isLoading} />
        </div>

        <DataTable columns={columns} data={list} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="card-tokens" emptyMessage="No card tokens provisioned" />
      </div>

      {showProvision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowProvision(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Provision Digital Wallet Token</h3><button onClick={() => setShowProvision(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Card ID *</label>
              <input type="number" value={provisionForm.cardId || ''} onChange={e => setProvisionForm(p => ({ ...p, cardId: Number(e.target.value) }))} className={cn(fc, 'font-mono')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Wallet Provider *</label>
                <select value={provisionForm.walletProvider} onChange={e => setProvisionForm(p => ({ ...p, walletProvider: e.target.value }))} className={fc}>
                  {['APPLE_PAY', 'GOOGLE_PAY', 'SAMSUNG_PAY', 'GARMIN_PAY', 'FITBIT_PAY', 'MERCHANT_TOKEN', 'ISSUER_TOKEN', 'COF_TOKEN'].map(w => <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Device Type</label>
                <select value={provisionForm.deviceType} onChange={e => setProvisionForm(p => ({ ...p, deviceType: e.target.value }))} className={fc}>
                  {['MOBILE', 'WATCH', 'TABLET', 'OTHER'].map(d => <option key={d} value={d}>{d}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Device Name</label>
              <input value={provisionForm.deviceName} onChange={e => setProvisionForm(p => ({ ...p, deviceName: e.target.value }))} placeholder="e.g. iPhone 15 Pro" className={fc} /></div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowProvision(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => provisionMut.mutate()} disabled={!provisionForm.cardId || provisionMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {provisionMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />} Provision
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
