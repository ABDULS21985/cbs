import { useState } from 'react';
import { toast } from 'sonner';

interface PromiseToPayFormProps {
  dunningItemId: number;
  onSuccess?: () => void;
}

export function PromiseToPayForm({ dunningItemId, onSuccess }: PromiseToPayFormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  // Promises should be logged via the collection case action log
  const isPending = false;
  const isError = false;
  const error: Error | null = null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;
    // Log promise-to-pay via collection case action log
    toast.info('Promise-to-pay should be logged via the collection case detail page');
    setAmount('');
    setDate('');
    setNotes('');
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Log Promise to Pay</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Promise Amount (NGN)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Promise Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Additional notes..."
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {isError && (
        <p className="text-sm text-red-600">{(error as Error)?.message ?? 'Failed to log promise'}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !amount || !date}
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Log Promise to Pay'}
        </button>
      </div>
    </form>
  );
}
