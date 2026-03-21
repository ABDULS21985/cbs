import { useState } from 'react';
import { toast } from 'sonner';
import { useLogCollectionAction } from '../../hooks/useCollections';
import { useAuthStore } from '@/stores/authStore';

interface PromiseToPayFormProps {
  caseId: number;
  onSuccess?: () => void;
}

export function PromiseToPayForm({ caseId, onSuccess }: PromiseToPayFormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const user = useAuthStore((s) => s.user);

  // Log promise-to-pay via POST /cases/{caseId}/actions with CollectionActionDto
  const logAction = useLogCollectionAction();
  const isPending = logAction.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    logAction.mutate(
      {
        caseId,
        action: {
          actionType: 'PROMISE_TO_PAY',
          description: `Promise to pay ${amount} by ${date}. ${notes}`.trim(),
          promisedAmount: parseFloat(amount),
          promisedDate: date,
          performedBy: user?.preferred_username ?? 'system',
          outcome: 'PROMISE_RECORDED',
        },
      },
      {
        onSuccess: () => {
          toast.success('Promise to pay logged');
          setAmount('');
          setDate('');
          setNotes('');
          onSuccess?.();
        },
        onError: () => toast.error('Failed to log promise'),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Log Promise to Pay</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Promise Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01"
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Promise Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" required />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional notes..."
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isPending || !amount || !date}
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isPending ? 'Saving...' : 'Log Promise to Pay'}
        </button>
      </div>
    </form>
  );
}
