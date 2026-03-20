import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pause, Play, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { ExecutionHistoryTable } from '../components/standing/ExecutionHistoryTable';
import { standingOrderApi } from '../api/standingOrderApi';

export function StandingOrderDetailPage() {
  useEffect(() => { document.title = 'Standing Order | CBS'; }, []);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['standing-orders', Number(id)],
    queryFn: () => standingOrderApi.getById(Number(id)),
    enabled: !!id,
  });

  const { data: executions = [], isLoading: execLoading } = useQuery({
    queryKey: ['standing-orders', Number(id), 'executions'],
    queryFn: () => standingOrderApi.getExecutions(Number(id)),
    enabled: !!id,
  });

  const pauseMutation = useMutation({
    mutationFn: () => standingOrderApi.pause(Number(id)),
    onSuccess: () => { toast.success('Standing order paused'); queryClient.invalidateQueries({ queryKey: ['standing-orders'] }); },
  });

  const resumeMutation = useMutation({
    mutationFn: () => standingOrderApi.resume(Number(id)),
    onSuccess: () => { toast.success('Standing order resumed'); queryClient.invalidateQueries({ queryKey: ['standing-orders'] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => standingOrderApi.cancel(Number(id)),
    onSuccess: () => { toast.success('Standing order cancelled'); navigate('/payments/standing-orders'); },
  });

  const retryMutation = useMutation({
    mutationFn: (executionId: number) =>
      standingOrderApi.retryExecution
        ? standingOrderApi.retryExecution(Number(id), executionId)
        : Promise.resolve(),
    onSuccess: () => {
      toast.success('Retry requested');
      queryClient.invalidateQueries({ queryKey: ['standing-orders', Number(id), 'executions'] });
    },
    onError: () => toast.error('Failed to retry execution'),
  });

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const lastExecution = executions.length > 0 ? executions[executions.length - 1] : null;
  const lastFailed = lastExecution?.status === 'FAILED' ? lastExecution : null;

  if (isLoading || !order) {
    return <><PageHeader title="Standing Order" /><div className="page-container"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div></>;
  }

  return (
    <>
      <PageHeader
        title={`Standing Order ${order.reference}`}
        subtitle={order.description}
        actions={
          <div className="flex gap-2">
            {order.status === 'ACTIVE' && (
              <button onClick={() => pauseMutation.mutate()} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            {order.status === 'PAUSED' && (
              <button onClick={() => resumeMutation.mutate()} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            {(order.status === 'ACTIVE' || order.status === 'PAUSED') && (
              <button onClick={() => setShowCancelConfirm(true)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50">
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            )}
            <button onClick={() => navigate('/payments/standing-orders')} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {lastFailed && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Last execution failed: {lastFailed.failureReason || 'Unknown error'}
            </p>
          </div>
        )}
        <FormSection title="Instruction Details">
          <InfoGrid columns={4} items={[
            { label: 'Reference', value: order.reference, mono: true, copyable: true },
            { label: 'Status', value: <StatusBadge status={order.status} dot /> },
            { label: 'Source Account', value: order.sourceAccountNumber, format: 'account' },
            { label: 'Beneficiary', value: `${order.beneficiaryName} · ${order.beneficiaryAccount}` },
            { label: 'Amount', value: order.amount, format: 'money', currency: order.currency },
            { label: 'Frequency', value: order.frequency.replace(/_/g, ' ') },
            { label: 'Start Date', value: order.startDate, format: 'date' },
            { label: 'End Date', value: order.endDate || 'Until cancelled' },
            { label: 'Next Execution', value: order.nextExecution, format: 'date' },
            { label: 'Last Executed', value: order.lastExecuted || '—', format: order.lastExecuted ? 'date' : undefined },
            { label: 'Total Executions', value: String(order.executionCount) },
            { label: 'Failures', value: String(order.failureCount) },
          ]} />
        </FormSection>

        <FormSection title="Execution History">
          <ExecutionHistoryTable
            executions={executions}
            isLoading={execLoading}
            onRetry={(executionId) => retryMutation.mutate(executionId)}
            retryingId={retryMutation.isPending ? (retryMutation.variables as number) : undefined}
          />
        </FormSection>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold">Cancel Standing Order?</h3>
            <p className="text-sm text-muted-foreground">This action cannot be undone. The standing order will be permanently cancelled.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Keep Active</button>
              <button onClick={() => { cancelMutation.mutate(); setShowCancelConfirm(false); }} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Cancel Order</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
