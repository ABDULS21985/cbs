import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Unlock, Plus, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiPost } from '@/lib/api';
import { DataTable, StatusBadge, SummaryBar } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { accountDetailApi, type Hold } from '../../api/accountDetailApi';

interface HoldsTabProps {
  accountId: string;
}

export function HoldsTab({ accountId }: HoldsTabProps) {
  const queryClient = useQueryClient();
  const [holdToRelease, setHoldToRelease] = useState<Hold | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [showPlaceHold, setShowPlaceHold] = useState(false);
  const [holdForm, setHoldForm] = useState({ amount: 0, reason: '', reference: '', releaseDate: '' });

  const placeHoldMut = useMutation({
    mutationFn: () => apiPost(`/api/v1/accounts/${accountId}/holds`, {
      amount: holdForm.amount, reason: holdForm.reason, reference: holdForm.reference || `HOLD-${Date.now()}`,
      releaseDate: holdForm.releaseDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'holds'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', accountId] });
      toast.success('Hold placed successfully');
      setShowPlaceHold(false);
      setHoldForm({ amount: 0, reason: '', reference: '', releaseDate: '' });
    },
    onError: () => toast.error('Failed to place hold'),
  });

  const { data: holds = [], isLoading } = useQuery<Hold[]>({
    queryKey: ['accounts', accountId, 'holds'],
    queryFn: () => accountDetailApi.getHolds(accountId),
    staleTime: 30_000,
  });

  const releaseMutation = useMutation({
    mutationFn: ({ holdId, reason }: { holdId: string; reason: string }) =>
      accountDetailApi.releaseHold(accountId, holdId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'holds'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', accountId] });
      toast.success('Hold released successfully');
      setHoldToRelease(null);
      setReleaseReason('');
    },
    onError: () => {
      toast.error('Failed to release hold. Please try again.');
    },
  });

  const totalHeld = holds
    .filter((h) => h.status === 'ACTIVE')
    .reduce((sum, h) => sum + h.amount, 0);

  const columns: ColumnDef<Hold, any>[] = [
    {
      accessorKey: 'reference',
      header: 'Hold Reference',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-medium">{formatMoney(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate block">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'placedBy',
      header: 'Placed By',
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'dateCreated',
      header: 'Date Placed',
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: 'releaseDate',
      header: 'Auto-Release',
      cell: ({ getValue }) => {
        const v = getValue<string | undefined>();
        return v ? (
          <span className="text-sm">{formatDate(v)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.status === 'ACTIVE' ? (
        <button
          onClick={(e) => { e.stopPropagation(); setHoldToRelease(row.original); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 transition-colors border border-amber-200 dark:border-amber-700"
        >
          <Unlock className="w-3 h-3" />
          Release
        </button>
      ) : null,
    },
  ];

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowPlaceHold(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Place Hold
        </button>
      </div>

      <DataTable
        columns={columns}
        data={holds}
        isLoading={isLoading}
        emptyMessage="No holds on this account"
        pageSize={10}
      />

      {holds.length > 0 && (
        <SummaryBar
          items={[
            { label: 'Active Holds', value: holds.filter((h) => h.status === 'ACTIVE').length, format: 'number' },
            { label: 'Total Held Amount', value: totalHeld, format: 'money', color: totalHeld > 0 ? 'warning' : 'default' },
          ]}
        />
      )}

      {/* Place Hold dialog */}
      {showPlaceHold && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPlaceHold(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div><h3 className="text-lg font-semibold">Place Hold / Lien</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Block a portion of the account balance.</p></div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Amount *</label>
                  <input type="number" step="0.01" value={holdForm.amount || ''} onChange={e => setHoldForm(p => ({ ...p, amount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Reason *</label>
                  <textarea value={holdForm.reason} onChange={e => setHoldForm(p => ({ ...p, reason: e.target.value }))} rows={2} className={fc} placeholder="Reason for placing hold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Reference</label>
                    <input value={holdForm.reference} onChange={e => setHoldForm(p => ({ ...p, reference: e.target.value }))} className={cn(fc, 'font-mono')} placeholder="Auto-generated" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Auto-Release Date</label>
                    <input type="date" value={holdForm.releaseDate} onChange={e => setHoldForm(p => ({ ...p, releaseDate: e.target.value }))} className={fc} /></div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowPlaceHold(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => placeHoldMut.mutate()} disabled={!holdForm.amount || !holdForm.reason || placeHoldMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {placeHoldMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Place Hold
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Release confirm dialog with reason input */}
      {holdToRelease && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Unlock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Release Hold</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You are releasing hold <span className="font-mono font-medium">{holdToRelease.reference}</span> of{' '}
                    <span className="font-medium">{formatMoney(holdToRelease.amount)}</span>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Reason for Release</label>
                <textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Provide reason for releasing this hold…"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setHoldToRelease(null); setReleaseReason(''); }}
                  disabled={releaseMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => releaseMutation.mutate({ holdId: holdToRelease.id, reason: releaseReason })}
                  disabled={releaseMutation.isPending || !releaseReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  {releaseMutation.isPending ? 'Releasing…' : 'Release Hold'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
