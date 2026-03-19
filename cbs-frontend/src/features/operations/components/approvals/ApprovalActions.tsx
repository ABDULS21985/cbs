import { useState } from 'react';
import { Check, X, RotateCcw, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalRequest } from '../../api/approvalApi';

interface ApprovalActionsProps {
  request: ApprovalRequest;
  onApprove: (comments?: string) => void;
  onReject: (reason: string) => void;
  onReturn: (comments: string) => void;
  onDelegate: () => void;
  loading?: boolean;
}

type ActiveAction = 'approve' | 'reject' | 'return' | null;

export function ApprovalActions({
  request,
  onApprove,
  onReject,
  onReturn,
  onDelegate,
  loading = false,
}: ApprovalActionsProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [approveComments, setApproveComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [returnComments, setReturnComments] = useState('');

  const isPending = request.status === 'PENDING' || request.status === 'ESCALATED';

  if (!isPending) {
    return (
      <div className="px-4 py-3 bg-muted/30 rounded-lg text-sm text-muted-foreground text-center">
        This request has been <span className="font-medium">{request.status.toLowerCase()}</span> — no further actions available.
      </div>
    );
  }

  const toggleAction = (action: ActiveAction) => {
    setActiveAction((prev) => (prev === action ? null : action));
  };

  const handleApprove = () => {
    onApprove(approveComments || undefined);
    setApproveComments('');
    setActiveAction(null);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(rejectReason);
    setRejectReason('');
    setActiveAction(null);
  };

  const handleReturn = () => {
    if (!returnComments.trim()) return;
    onReturn(returnComments);
    setReturnComments('');
    setActiveAction(null);
  };

  return (
    <div className="space-y-3">
      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {/* Approve */}
        <button
          onClick={() => toggleAction('approve')}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            activeAction === 'approve'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/40',
          )}
          title="Keyboard: A"
        >
          <Check className="w-3.5 h-3.5" />
          Approve
          <kbd className="ml-1 text-xs opacity-60 font-mono">A</kbd>
          {activeAction === 'approve' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Reject */}
        <button
          onClick={() => toggleAction('reject')}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            activeAction === 'reject'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40',
          )}
          title="Keyboard: R"
        >
          <X className="w-3.5 h-3.5" />
          Reject
          <kbd className="ml-1 text-xs opacity-60 font-mono">R</kbd>
          {activeAction === 'reject' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Return for Amendment */}
        <button
          onClick={() => toggleAction('return')}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            activeAction === 'return'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/40',
          )}
          title="Keyboard: N"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Return
          <kbd className="ml-1 text-xs opacity-60 font-mono">N</kbd>
          {activeAction === 'return' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Delegate */}
        <button
          onClick={onDelegate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border bg-muted text-muted-foreground border-border hover:bg-muted/70 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Delegate
        </button>
      </div>

      {/* Inline panels */}
      {activeAction === 'approve' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Approve Request</p>
          <textarea
            value={approveComments}
            onChange={(e) => setApproveComments(e.target.value)}
            placeholder="Optional comments..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-md border border-green-200 dark:border-green-700 bg-white dark:bg-card resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Approval'}
            </button>
            <button
              onClick={() => setActiveAction(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeAction === 'reject' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Reject Request</p>
          <div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
              rows={3}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-card resize-none focus:outline-none focus:ring-2 focus:ring-red-500',
                !rejectReason.trim() ? 'border-red-300 dark:border-red-600' : 'border-red-200 dark:border-red-700',
              )}
              required
            />
            {!rejectReason.trim() && (
              <p className="text-xs text-red-600 mt-1">Rejection reason is mandatory.</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Rejection'}
            </button>
            <button
              onClick={() => setActiveAction(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeAction === 'return' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Return for Amendment</p>
          <div>
            <textarea
              value={returnComments}
              onChange={(e) => setReturnComments(e.target.value)}
              placeholder="Describe what needs to be amended (required)..."
              rows={3}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-card resize-none focus:outline-none focus:ring-2 focus:ring-amber-500',
                !returnComments.trim() ? 'border-amber-300 dark:border-amber-600' : 'border-amber-200 dark:border-amber-700',
              )}
              required
            />
            {!returnComments.trim() && (
              <p className="text-xs text-amber-700 mt-1">Amendment comments are required.</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReturn}
              disabled={loading || !returnComments.trim()}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Return for Amendment'}
            </button>
            <button
              onClick={() => setActiveAction(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
