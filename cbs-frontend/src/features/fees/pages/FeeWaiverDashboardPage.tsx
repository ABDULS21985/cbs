import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatRelative } from '@/lib/formatters';
import {
  Clock, CheckCircle, XCircle, DollarSign, Download, X, Shield,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getPendingWaivers, getAllWaivers, approveWaiver, rejectWaiver,
  type FeeWaiver,
} from '../api/feeApi';
import { toast } from 'sonner';

// ── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({ waiver, onClose }: { waiver: FeeWaiver; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const reject = useMutation({
    mutationFn: () => rejectWaiver(waiver.id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-waivers'] }); toast.success('Waiver rejected'); onClose(); },
    onError: () => toast.error('Failed to reject waiver'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Reject Waiver</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Waiver {waiver.id} — ₦{waiver.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Rejection Reason *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for rejection..."
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => reject.mutate()}
              disabled={reason.length < 5 || reject.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {reject.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Waiver Detail Slide-over ─────────────────────────────────────────────────

function WaiverDetailPanel({ waiver, onClose, onApprove, onReject }: {
  waiver: FeeWaiver;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-background border-l shadow-xl overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <p className="text-sm font-medium">Waiver Details</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs">{waiver.id}</span>
            <StatusBadge status={waiver.status} dot />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Fee ID</p><p className="font-mono text-xs">{waiver.feeId}</p></div>
            <div><p className="text-xs text-muted-foreground">Account</p><p className="font-mono text-xs">{waiver.accountId}</p></div>
            <div><p className="text-xs text-muted-foreground">Waiver Amount</p><p className="font-bold tabular-nums">{formatMoney(waiver.amount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Requested By</p><p className="font-medium">{waiver.requestedBy}</p></div>
            <div><p className="text-xs text-muted-foreground">Requested</p><p>{formatDate(waiver.createdAt)}</p></div>
            {waiver.authorizedBy && <div><p className="text-xs text-muted-foreground">Authorized By</p><p className="font-medium">{waiver.authorizedBy}</p></div>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="text-sm">{waiver.reason}</p>
          </div>

          {waiver.status === 'PENDING' && (
            <div className="flex gap-2 pt-2">
              <button onClick={onApprove} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">Approve</button>
              <button onClick={onReject} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Reject</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function FeeWaiverDashboardPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedWaiver, setSelectedWaiver] = useState<FeeWaiver | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FeeWaiver | null>(null);

  const { data: pendingWaivers = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['fee-waivers', 'pending'],
    queryFn: getPendingWaivers,
    staleTime: 30_000,
  });

  const { data: allWaivers = [], isLoading: allLoading } = useQuery({
    queryKey: ['fee-waivers', 'all'],
    queryFn: getAllWaivers,
    staleTime: 30_000,
  });

  // Combine: pending from dedicated endpoint + all from general endpoint
  const combined = useMemo(() => {
    const map = new Map<string, FeeWaiver>();
    allWaivers.forEach((w) => map.set(w.id, w));
    pendingWaivers.forEach((w) => map.set(w.id, w));
    return Array.from(map.values());
  }, [pendingWaivers, allWaivers]);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return combined;
    return combined.filter((w) => w.status === statusFilter);
  }, [combined, statusFilter]);

  const today = new Date().toISOString().split('T')[0];
  const approvedToday = combined.filter((w) => w.status === 'APPROVED' && w.createdAt?.startsWith(today)).length;
  const rejectedToday = combined.filter((w) => w.status === 'REJECTED' && w.createdAt?.startsWith(today)).length;
  const totalWaivedMtd = combined.filter((w) => w.status === 'APPROVED').reduce((s, w) => s + w.amount, 0);

  const approveMutation = useMutation({
    mutationFn: (waiverId: string) => approveWaiver(waiverId, 'Current User'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-waivers'] });
      toast.success('Waiver approved');
      setSelectedWaiver(null);
    },
    onError: () => toast.error('Failed to approve waiver'),
  });

  const handleExport = () => {
    const headers = ['ID', 'Fee ID', 'Account', 'Amount', 'Requested By', 'Reason', 'Status', 'Date'];
    const rows = filtered.map((w) => [w.id, w.feeId, w.accountId, w.amount, w.requestedBy, w.reason, w.status, w.createdAt]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fee-waivers.csv'; a.click();
  };

  const columns: ColumnDef<FeeWaiver, any>[] = [
    { accessorKey: 'id', header: 'Waiver ID', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.id}</span> },
    { accessorKey: 'feeId', header: 'Fee', cell: ({ row }) => <span className="text-xs">{row.original.feeId}</span> },
    { accessorKey: 'accountId', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountId}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="text-sm font-medium tabular-nums">{formatMoney(row.original.amount)}</span> },
    { accessorKey: 'requestedBy', header: 'Requested By', cell: ({ row }) => <span className="text-sm">{row.original.requestedBy}</span> },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <span className="text-xs tabular-nums">{formatDate(row.original.createdAt)}</span> },
    { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => <span className="text-xs truncate max-w-[150px] block">{row.original.reason}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const w = row.original;
        if (w.status !== 'PENDING') {
          return w.authorizedBy ? (
            <span className="text-xs text-muted-foreground">{w.authorizedBy}</span>
          ) : null;
        }
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); approveMutation.mutate(w.id); }}
              disabled={approveMutation.isPending}
              className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
            >
              Approve
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setRejectTarget(w); }}
              className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Fee Waiver Management"
        subtitle={`${pendingWaivers.length} pending approval${pendingWaivers.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={handleExport} className="flex items-center gap-2 btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />
      <div className="page-container space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Pending Waivers" value={pendingWaivers.length} format="number" icon={Clock} />
          <StatCard label="Approved Today" value={approvedToday} format="number" icon={CheckCircle} />
          <StatCard label="Rejected Today" value={rejectedToday} format="number" icon={XCircle} />
          <StatCard label="Total Waived MTD" value={totalWaivedMtd} format="money" compact icon={DollarSign} />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/40',
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              {s === 'PENDING' && pendingWaivers.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingWaivers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={pendingLoading || allLoading}
          enableGlobalFilter
          onRowClick={(row) => setSelectedWaiver(row)}
          emptyMessage="No waivers found"
        />
      </div>

      {/* Detail Panel */}
      {selectedWaiver && (
        <WaiverDetailPanel
          waiver={selectedWaiver}
          onClose={() => setSelectedWaiver(null)}
          onApprove={() => approveMutation.mutate(selectedWaiver.id)}
          onReject={() => { setRejectTarget(selectedWaiver); setSelectedWaiver(null); }}
        />
      )}

      {/* Reject Dialog */}
      {rejectTarget && <RejectDialog waiver={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </>
  );
}
