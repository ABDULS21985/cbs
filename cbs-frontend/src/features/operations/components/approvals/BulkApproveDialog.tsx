import { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import type { ApprovalRequest } from '../../api/approvalApi';

interface BulkApproveDialogProps {
  open: boolean;
  selectedItems: ApprovalRequest[];
  onConfirm: (comments?: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function BulkApproveDialog({
  open,
  selectedItems,
  onConfirm,
  onClose,
  loading = false,
}: BulkApproveDialogProps) {
  const [comments, setComments] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(comments || undefined);
    setComments('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-base font-semibold">
              Bulk Approve {selectedItems.length} Request{selectedItems.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning */}
          <div className="flex gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Note:</strong> You are about to approve {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} at once.
              Bulk rejection is not available — rejections require an individual reason per request.
            </p>
          </div>

          {/* Item list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Selected Requests
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 px-3 py-2.5 bg-muted/40 rounded-lg"
                >
                  <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.priority === 'CRITICAL' ? 'bg-red-500' :
                    item.priority === 'HIGH' ? 'bg-amber-500' :
                    item.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-medium text-muted-foreground">{item.requestNumber}</p>
                    <p className="text-xs truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.requestedBy} &middot; {item.priority}</p>
                  </div>
                  {item.amount !== undefined && (
                    <span className="text-xs font-mono font-medium flex-shrink-0">
                      {item.currency === 'USD' ? '$' : '₦'}{item.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Optional Comments
              <span className="text-muted-foreground font-normal ml-1">(applied to all)</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter comments to apply to all approved items..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm Approve {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
