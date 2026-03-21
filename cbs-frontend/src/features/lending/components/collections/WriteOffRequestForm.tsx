import { useState } from 'react';
import { formatMoney } from '@/lib/formatters';
import { useCloseCase } from '../../hooks/useCollections';
import { toast } from 'sonner';

interface WriteOffRequestFormProps {
  provisionRate?: number;
  onSuccess?: () => void;
}

export function WriteOffRequestForm({ provisionRate = 0.8, onSuccess }: WriteOffRequestFormProps) {
  const [caseId, setCaseId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'PARTIAL' | 'FULL'>('FULL');
  const [recoveryEfforts, setRecoveryEfforts] = useState('');
  const [justification, setJustification] = useState('');

  // Write-offs are processed by closing a collection case with WRITE_OFF_PROPOSED resolution
  const closeCase = useCloseCase();
  const isPending = closeCase.isPending;

  const parsedAmount = parseFloat(amount) || 0;
  const parsedCaseId = parseInt(caseId, 10);
  const provisionHeld = parsedAmount * provisionRate;
  const netImpact = parsedAmount - provisionHeld;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedCaseId || parsedAmount <= 0) return;
    closeCase.mutate(
      {
        caseId: parsedCaseId,
        resolutionType: type === 'FULL' ? 'WRITTEN_OFF' : 'WRITE_OFF_PROPOSED',
        resolutionAmount: parsedAmount,
      },
      {
        onSuccess: () => {
          toast.success('Write-off processed via collection case closure');
          setCaseId('');
          setAmount('');
          setRecoveryEfforts('');
          setJustification('');
          onSuccess?.();
        },
        onError: () => toast.error('Failed to process write-off'),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-6 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Submit Write-Off Request</h3>
      <p className="text-xs text-muted-foreground">Write-offs are processed by closing the associated collection case with a write-off resolution.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Collection Case ID
          </label>
          <input
            type="number"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="e.g. 123"
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Write-Off Amount
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
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Write-Off Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="type" value="FULL" checked={type === 'FULL'} onChange={() => setType('FULL')} className="text-primary" />
            <span className="text-sm">Full Write-Off</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="type" value="PARTIAL" checked={type === 'PARTIAL'} onChange={() => setType('PARTIAL')} className="text-primary" />
            <span className="text-sm">Partial Write-Off</span>
          </label>
        </div>
      </div>

      {parsedAmount > 0 && (
        <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Provision Held</p>
            <p className="text-sm font-mono font-semibold text-green-600">{formatMoney(provisionHeld)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Net Write-Off Impact</p>
            <p className="text-sm font-mono font-semibold text-red-600">{formatMoney(netImpact)}</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Recovery Efforts Undertaken</label>
        <textarea value={recoveryEfforts} onChange={(e) => setRecoveryEfforts(e.target.value)} rows={3} placeholder="Describe all recovery attempts made..." className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Justification</label>
        <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} placeholder="Provide business justification for write-off..." className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isPending || !parsedCaseId || parsedAmount <= 0}
          className="px-6 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isPending ? 'Processing...' : 'Process Write-Off'}
        </button>
      </div>
    </form>
  );
}
