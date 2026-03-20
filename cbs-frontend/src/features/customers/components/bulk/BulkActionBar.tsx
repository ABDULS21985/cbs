import { useState } from 'react';
import { X, Users, UserCheck, Tag, Send, Download, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBulkStatusChange, useBulkAssignRm, useBulkAssignSegment } from '../../hooks/useCustomerAnalytics';

interface BulkActionBarProps {
  selectedIds: number[];
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const [showAction, setShowAction] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [reason, setReason] = useState('');

  const bulkStatus = useBulkStatusChange();
  const bulkRm = useBulkAssignRm();
  const bulkSegment = useBulkAssignSegment();

  const isProcessing = bulkStatus.isPending || bulkRm.isPending || bulkSegment.isPending;

  const handleExecute = () => {
    if (!targetValue) return;

    const onSuccess = (data: { updated: number; failed: number }) => {
      toast.success(`${data.updated} updated, ${data.failed} failed`);
      setShowAction(null);
      setTargetValue('');
      onClear();
    };
    const onError = () => toast.error('Bulk operation failed');

    switch (showAction) {
      case 'status':
        bulkStatus.mutate({ customerIds: selectedIds, targetStatus: targetValue, reason }, { onSuccess, onError });
        break;
      case 'rm':
        bulkRm.mutate({ customerIds: selectedIds, relationshipManager: targetValue }, { onSuccess, onError });
        break;
      case 'segment':
        bulkSegment.mutate({ customerIds: selectedIds, segmentCode: targetValue }, { onSuccess, onError });
        break;
    }
  };

  if (selectedIds.length === 0) return null;

  const actions = [
    { key: 'status', label: 'Change Status', icon: Shield },
    { key: 'rm', label: 'Assign RM', icon: UserCheck },
    { key: 'segment', label: 'Assign Segment', icon: Tag },
  ];

  return (
    <div className="sticky top-0 z-20 rounded-xl border bg-primary/5 border-primary/20 p-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{selectedIds.length} selected</span>
      </div>

      <div className="flex gap-2">
        {actions.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setShowAction(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <button onClick={onClear} className="ml-auto p-1.5 rounded-md hover:bg-muted">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Action dialog */}
      {showAction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAction(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">
                {showAction === 'status' ? 'Change Status' : showAction === 'rm' ? 'Assign RM' : 'Assign Segment'}
              </h3>
              <p className="text-sm text-muted-foreground">Applying to {selectedIds.length} customers</p>

              {showAction === 'status' && (
                <>
                  <select value={targetValue} onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value="">Select status…</option>
                    {['ACTIVE', 'DORMANT', 'SUSPENDED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
                </>
              )}

              {showAction === 'rm' && (
                <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="RM name"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
              )}

              {showAction === 'segment' && (
                <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="Segment code"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAction(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleExecute} disabled={!targetValue || isProcessing}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {isProcessing ? 'Processing...' : `Apply to ${selectedIds.length}`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
