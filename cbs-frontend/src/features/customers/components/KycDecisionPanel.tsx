import { useState } from 'react';
import { CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useKycDecide } from '../hooks/useCustomers';

const RISK_RATINGS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'PEP', 'SANCTIONED'];

const DECISIONS = [
  { key: 'APPROVE', label: 'Approve', desc: 'Customer KYC verified — enable full account access', icon: CheckCircle2, color: 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800', btnColor: 'bg-green-600 hover:bg-green-700' },
  { key: 'REJECT', label: 'Reject', desc: 'KYC failed — suspend account access', icon: XCircle, color: 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800', btnColor: 'bg-red-600 hover:bg-red-700' },
  { key: 'REQUEST_DOCUMENTS', label: 'Request Documents', desc: 'Additional documents needed from customer', icon: FileText, color: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800', btnColor: 'bg-amber-600 hover:bg-amber-700' },
] as const;

interface KycDecisionPanelProps {
  customerId: number;
  currentKycStatus: string;
  onDecision?: () => void;
}

export function KycDecisionPanel({ customerId, currentKycStatus, onDecision }: KycDecisionPanelProps) {
  const decideMut = useKycDecide();
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [riskRating, setRiskRating] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    if (selected === 'REJECT' && !notes.trim()) { toast.error('Notes are required for rejection'); return; }

    if (selected === 'REJECT' && !showConfirm) { setShowConfirm(true); return; }

    decideMut.mutate(
      { customerId, decision: selected, notes: notes.trim() || undefined, riskRating: riskRating || undefined },
      {
        onSuccess: () => { toast.success(`KYC decision: ${selected}`); onDecision?.(); },
        onError: () => toast.error('Failed to submit decision'),
      },
    );
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">KYC Decision</h3>

      {/* Decision cards */}
      <div className="space-y-2">
        {DECISIONS.map((d) => {
          const Icon = d.icon;
          const isSelected = selected === d.key;
          return (
            <button
              key={d.key}
              onClick={() => { setSelected(d.key); setShowConfirm(false); }}
              className={cn('w-full text-left rounded-xl border-2 p-4 transition-all', isSelected ? d.color + ' ring-2 ring-primary/30' : 'border-border hover:bg-muted/30')}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-6 h-6', isSelected ? '' : 'text-muted-foreground')} />
                <div>
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium mb-1">
          Decision Notes {selected === 'REJECT' && <span className="text-red-500">*</span>}
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Enter notes..."
          className={cn(inputCls, 'resize-none')} />
      </div>

      {/* Risk Rating Override */}
      <div>
        <label className="block text-xs font-medium mb-1">Risk Rating Override</label>
        <select value={riskRating} onChange={(e) => setRiskRating(e.target.value)} className={inputCls}>
          <option value="">Keep current</option>
          {RISK_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Reject confirmation */}
      {showConfirm && selected === 'REJECT' && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">Confirm Rejection</p>
            <p className="text-xs text-red-700 dark:text-red-500">This will suspend the customer's account access. Continue?</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selected || decideMut.isPending}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50',
          selected ? DECISIONS.find((d) => d.key === selected)?.btnColor ?? 'bg-primary hover:bg-primary/90' : 'bg-gray-400',
        )}
      >
        {decideMut.isPending ? 'Submitting...' : showConfirm ? 'Confirm & Submit' : 'Submit Decision'}
      </button>
    </div>
  );
}
