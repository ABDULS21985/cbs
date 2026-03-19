import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pause, Play, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { ExecutionHistoryTable } from '../components/standing/ExecutionHistoryTable';
import { standingOrderApi } from '../api/standingOrderApi';

export function StandingOrderDetailPage() {
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
              <button onClick={() => cancelMutation.mutate()} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50">
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
          <ExecutionHistoryTable executions={executions} isLoading={execLoading} />
        </FormSection>
      </div>
    </>
  );
}
