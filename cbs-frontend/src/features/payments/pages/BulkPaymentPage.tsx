import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FileUploadStep } from '../components/bulk/FileUploadStep';
import { ValidationPreviewStep } from '../components/bulk/ValidationPreviewStep';
import { ProcessingProgressStep } from '../components/bulk/ProcessingProgressStep';
import { bulkPaymentApi } from '../api/bulkPaymentApi';

type Step = 'upload' | 'validate' | 'approve' | 'processing';

export function BulkPaymentPage() {
  useEffect(() => { document.title = 'Bulk Payments | CBS'; }, []);
  const [step, setStep] = useState<Step>('upload');
  const [batchId, setBatchId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const { data: batch } = useQuery({
    queryKey: ['bulk-payment', batchId],
    queryFn: () => bulkPaymentApi.getBatch(batchId!),
    enabled: !!batchId,
  });

  const submitMutation = useMutation({
    mutationFn: () => bulkPaymentApi.submitForApproval(batchId!, notes),
    onSuccess: () => { toast.success('Batch submitted for approval'); setStep('processing'); },
    onError: () => toast.error('Failed to submit batch'),
  });

  const steps = [
    { key: 'upload', label: '1. Upload' },
    { key: 'validate', label: '2. Validate' },
    { key: 'approve', label: '3. Approve' },
    { key: 'processing', label: '4. Processing' },
  ];

  return (
    <>
      <PageHeader title="Bulk Payments" subtitle="Upload and process bulk payment files" />
      <div className="page-container space-y-6">
        {/* Step indicator */}
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <div key={s.key} className={`flex-1 text-center py-2 text-xs font-medium rounded-md ${step === s.key ? 'bg-primary text-primary-foreground' : i < steps.findIndex((x) => x.key === step) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              {s.label}
            </div>
          ))}
        </div>

        {step === 'upload' && (
          <FileUploadStep
            onUploadComplete={(id) => { setBatchId(id); setStep('validate'); }}
            templateUrl=""
          />
        )}

        {step === 'validate' && batch && (
          <ValidationPreviewStep
            batch={batch}
            onBack={() => { setStep('upload'); setBatchId(null); }}
            onContinue={() => setStep('approve')}
          />
        )}

        {step === 'approve' && batch && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h3 className="font-semibold">Batch Summary</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Batch Ref</span><span className="font-mono">{batch.batchRef}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valid Payments</span><span>{batch.validRows}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-mono font-semibold">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(batch.totalAmount)}</span></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Officer Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Add notes for the approver..." />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('validate')} className="flex-1 px-4 py-2.5 border rounded-md text-sm hover:bg-muted">&larr; Back</button>
              <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && batchId && (
          <ProcessingProgressStep batchId={batchId} />
        )}
      </div>
    </>
  );
}
