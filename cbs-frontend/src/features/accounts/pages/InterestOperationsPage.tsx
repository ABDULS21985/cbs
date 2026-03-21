import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Percent, Play, Loader2, CheckCircle2, AlertTriangle, Calculator } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { accountDetailApi } from '../api/accountDetailApi';

export function InterestOperationsPage() {
  useEffect(() => { document.title = 'Interest Operations | CBS'; }, []);
  const [accountId, setAccountId] = useState('');
  const [lastResult, setLastResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

  const accrueMut = useMutation({
    mutationFn: () => accountDetailApi.accrueInterest(accountId),
    onSuccess: () => { toast.success('Interest accrued'); setLastResult({ type: 'Accrual', success: true, message: `Interest accrued for account ${accountId}` }); },
    onError: (err: any) => { const msg = err?.response?.data?.message || 'Failed to accrue interest'; toast.error(msg); setLastResult({ type: 'Accrual', success: false, message: msg }); },
  });

  const postMut = useMutation({
    mutationFn: () => accountDetailApi.postInterest(accountId),
    onSuccess: () => { toast.success('Interest posted'); setLastResult({ type: 'Posting', success: true, message: `Interest posted for account ${accountId}` }); },
    onError: (err: any) => { const msg = err?.response?.data?.message || 'Failed to post interest'; toast.error(msg); setLastResult({ type: 'Posting', success: false, message: msg }); },
  });

  const batchMut = useMutation({
    mutationFn: () => accountDetailApi.batchAccrueInterest(),
    onSuccess: () => { toast.success('Batch accrual completed'); setLastResult({ type: 'Batch Accrual', success: true, message: 'Batch interest accrual completed for all eligible accounts' }); },
    onError: (err: any) => { const msg = err?.response?.data?.message || 'Batch interest accrual failed'; toast.error(msg); setLastResult({ type: 'Batch Accrual', success: false, message: msg }); },
  });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Interest Operations" subtitle="Accrue, post, and batch-process interest across accounts" backTo="/accounts" />
      <div className="page-container space-y-6">
        {/* Result banner */}
        {lastResult && (
          <div className={cn('rounded-lg border px-4 py-3 flex items-center gap-3',
            lastResult.success ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20')}>
            {lastResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <div>
              <p className={cn('text-sm font-semibold', lastResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>{lastResult.type}</p>
              <p className="text-xs text-muted-foreground">{lastResult.message}</p>
            </div>
          </div>
        )}

        {/* Single Account Operations */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Calculator className="w-4 h-4" /> Single Account Operations</h3>
          <div className="max-w-md space-y-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Account ID (numeric) *</label>
              <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="Enter numeric account ID" className={cn(fc, 'font-mono')} />
              <p className="text-xs text-muted-foreground mt-1">Use the numeric account ID, not the account number.</p></div>
            <div className="flex gap-3">
              <button onClick={() => accrueMut.mutate()} disabled={!accountId || accrueMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {accrueMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />} Accrue Interest
              </button>
              <button onClick={() => postMut.mutate()} disabled={!accountId || postMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Post Interest
              </button>
            </div>
          </div>
        </div>

        {/* Batch Operations */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Play className="w-4 h-4" /> Batch Operations</h3>
          <p className="text-sm text-muted-foreground">Run interest accrual across all eligible accounts. This is typically an end-of-day process.</p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">Batch accrual will process all active accounts with interest-bearing products. This may take several minutes.</p>
          </div>
          <button onClick={() => batchMut.mutate()} disabled={batchMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {batchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run Batch Accrual
          </button>
        </div>
      </div>
    </>
  );
}
