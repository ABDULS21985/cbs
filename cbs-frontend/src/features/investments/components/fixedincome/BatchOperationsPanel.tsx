import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Check, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fixedIncomeApi, type BatchResult } from '../../api/fixedIncomeApi';

interface BatchCardProps {
  title: string;
  description: string;
  statusQuery: () => Promise<BatchResult | null>;
  runMutation: () => Promise<BatchResult>;
  queryKey: string;
}

function BatchCard({ title, description, statusQuery, runMutation, queryKey }: BatchCardProps) {
  const qc = useQueryClient();
  const { data: status } = useQuery({
    queryKey: ['fi-batch', queryKey],
    queryFn: statusQuery,
    staleTime: 30_000,
  });

  const runMut = useMutation({
    mutationFn: runMutation,
    onSuccess: (result) => {
      toast.success(`${title}: ${result.processed} processed`);
      qc.invalidateQueries({ queryKey: ['fi-batch'] });
      qc.invalidateQueries({ queryKey: ['fi-holdings'] });
    },
    onError: () => toast.error(`${title} failed`),
  });

  const isComplete = status?.status === 'COMPLETED' || (status?.processed ?? 0) > 0;

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {isComplete && <Check className="w-4 h-4 text-green-500" />}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {status && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {status.runAt ? `Last: ${new Date(status.runAt).toLocaleString()}` : 'No previous run'}
          {status.processed != null && ` · ${status.processed} processed`}
        </div>
      )}
      <button onClick={() => runMut.mutate()} disabled={runMut.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        {runMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {runMut.isPending ? 'Running...' : `Run ${title}`}
      </button>
    </div>
  );
}

export function BatchOperationsPanel() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <BatchCard title="Daily Accrual" description="Accrue daily interest on all active bond holdings"
        statusQuery={fixedIncomeApi.getBatchAccrualStatus} runMutation={fixedIncomeApi.runBatchAccrual} queryKey="accrual" />
      <BatchCard title="Mark-to-Market" description="Revalue all holdings at current market prices"
        statusQuery={fixedIncomeApi.getBatchMtmStatus} runMutation={fixedIncomeApi.runBatchMtm} queryKey="mtm" />
      <BatchCard title="Coupon Processing" description="Process coupon payments for bonds with due coupons"
        statusQuery={fixedIncomeApi.getBatchCouponStatus} runMutation={fixedIncomeApi.runBatchCoupons} queryKey="coupons" />
      <BatchCard title="Maturity Processing" description="Process maturing bonds and settle proceeds"
        statusQuery={fixedIncomeApi.getBatchMaturityStatus} runMutation={fixedIncomeApi.runBatchMaturity} queryKey="maturity" />
    </div>
  );
}
