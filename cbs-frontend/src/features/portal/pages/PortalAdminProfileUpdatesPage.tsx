import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Clock, User, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuthStore } from '@/stores/authStore';
import { portalApi, type ProfileUpdateRequest } from '../api/portalApi';

export function PortalAdminProfileUpdatesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ProfileUpdateRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const isAuthorized = user?.roles?.some(r => ['CBS_ADMIN', 'CBS_OFFICER'].includes(r));

  const { data: pendingUpdates = [], isLoading } = useQuery({
    queryKey: ['portal', 'admin', 'pending-profile-updates'],
    queryFn: () => portalApi.getPendingProfileUpdates(0, 50),
    enabled: !!isAuthorized,
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: number) => portalApi.approveProfileUpdate(requestId),
    onSuccess: () => {
      toast.success('Profile update approved and applied');
      queryClient.invalidateQueries({ queryKey: ['portal', 'admin', 'pending-profile-updates'] });
      setSelectedRequest(null);
    },
    onError: () => toast.error('Failed to approve update'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      portalApi.rejectProfileUpdate(requestId, reason),
    onSuccess: () => {
      toast.success('Profile update rejected');
      queryClient.invalidateQueries({ queryKey: ['portal', 'admin', 'pending-profile-updates'] });
      setSelectedRequest(null);
      setShowRejectDialog(false);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject update'),
  });

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <AlertTriangle className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs mt-1">Only CBS Admins and Officers can review profile update requests.</p>
      </div>
    );
  }

  const formatRequestType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Profile Update Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve or reject customer profile change requests
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{pendingUpdates.length} pending</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : pendingUpdates.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No pending profile update requests to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUpdates.map((req) => (
            <button key={req.id} onClick={() => setSelectedRequest(req)}
              className="w-full text-left rounded-lg border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{formatRequestType(req.requestType)}</span>
                </div>
                <StatusBadge status={req.status ?? 'PENDING'} dot />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">{req.oldValue || '(empty)'}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-primary">{req.newValue}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {req.channel && <span className="px-1.5 py-0.5 bg-muted rounded">{req.channel}</span>}
                {req.submittedAt && <span>{formatRelative(req.submittedAt)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedRequest && !showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Review Profile Update</h3>
              <button onClick={() => setSelectedRequest(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="rounded-lg border divide-y text-sm">
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-mono">#{selectedRequest.id}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{formatRequestType(selectedRequest.requestType)}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-muted-foreground block mb-1">Current Value</span>
                <span className="font-mono text-sm">{selectedRequest.oldValue || '(empty)'}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-muted-foreground block mb-1">Requested Value</span>
                <span className="font-mono text-sm font-medium text-primary">{selectedRequest.newValue}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Channel</span>
                <span>{selectedRequest.channel || 'WEB'}</span>
              </div>
              {selectedRequest.submittedAt && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{formatDateTime(selectedRequest.submittedAt)}</span>
                </div>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Approving this request will immediately update the customer&apos;s profile.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowRejectDialog(true)}
                disabled={rejectMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => selectedRequest.id && approveMutation.mutate(selectedRequest.id)}
                disabled={approveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {showRejectDialog && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-red-600">Reject Profile Update</h3>
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this {formatRequestType(selectedRequest.requestType).toLowerCase()} request.
              The customer will be notified.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rejection Reason</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                rows={3} placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button onClick={() => selectedRequest.id && rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
