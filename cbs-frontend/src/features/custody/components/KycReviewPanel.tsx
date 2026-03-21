import { useState } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useVerifyCounterpartyKyc } from '../hooks/useCustodyExt';
import type { Counterparty } from '../types/counterparty';
import { toast } from 'sonner';

interface KycReviewPanelProps {
  counterparty: Counterparty;
  onClose: () => void;
}

const KYC_CHECKLIST = [
  'Corporate registration verified',
  'LEI validation completed',
  'AML/CFT screening passed',
  'PEP (Politically Exposed Person) check',
  'Sanctions list screening',
  'Ultimate Beneficial Owner identified',
  'Financial statements reviewed',
  'Credit assessment completed',
  'Regulatory compliance confirmed',
];

export function KycReviewPanel({ counterparty, onClose }: KycReviewPanelProps) {
  const verifyKyc = useVerifyCounterpartyKyc();
  const [form, setForm] = useState({
    reviewedBy: '',
    kycStatus: 'VERIFIED',
    reviewDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [checklist, setChecklist] = useState<boolean[]>(KYC_CHECKLIST.map(() => false));

  const toggleCheck = (idx: number) => {
    setChecklist((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const allChecked = checklist.every(Boolean);

  const handleSubmit = () => {
    if (!form.reviewedBy) {
      toast.error('Reviewer name is required');
      return;
    }
    // Backend POST /{code}/verify-kyc accepts only the path param — no body
    verifyKyc.mutate(counterparty.counterpartyCode, {
      onSuccess: () => {
        toast.success('KYC verification submitted');
        onClose();
      },
    });
  };

  const riskColors: Record<string, string> = { LOW: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600' };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-background border-l shadow-xl overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">KYC Review</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Counterparty Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{counterparty.counterpartyName}</p>
              <StatusBadge status={counterparty.counterpartyType} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{counterparty.counterpartyCode}</p>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <div><span className="text-muted-foreground">Country:</span> {counterparty.country}</div>
              <div><span className="text-muted-foreground">Risk:</span> <span className={cn('font-medium', riskColors[counterparty.riskCategory])}>{counterparty.riskCategory}</span></div>
            </div>
          </div>

          {/* Current KYC Status */}
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Current KYC Status</p>
            <div className="flex items-center gap-3">
              <StatusBadge status={counterparty.kycStatus} dot />
              <span className="text-xs text-muted-foreground">
                Last reviewed: {counterparty.kycReviewDate ? formatDate(counterparty.kycReviewDate) : 'Never'}
              </span>
            </div>
          </div>

          {/* Document Checklist */}
          <div>
            <p className="text-sm font-medium mb-3">Document Checklist</p>
            <div className="space-y-2">
              {KYC_CHECKLIST.map((item, idx) => (
                <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => toggleCheck(idx)}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      checklist[idx]
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-muted-foreground/30 hover:border-primary/50',
                    )}
                  >
                    {checklist[idx] && <Check className="w-3 h-3" />}
                  </button>
                  <span className={cn('text-sm', checklist[idx] && 'line-through text-muted-foreground')}>{item}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {checklist.filter(Boolean).length}/{KYC_CHECKLIST.length} completed
            </p>
          </div>

          {/* Review Form */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Review Decision</p>
            <div>
              <label className="text-xs text-muted-foreground">Reviewed By *</label>
              <input
                className="w-full mt-1 input"
                placeholder="Your name"
                value={form.reviewedBy}
                onChange={(e) => setForm((f) => ({ ...f, reviewedBy: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">KYC Status</label>
                <select
                  className="w-full mt-1 input"
                  value={form.kycStatus}
                  onChange={(e) => setForm((f) => ({ ...f, kycStatus: e.target.value }))}
                >
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Review Date</label>
                <input
                  type="date"
                  className="w-full mt-1 input"
                  value={form.reviewDate}
                  onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <textarea
                className="w-full mt-1 input"
                rows={3}
                placeholder="Review notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          {!allChecked && form.kycStatus === 'VERIFIED' && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
              Not all checklist items are completed. Ensure all documents are verified before approving.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={verifyKyc.isPending || !form.reviewedBy}
            className="w-full btn-primary"
          >
            {verifyKyc.isPending ? 'Submitting...' : 'Submit KYC Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
