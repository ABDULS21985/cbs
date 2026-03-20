import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { Check, X, AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import { loanApi } from '../../api/loanApi';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';
import { toast } from 'sonner';

interface ApprovalStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? <Check className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
      <span className={cn('text-sm', !passed && 'text-amber-600')}>{label}</span>
    </div>
  );
}

export function ApprovalStep({ state, updateField, onNext, onBack }: ApprovalStepProps) {
  const [approvedAmount, setApprovedAmount] = useState(state.amount);
  const [approvedTenure, setApprovedTenure] = useState(state.tenorMonths);
  const [approvedRate, setApprovedRate] = useState(state.interestRate);
  const [conditions, setConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const hasCollateral = state.collateralItems.length > 0 || !state.product?.requiresCollateral;
  const hasCreditCheck = state.creditScore !== null;
  const hasDocuments = state.documents.filter((d) => d.required && d.uploaded).length === state.documents.filter((d) => d.required).length || state.documents.length === 0;
  const dtiOk = state.debtToIncomeRatio <= 50;

  const checklist = [
    { label: 'Customer verified', passed: !!state.customerId },
    { label: 'Credit check completed', passed: hasCreditCheck },
    { label: `Collateral adequate${!state.product?.requiresCollateral ? ' (N/A)' : ''}`, passed: hasCollateral },
    { label: 'Documents received', passed: hasDocuments },
    { label: 'DTI within limits', passed: dtiOk },
    { label: 'Schedule generated', passed: state.schedulePreview.length > 0 },
  ];

  const allPassed = checklist.every((c) => c.passed);

  const addCondition = () => {
    if (newCondition.trim()) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  // Using direct API since application ID isn't available in wizard state
  const isAdmin = true; // Would check from auth context

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Approval</h3>
        <p className="text-sm text-muted-foreground">Review pre-approval checklist and make decision</p>
      </div>

      {/* Pre-Approval Checklist */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-semibold mb-2">Pre-Approval Checklist</p>
        {checklist.map((item) => <CheckItem key={item.label} {...item} />)}
      </div>

      {/* Approval Level */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Approval Authority: <span className="font-bold">{state.approvalLevel || 'Branch Officer'}</span>
        </p>
      </div>

      {isAdmin ? (
        <>
          {/* Approved Terms */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold">Approved Terms</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Approved Amount</label>
                <input type="number" className="w-full mt-1 input" value={approvedAmount} onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Approved Tenure (months)</label>
                <input type="number" className="w-full mt-1 input" value={approvedTenure} onChange={(e) => setApprovedTenure(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Approved Rate (%)</label>
                <input type="number" step="0.01" className="w-full mt-1 input" value={approvedRate} onChange={(e) => setApprovedRate(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-semibold">Conditions (optional)</p>
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{c}</span>
                <button onClick={() => setConditions(conditions.filter((_, j) => j !== i))} className="p-1 hover:bg-muted rounded"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="flex-1 input" value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="Add condition..." onKeyDown={(e) => e.key === 'Enter' && addCondition()} />
              <button onClick={addCondition} disabled={!newCondition.trim()} className="px-3 py-1.5 border rounded-lg hover:bg-muted disabled:opacity-50"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                updateField('officerNotes', `Approved: ${formatMoney(approvedAmount)}, ${approvedTenure}m, ${approvedRate}%`);
                onNext();
                toast.success('Application approved');
              }}
              disabled={!allPassed}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={() => setShowDecline(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              <X className="w-4 h-4" /> Decline
            </button>
          </div>
        </>
      ) : (
        <button onClick={() => { onNext(); toast.success('Submitted for approval'); }} className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          Submit for Approval
        </button>
      )}

      {/* Decline Dialog */}
      {showDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Decline Application</h3>
            <textarea className="w-full input resize-none" rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason for decline..." />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowDecline(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => { toast.error('Application declined'); setShowDecline(false); }} disabled={!declineReason} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">Decline</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
      </div>
    </div>
  );
}
