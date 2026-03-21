import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { useDisputes } from '../hooks/useDisputes';
import { DisputeTrackingTable } from '../components/disputes/DisputeTrackingTable';
import type { DisputeRecord } from '../api/disputeApi';

function DashboardCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

export function TransactionDisputePage() {
  const { disputes, dashboard, isLoading, respondMutation, escalateMutation, closeMutation } = useDisputes();
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);

  const dashboardCards = useMemo(
    () => [
      { label: 'Open Disputes', value: dashboard?.total ?? 0 },
      { label: 'Pending Response', value: dashboard?.pendingResponse ?? 0 },
      { label: 'Under Review', value: dashboard?.underReview ?? 0 },
      { label: 'Resolved', value: dashboard?.resolved ?? 0 },
    ],
    [dashboard],
  );

  const runAction = async (action: 'respond' | 'escalate' | 'close', dispute: DisputeRecord) => {
    const note = window.prompt(
      action === 'respond'
        ? 'Enter response notes'
        : action === 'escalate'
          ? 'Enter escalation notes'
          : 'Enter closing notes',
      '',
    );
    if (note === null) return;

    try {
      if (action === 'respond') {
        await respondMutation.mutateAsync({ id: dispute.id, response: note });
        toast.success('Dispute moved to review');
      } else if (action === 'escalate') {
        await escalateMutation.mutateAsync({ id: dispute.id, notes: note });
        toast.success('Dispute escalated');
      } else {
        const rejected = window.confirm('Mark this dispute as rejected instead of resolved?');
        await closeMutation.mutateAsync({
          id: dispute.id,
          response: rejected ? 'REJECTED' : 'RESOLVED',
          notes: note,
        });
        toast.success('Dispute closed');
      }
    } catch {
      toast.error('Failed to update dispute');
    }
  };

  return (
    <>
      <PageHeader
        title="Transaction Disputes"
        subtitle="Track open disputes, respond to cases, and close investigations."
      />

      <div className="page-container space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          {dashboardCards.map((card) => (
            <DashboardCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>

        <DisputeTrackingTable
          disputes={disputes}
          isLoading={isLoading}
          onView={setSelectedDispute}
          onRespond={(dispute) => void runAction('respond', dispute)}
          onEscalate={(dispute) => void runAction('escalate', dispute)}
          onClose={(dispute) => void runAction('close', dispute)}
        />
      </div>

      {selectedDispute && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setSelectedDispute(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl">
              <h3 className="text-lg font-semibold">{selectedDispute.disputeRef}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{selectedDispute.transactionRef}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-medium">Amount:</span> {formatMoney(selectedDispute.amount, selectedDispute.currencyCode)}</p>
                <p><span className="font-medium">Reason:</span> {selectedDispute.reasonCode}</p>
                <p><span className="font-medium">Status:</span> {selectedDispute.status}</p>
                <p><span className="font-medium">Description:</span> {selectedDispute.description}</p>
                {selectedDispute.responseNotes && <p><span className="font-medium">Response:</span> {selectedDispute.responseNotes}</p>}
                {selectedDispute.escalationNotes && <p><span className="font-medium">Escalation:</span> {selectedDispute.escalationNotes}</p>}
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedDispute(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
