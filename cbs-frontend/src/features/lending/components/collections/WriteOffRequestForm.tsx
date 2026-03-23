import { useState, type FormEvent } from 'react';
import { AlertTriangle, FileX, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useCloseCase } from '../../hooks/useCollections';

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

  const closeCase = useCloseCase();
  const isPending = closeCase.isPending;

  const parsedAmount = parseFloat(amount) || 0;
  const parsedCaseId = parseInt(caseId, 10);
  const provisionHeld = parsedAmount * provisionRate;
  const netImpact = parsedAmount - provisionHeld;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <form onSubmit={handleSubmit} className="lending-section-card space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Resolution Workflow</p>
          <h3 className="mt-2 text-lg font-semibold">Submit Write-Off Request</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Write-offs are processed by closing the associated collection case with the appropriate resolution type.
          </p>
        </div>
        <div className="lending-hero-chip">
          <FileX className="h-3.5 w-3.5 text-primary" /> Case-based resolution
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="writeoff-case-id" className="text-sm font-medium">Collection Case ID</label>
          <input
            id="writeoff-case-id"
            type="number"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            placeholder="e.g. 123"
            className="field-control font-mono"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="writeoff-amount" className="text-sm font-medium">Write-Off Amount</label>
          <input
            id="writeoff-amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="field-control font-mono"
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {([
          {
            value: 'FULL' as const,
            label: 'Full Write-Off',
            description: 'Fully resolve the case as written off once approved.',
          },
          {
            value: 'PARTIAL' as const,
            label: 'Partial Write-Off',
            description: 'Use a proposed write-off resolution for partial balance treatment.',
          },
        ]).map((option) => (
          <label
            key={option.value}
            className={cn(
              'opening-selection-card cursor-pointer',
              type === option.value && 'opening-selection-card-active',
            )}
          >
            <input
              type="radio"
              name="type"
              value={option.value}
              checked={type === option.value}
              onChange={() => setType(option.value)}
              className="sr-only"
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              </div>
              {type === option.value ? <ShieldCheck className="h-5 w-5 text-primary" /> : null}
            </div>
          </label>
        ))}
      </div>

      {parsedAmount > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="lending-note-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Provision Held</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-600">{formatMoney(provisionHeld)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Based on the configured provision rate of {(provisionRate * 100).toFixed(0)}%.</p>
          </div>
          <div className="lending-note-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Net P&L Impact</p>
            <p className="mt-3 text-2xl font-semibold text-rose-600">{formatMoney(netImpact)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Outstanding write-off impact after provision coverage is applied.</p>
          </div>
        </div>
      ) : (
        <div className="lending-note-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Enter the write-off amount to preview impact</p>
              <p className="mt-1 text-sm text-muted-foreground">Provision coverage and net impact are calculated from the amount entered above.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="writeoff-recovery-efforts" className="text-sm font-medium">Recovery Efforts Undertaken</label>
          <textarea
            id="writeoff-recovery-efforts"
            value={recoveryEfforts}
            onChange={(event) => setRecoveryEfforts(event.target.value)}
            rows={4}
            placeholder="Describe all recovery attempts made..."
            className="field-control min-h-[124px] resize-none py-3"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="writeoff-justification" className="text-sm font-medium">Justification</label>
          <textarea
            id="writeoff-justification"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            rows={4}
            placeholder="Provide business justification for the write-off..."
            className="field-control min-h-[124px] resize-none py-3"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !parsedCaseId || parsedAmount <= 0}
          className="btn-primary"
        >
          {isPending ? 'Processing...' : 'Process Write-Off'}
        </button>
      </div>
    </form>
  );
}
