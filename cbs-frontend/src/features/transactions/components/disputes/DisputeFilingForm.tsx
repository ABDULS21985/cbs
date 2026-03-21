import { useEffect, useMemo, useState } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import type { Transaction } from '../../api/transactionApi';
import { useDisputes } from '../../hooks/useDisputes';

const DISPUTE_REASONS = [
  { value: 'UNAUTHORIZED', label: 'Unauthorized' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'WRONG_AMOUNT', label: 'Wrong Amount' },
  { value: 'NON_RECEIPT', label: 'Non-Receipt' },
  { value: 'OTHER', label: 'Other' },
];

interface DisputeFilingFormProps {
  open: boolean;
  transaction: Transaction | null;
  defaultEmail?: string;
  defaultPhone?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function DisputeFilingForm({
  open,
  transaction,
  defaultEmail,
  defaultPhone,
  onClose,
  onSubmitted,
}: DisputeFilingFormProps) {
  const [reasonCode, setReasonCode] = useState('UNAUTHORIZED');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(defaultEmail ?? '');
  const [contactPhone, setContactPhone] = useState(defaultPhone ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const { raiseDisputeMutation } = useDisputes();

  useEffect(() => {
    if (open) {
      setContactEmail(defaultEmail ?? '');
      setContactPhone(defaultPhone ?? '');
    }
  }, [defaultEmail, defaultPhone, open]);

  const descriptionError = useMemo(() => (!description.trim() ? 'Description is required' : ''), [description]);
  const fileError = useMemo(() => {
    if (files.length > 3) return 'Upload at most 3 files';
    const tooLarge = files.find((file) => file.size > 5 * 1024 * 1024);
    return tooLarge ? `${tooLarge.name} exceeds 5MB` : '';
  }, [files]);

  if (!open || !transaction) {
    return null;
  }

  const handleSubmit = async () => {
    if (descriptionError || fileError) {
      toast.error(descriptionError || fileError);
      return;
    }

    try {
      await raiseDisputeMutation.mutateAsync({
        transactionId: transaction.id,
        payload: {
          reasonCode,
          description: description.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          files,
        },
      });
      toast.success('Dispute submitted successfully');
      onSubmitted?.();
      onClose();
      setDescription('');
      setFiles([]);
      setReasonCode('UNAUTHORIZED');
    } catch {
      toast.error('Failed to submit dispute');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold">Raise Dispute</h3>
              <p className="mt-1 text-sm text-muted-foreground">File a dispute for this completed transaction.</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-semibold">{transaction.reference}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMoney(transaction.debitAmount ?? transaction.creditAmount ?? 0)} | {transaction.postingDate}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Dispute Reason</label>
                <select
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {DISPUTE_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Contact Email</label>
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="name@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Describe what went wrong and what outcome is expected."
                />
                {descriptionError && <p className="mt-1 text-xs text-red-500">{descriptionError}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Contact Phone</label>
                <input
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="080..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Supporting Documents</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm hover:bg-muted/30">
                  <Paperclip className="h-4 w-4" />
                  <span>Attach up to 3 files (max 5MB each)</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
                  />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {files.map((file) => (
                      <p key={file.name}>{file.name}</p>
                    ))}
                  </div>
                )}
                {fileError && <p className="mt-1 text-xs text-red-500">{fileError}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={raiseDisputeMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {raiseDisputeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Dispute
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
