import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Clock, Loader2, X, AlertTriangle,
  RotateCcw, Download, Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { transactionApi, type ReversalListItem } from '../api/transactionApi';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

export function ReversalApprovalPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [selectedReversal, setSelectedReversal] = useState<ReversalListItem | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: reversals, isLoading } = useQuery({
    queryKey: ['transaction-reversals', statusFilter],
    queryFn: () => transactionApi.listReversals({ status: statusFilter || undefined, page: 0, size: 50 }),
    staleTime: 15_000,
  });

  const { data: counts } = useQuery({
    queryKey: ['transaction-reversals', 'counts'],
    queryFn: () => transactionApi.getReversalCounts(),
    staleTime: 15_000,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['transaction-reversals'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => transactionApi.approveReversal(id),
    onSuccess: (result) => {
      toast.success(result.message || 'Reversal approved');
      invalidateAll();
      setSelectedReversal(null);
    },
    onError: () => toast.error('Failed to approve reversal'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => transactionApi.rejectReversal(id, reason),
    onSuccess: (result) => {
      toast.success(result.message || 'Reversal rejected');
      invalidateAll();
      setSelectedReversal(null);
      setRejectDialogOpen(false);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject reversal'),
  });

  const items = reversals?.content ?? [];

  return (
    <>
      <PageHeader
        title="Reversal Approvals"
        subtitle="Review and approve or reject transaction reversal requests requiring dual authorization."
      />

      <div className="page-container space-y-5">
        {/* Dashboard Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Approval</p>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30"><Clock className="w-4 h-4" /></div>
            </div>
            <p className="mt-2 text-2xl font-bold">{counts?.pendingApproval ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <div className="p-1.5 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30"><CheckCircle className="w-4 h-4" /></div>
            </div>
            <p className="mt-2 text-2xl font-bold">{counts?.completed ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rejected</p>
              <div className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30"><XCircle className="w-4 h-4" /></div>
            </div>
            <p className="mt-2 text-2xl font-bold">{counts?.rejected ?? 0}</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reversal requests found</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Request Ref</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Transaction</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Requested By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Requested At</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 text-sm font-mono">{item.requestRef}</td>
                    <td className="px-4 py-3 text-sm font-mono">{item.transactionRef}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-medium">{formatMoney(item.amount, item.currencyCode)}</td>
                    <td className="px-4 py-3 text-sm">{item.reasonCategory?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm">{item.requestedBy}</td>
                    <td className="px-4 py-3 text-sm">{formatRelative(item.requestedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status?.replace('_', ' ')} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedReversal(item)} className="p-1.5 rounded-md hover:bg-muted" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status === 'PENDING_APPROVAL' && (
                          <>
                            <button onClick={() => approveMutation.mutate(item.id)} disabled={approveMutation.isPending}
                              className="p-1.5 rounded-md hover:bg-green-50 text-green-600" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedReversal(item); setRejectDialogOpen(true); }}
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-600" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReversal && !rejectDialogOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setSelectedReversal(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold">Reversal Request Details</h3>
                <button onClick={() => setSelectedReversal(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedReversal.status?.replace('_', ' ')} />
                  <span className="text-lg font-bold font-mono">{formatMoney(selectedReversal.amount, selectedReversal.currencyCode)}</span>
                </div>

                <div className="rounded-lg border divide-y text-sm">
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Request Ref</span><span className="font-mono">{selectedReversal.requestRef}</span></div>
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Transaction Ref</span><span className="font-mono">{selectedReversal.transactionRef}</span></div>
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Reason</span><span>{selectedReversal.reasonCategory?.replace(/_/g, ' ')}</span></div>
                  {selectedReversal.subReason && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Sub-Reason</span><span>{selectedReversal.subReason}</span></div>}
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Settlement</span><span>{selectedReversal.requestedSettlement?.replace(/_/g, ' ')}</span></div>
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Requested By</span><span>{selectedReversal.requestedBy}</span></div>
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Requested At</span><span>{formatDateTime(selectedReversal.requestedAt)}</span></div>
                  {selectedReversal.approvedBy && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Approved By</span><span>{selectedReversal.approvedBy}</span></div>}
                  {selectedReversal.approvedAt && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Approved At</span><span>{formatDateTime(selectedReversal.approvedAt)}</span></div>}
                  {selectedReversal.rejectedBy && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Rejected By</span><span className="text-red-600">{selectedReversal.rejectedBy}</span></div>}
                  {selectedReversal.rejectionReason && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Rejection Reason</span><span className="text-red-600">{selectedReversal.rejectionReason}</span></div>}
                  {selectedReversal.reversalRef && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Reversal Ref</span><span className="font-mono text-green-600">{selectedReversal.reversalRef}</span></div>}
                </div>

                {selectedReversal.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/30 rounded-lg p-3">{selectedReversal.notes}</p>
                  </div>
                )}

                {selectedReversal.status === 'PENDING_APPROVAL' && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    This reversal exceeds the dual-authorization threshold and requires approval from a CBS Administrator.
                  </div>
                )}

                {selectedReversal.status === 'PENDING_APPROVAL' && (
                  <div className="flex gap-3 pt-2 border-t">
                    <button onClick={() => approveMutation.mutate(selectedReversal.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve Reversal
                    </button>
                    <button onClick={() => setRejectDialogOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {selectedReversal.status === 'COMPLETED' && selectedReversal.adviceDownloadUrl && (
                  <button onClick={() => void transactionApi.downloadReversalAdvice(selectedReversal.adviceDownloadUrl!)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
                    <Download className="w-4 h-4" /> Download Advice Letter
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && selectedReversal && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-4">
              <h3 className="font-semibold text-lg text-red-600">Reject Reversal</h3>
              <p className="text-sm text-muted-foreground">
                {selectedReversal.requestRef} — {formatMoney(selectedReversal.amount, selectedReversal.currencyCode)}
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Rejection Reason</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  rows={3} placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}
                  className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => rejectMutation.mutate({ id: selectedReversal.id, reason: rejectReason })}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
