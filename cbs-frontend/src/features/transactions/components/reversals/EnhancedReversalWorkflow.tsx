import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { transactionApi, type ReversalPreview, type ReversalRequest, type ReversalResult, type Transaction } from '../../api/transactionApi';

const REASON_OPTIONS: Array<{ value: string; label: string; subReasons: string[] }> = [
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request', subReasons: ['Customer Cancellation', 'Erroneous Debit', 'Customer Withdrawal'] },
  { value: 'SYSTEM_ERROR', label: 'System Error', subReasons: ['Switch Timeout', 'Posting Failure', 'Duplicate Journal'] },
  { value: 'FRAUDULENT_TRANSACTION', label: 'Fraudulent Transaction', subReasons: ['Account Takeover', 'Unauthorized Access', 'Suspected Scam'] },
  { value: 'DUPLICATE_PROCESSING', label: 'Duplicate Processing', subReasons: ['Double Posting', 'Duplicate Transfer', 'Retry Failure'] },
  { value: 'COMPLIANCE_ORDER', label: 'Compliance Order', subReasons: ['AML Hold', 'Regulatory Direction', 'Court Order'] },
];

interface EnhancedReversalWorkflowProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function EnhancedReversalWorkflow({
  transaction,
  open,
  onClose,
  onCompleted,
}: EnhancedReversalWorkflowProps) {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState<ReversalRequest>({
    reasonCategory: 'CUSTOMER_REQUEST',
    subReason: 'Customer Cancellation',
    notes: '',
    requestedSettlement: 'IMMEDIATE',
  });
  const [preview, setPreview] = useState<ReversalPreview | null>(null);
  const [result, setResult] = useState<ReversalResult | null>(null);
  const [isPreviewLoading, setPreviewLoading] = useState(false);
  const [isSubmitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setPreview(null);
      setResult(null);
      setRequest({
        reasonCategory: 'CUSTOMER_REQUEST',
        subReason: 'Customer Cancellation',
        notes: '',
        requestedSettlement: 'IMMEDIATE',
      });
    }
  }, [open]);

  const selectedReason = useMemo(
    () => REASON_OPTIONS.find((option) => option.value === request.reasonCategory) ?? REASON_OPTIONS[0],
    [request.reasonCategory],
  );

  if (!open || !transaction) {
    return null;
  }

  const requiresNotes = request.reasonCategory === 'COMPLIANCE_ORDER';

  const handleLoadPreview = async () => {
    if (requiresNotes && !request.notes?.trim()) {
      toast.error('Notes are required for Compliance Order reversals');
      return;
    }
    setPreviewLoading(true);
    try {
      const nextPreview = await transactionApi.previewReversal(transaction.id, request);
      setPreview(nextPreview);
      setStep(2);
    } catch {
      toast.error('Failed to preview reversal');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const nextResult = await transactionApi.reverseTransaction(transaction.id, request);
      setResult(nextResult);
      setStep(4);
      onCompleted?.();
    } catch {
      toast.error('Failed to submit reversal');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold">Enhanced Reversal Workflow</h3>
              <p className="mt-1 text-sm text-muted-foreground">{transaction.reference}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b px-6 py-3 text-xs font-medium text-muted-foreground">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className={`rounded-full px-2.5 py-1 ${step >= stepNumber ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                Step {stepNumber}
              </div>
            ))}
          </div>

          <div className="space-y-5 px-6 py-5">
            {step === 1 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Reason Category</label>
                    <select
                      value={request.reasonCategory}
                      onChange={(event) => {
                        const option = REASON_OPTIONS.find((item) => item.value === event.target.value) ?? REASON_OPTIONS[0];
                        setRequest((current) => ({
                          ...current,
                          reasonCategory: option.value,
                          subReason: option.subReasons[0],
                        }));
                      }}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      {REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Sub Reason</label>
                    <select
                      value={request.subReason}
                      onChange={(event) => setRequest((current) => ({ ...current, subReason: event.target.value }))}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      {selectedReason.subReasons.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Settlement Timing</label>
                    <select
                      value={request.requestedSettlement}
                      onChange={(event) => setRequest((current) => ({
                        ...current,
                        requestedSettlement: event.target.value as ReversalRequest['requestedSettlement'],
                      }))}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="IMMEDIATE">Immediate</option>
                      <option value="NEXT_BUSINESS_DAY">Next Business Day</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Notes</label>
                  <textarea
                    value={request.notes}
                    onChange={(event) => setRequest((current) => ({ ...current, notes: event.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Add context for the reversal request."
                  />
                  {requiresNotes && !request.notes?.trim() && (
                    <p className="mt-1 text-xs text-red-500">Notes are required for Compliance Order reversals.</p>
                  )}
                </div>
              </>
            )}

            {step === 2 && preview && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Reversal of {preview.transactionRef}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Original: {preview.originalDirection} {formatMoney(preview.originalAmount)} on {preview.originalAccountNumber}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reversal: {preview.reversalDirection} {formatMoney(preview.originalAmount)} back to {preview.customerAccountNumber}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">GL Impact</p>
                    <p className="mt-2 text-sm">DR {preview.glDebitAccount}</p>
                    <p className="mt-1 text-sm">CR {preview.glCreditAccount}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Settlement</p>
                    <p className="mt-2 text-sm">{preview.settlementTiming}</p>
                    {preview.dualAuthorizationRequired && (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Dual authorization required
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && preview && (
              <div className="space-y-4">
                {preview.dualAuthorizationRequired ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                    Amount exceeds ₦1M. A second approver will be required before the reversal is executed.
                  </div>
                ) : (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
                    This reversal can be executed immediately.
                  </div>
                )}

                <div className="rounded-xl border p-4 text-sm">
                  <p><span className="font-medium">Reason:</span> {selectedReason.label}</p>
                  <p className="mt-1"><span className="font-medium">Sub reason:</span> {request.subReason}</p>
                  {request.notes && <p className="mt-1"><span className="font-medium">Notes:</span> {request.notes}</p>}
                </div>
              </div>
            )}

            {step === 4 && result && (
              <div className="space-y-4">
                <div className={`rounded-xl border p-4 ${result.approvalRequired ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20' : 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20'}`}>
                  <div className="flex items-start gap-3">
                    {result.approvalRequired ? <AlertTriangle className="mt-0.5 h-5 w-5" /> : <CheckCircle2 className="mt-0.5 h-5 w-5" />}
                    <div>
                      <p className="font-semibold">{result.approvalRequired ? 'Pending Approval' : 'Reversal Submitted'}</p>
                      <p className="mt-1 text-sm">{result.message}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4 text-sm">
                    <p><span className="font-medium">Workflow Ref:</span> {result.requestRef}</p>
                    {result.reversalRef && <p className="mt-1"><span className="font-medium">Reversal Ref:</span> {result.reversalRef}</p>}
                    {result.approvalRequestCode && <p className="mt-1"><span className="font-medium">Approval Code:</span> {result.approvalRequestCode}</p>}
                  </div>
                  {!result.approvalRequired && result.adviceDownloadUrl && (
                    <div className="rounded-xl border p-4 text-sm">
                      <p className="font-medium">Advice Letter</p>
                      <button
                        onClick={() => transactionApi.downloadReversalAdvice(result.adviceDownloadUrl!)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                        Download Advice
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              {step === 4 ? 'Close' : 'Cancel'}
            </button>

            <div className="flex items-center gap-3">
              {step > 1 && step < 4 && (
                <button onClick={() => setStep((current) => current - 1)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  Back
                </button>
              )}

              {step === 1 && (
                <button
                  onClick={handleLoadPreview}
                  disabled={isPreviewLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Preview Impact
                </button>
              )}

              {step === 2 && (
                <button onClick={() => setStep(3)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Continue
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isSubmitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit Reversal
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
