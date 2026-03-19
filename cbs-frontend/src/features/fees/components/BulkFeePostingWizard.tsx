import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Loader2, ChevronRight, Users, DollarSign, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getFeeDefinitions,
  previewBulkFeeJob,
  createBulkFeeJob,
  type FeeDefinition,
  type BulkFeePreview,
} from '../api/feeApi';

const PERIODIC_SCHEDULES = ['MONTHLY', 'QUARTERLY', 'ANNUAL'];

const inputCls = cn(
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
);
const labelCls = 'block text-sm font-medium mb-1';

interface BulkFeePostingWizardProps {
  onComplete: () => void;
}

type WizardStep = 'select' | 'preview' | 'results';

interface JobResults {
  feeName: string;
  totalAccounts: number;
  charged: number;
  failed: number;
  totalAmount: number;
}

export function BulkFeePostingWizard({ onComplete }: BulkFeePostingWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState<BulkFeePreview | null>(null);
  const [results, setResults] = useState<JobResults | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { data: allFees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['fee-definitions'],
    queryFn: getFeeDefinitions,
  });

  const periodicFees = allFees.filter(
    (f: FeeDefinition) => PERIODIC_SCHEDULES.includes(f.schedule) && f.status === 'ACTIVE',
  );

  const previewMutation = useMutation({
    mutationFn: () => previewBulkFeeJob(selectedFeeId),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
    },
  });

  const handlePreview = () => {
    if (!selectedFeeId || !effectiveDate) return;
    previewMutation.mutate();
  };

  const handlePost = async () => {
    if (!preview) return;
    setIsPosting(true);
    try {
      const job = await createBulkFeeJob(selectedFeeId, effectiveDate);
      setResults({
        feeName: job.feeName,
        totalAccounts: job.affectedAccounts,
        charged: job.processedCount,
        failed: job.failedCount,
        totalAmount: job.totalAmount ?? preview.totalAmount,
      });
      setStep('results');
    } finally {
      setIsPosting(false);
    }
  };

  const selectedFee = periodicFees.find((f: FeeDefinition) => f.id === selectedFeeId);

  // ─── Step Indicator ───────────────────────────────────────────────────────

  const steps = [
    { id: 'select', label: 'Select Fee' },
    { id: 'preview', label: 'Preview' },
    { id: 'results', label: 'Results' },
  ];
  const stepIndex = { select: 0, preview: 1, results: 2 }[step];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Step progress bar */}
      <div className="px-6 pt-5 pb-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    i < stepIndex
                      ? 'bg-primary text-primary-foreground'
                      : i === stepIndex
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                      : 'bg-muted text-muted-foreground border',
                  )}
                >
                  {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    i === stepIndex ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* ── Step 1: Select Fee ─────────────────────────────────────────── */}
        {step === 'select' && (
          <div className="space-y-5 max-w-lg">
            <div>
              <h3 className="text-base font-semibold">Select Fee Definition</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose a periodic fee to post in bulk across all applicable accounts
              </p>
            </div>

            <div>
              <label className={labelCls}>Fee Definition *</label>
              {feesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading fees...
                </div>
              ) : (
                <select
                  value={selectedFeeId}
                  onChange={(e) => setSelectedFeeId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a fee...</option>
                  {periodicFees.map((fee: FeeDefinition) => (
                    <option key={fee.id} value={fee.id}>
                      [{fee.schedule}] {fee.name} — {fee.code}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedFee && (
              <div className="rounded-lg bg-muted/50 border p-4 space-y-2 text-sm">
                <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Fee Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{selectedFee.category.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">Schedule:</span>
                  <span>{selectedFee.schedule}</span>
                  <span className="text-muted-foreground">Calc Type:</span>
                  <span>{selectedFee.calcType}</span>
                  {selectedFee.calcType === 'FLAT' && (
                    <>
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">₦{selectedFee.flatAmount?.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Effective Date *</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!selectedFeeId || !effectiveDate || previewMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Preview Impact
              </button>
            </div>

            {previewMutation.isError && (
              <p className="text-sm text-destructive">Failed to load preview. Please try again.</p>
            )}
          </div>
        )}

        {/* ── Step 2: Preview ────────────────────────────────────────────── */}
        {step === 'preview' && preview && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold">Posting Preview</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Review the impact before confirming the bulk posting
              </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Accounts Affected</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                    {preview.affectedAccounts.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-green-50 dark:bg-green-900/20 p-4 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total to be Charged</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                    ₦{(preview.totalAmount / 1_000_000).toFixed(2)}M
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-muted p-4">
                <p className="text-xs text-muted-foreground">Effective Date</p>
                <p className="text-base font-semibold mt-1">
                  {new Date(effectiveDate).toLocaleDateString('en-NG', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Summary text */}
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <strong>₦{(preview.totalAmount / 1_000_000).toFixed(2)}M</strong> will be charged to{' '}
              <strong>{preview.affectedAccounts.toLocaleString()} accounts</strong> on{' '}
              {new Date(effectiveDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}.
              This action cannot be undone.
            </div>

            {/* Sample accounts */}
            <div>
              <p className="text-sm font-medium mb-2">Sample Affected Accounts (top 5)</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Account Number</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleAccounts.map((acc) => (
                      <tr key={acc.accountNumber} className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-mono">{acc.accountNumber}</td>
                        <td className="px-4 py-2.5">{acc.customerName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          ₦{acc.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Showing 5 of {preview.affectedAccounts.toLocaleString()} accounts
              </p>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                disabled={isPosting}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePost}
                disabled={isPosting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Post
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Results ────────────────────────────────────────────── */}
        {step === 'results' && results && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Bulk Posting Complete</h3>
                <p className="text-sm text-muted-foreground">{results.feeName}</p>
              </div>
            </div>

            {/* Results summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Successfully Charged</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                  {results.charged.toLocaleString()}
                </p>
              </div>
              <div className={cn('rounded-xl border p-4', results.failed > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-muted')}>
                <p className="text-xs text-muted-foreground mb-1">Failed</p>
                <p className={cn('text-2xl font-bold tabular-nums', results.failed > 0 ? 'text-red-700 dark:text-red-300' : 'text-foreground')}>
                  {results.failed.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Amount Charged</p>
                <p className="text-xl font-bold tabular-nums">
                  ₦{((results.totalAmount * results.charged) / results.totalAccounts / 1_000_000).toFixed(2)}M
                </p>
              </div>
            </div>

            {results.failed > 0 && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm font-medium">
                    {results.failed} account{results.failed !== 1 ? 's' : ''} could not be charged
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Common reasons: insufficient balance, account frozen, dormant accounts.
                  Please review the failed items in the charge history report.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onComplete}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
