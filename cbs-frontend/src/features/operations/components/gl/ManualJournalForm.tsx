import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { glApi } from '../../api/glApi';
import { ConfirmDialog } from '@/components/shared';
import { JournalLineEditor, type LineItem } from './JournalLineEditor';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(3, 'Description is required').max(200),
});

type FormValues = z.infer<typeof schema>;

interface ManualJournalFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function makeId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeEmptyLine(): LineItem {
  return { id: makeId(), glCode: '', glName: '', description: '', debit: 0, credit: 0 };
}

export function ManualJournalForm({ open, onClose, onSuccess }: ManualJournalFormProps) {
  const [lines, setLines] = useState<LineItem[]>([makeEmptyLine(), makeEmptyLine()]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: glApi.getChartOfAccounts,
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: glApi.createJournalEntry,
    onSuccess: () => {
      toast.success('Journal entry submitted for approval');
      setLines([makeEmptyLine(), makeEmptyLine()]);
      reset();
      setConfirmOpen(false);
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to submit journal entry');
      setConfirmOpen(false);
    },
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const hasMinLines = lines.filter((l) => l.glCode).length >= 2;

  const onSubmit = (data: FormValues) => {
    if (!isBalanced || !hasMinLines) return;
    setPendingValues(data);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingValues) return;
    const validLines = lines.filter((l) => l.glCode);
    mutation.mutate({
      journalType: 'MANUAL',
      description: pendingValues.description,
      sourceModule: 'MANUAL',
      valueDate: pendingValues.date,
      lines: validLines.map((l) => ({
        glCode: l.glCode,
        debitAmount: l.debit,
        creditAmount: l.credit,
        narration: l.description || undefined,
      })),
    });
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      setLines([makeEmptyLine(), makeEmptyLine()]);
      reset();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold">New Manual Journal Entry</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Enter journal lines with balanced debits and credits</p>
            </div>
            <button onClick={handleClose} disabled={mutation.isPending} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-4 border-b flex-shrink-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    {...register('date')}
                    className={cn('w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring', errors.date && 'border-red-500')}
                  />
                  {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description <span className="text-red-500">*</span></label>
                  <input
                    {...register('description')}
                    placeholder="e.g. Monthly expense accrual"
                    className={cn('w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring', errors.description && 'border-red-500')}
                  />
                  {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              <JournalLineEditor lines={lines} onChange={setLines} accounts={accounts} />

              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, makeEmptyLine()])}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-dashed hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </button>
            </div>

            <div className="px-6 py-4 border-t flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Debits: </span>
                      <span className="font-mono font-semibold">{formatMoney(totalDebit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Credits: </span>
                      <span className="font-mono font-semibold">{formatMoney(totalCredit)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {totalDebit > 0 && totalCredit > 0 ? (
                      isBalanced ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Balanced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          Difference: {formatMoney(Math.abs(totalDebit - totalCredit))}
                        </span>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={mutation.isPending}
                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isBalanced || !hasMinLines || mutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit for Approval
                  </button>
                </div>
              </div>
              {!hasMinLines && (
                <p className="text-xs text-muted-foreground mt-2">At least 2 valid GL lines are required.</p>
              )}
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Submit Journal Entry"
        description={`Submit this manual journal entry for approval? Total: ${formatMoney(totalDebit)} DR / ${formatMoney(totalCredit)} CR.`}
        confirmLabel="Submit for Approval"
        isLoading={mutation.isPending}
      />
    </>
  );
}
