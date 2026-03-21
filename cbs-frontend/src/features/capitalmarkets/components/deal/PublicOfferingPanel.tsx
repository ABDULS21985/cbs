import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney, formatDate } from '@/lib/formatters';
import { Send, Check, FileText, DoorOpen, DoorClosed } from 'lucide-react';
import { usePublicOfferingByDeal, useSubmitOfferingToRegulator, useRecordAllotment } from '../../hooks/useCapitalMarketsExt';
import { capitalMarketsApi } from '../../api/capitalMarketsApi';

interface PublicOfferingPanelProps {
  dealId: number;
  currency: string;
}

export function PublicOfferingPanel({ dealId, currency }: PublicOfferingPanelProps) {
  const { data: offering, isLoading } = usePublicOfferingByDeal(dealId);
  const qc = useQueryClient();
  const submitMut = useSubmitOfferingToRegulator();
  const allotMut = useRecordAllotment();
  const openMut = useMutation({
    mutationFn: (id: number) => capitalMarketsApi.openOffering(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capital-markets-ext', 'publicOfferings'] }); },
  });
  const closeMut = useMutation({
    mutationFn: (id: number) => capitalMarketsApi.closeOffering(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capital-markets-ext', 'publicOfferings'] }); },
  });

  if (isLoading) return <div className="h-48 bg-muted animate-pulse rounded-xl" />;

  if (!offering) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No public offering for this deal</p>
        <p className="text-xs mt-1">Public offering data will appear here when created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <StatusBadge status={offering.status ?? 'PENDING'} />
        <span className="text-xs text-muted-foreground font-mono">Offering #{offering.id}</span>
      </div>

      <InfoGrid
        columns={3}
        items={[
          { label: 'Offering Type', value: offering.offeringType ?? '—' },
          { label: 'Shares Offered', value: offering.sharesOffered?.toLocaleString() ?? '—' },
          { label: 'Offer Price', value: offering.offerPrice ? formatMoney(offering.offerPrice, currency) : '—' },
          { label: 'Application Open', value: offering.applicationOpenDate ?? '—', format: offering.applicationOpenDate ? 'date' : undefined },
          { label: 'Application Close', value: offering.applicationCloseDate ?? '—', format: offering.applicationCloseDate ? 'date' : undefined },
          { label: 'Listing Date', value: offering.listingDate ?? '—', format: offering.listingDate ? 'date' : undefined },
          { label: 'Total Received', value: offering.totalAmountReceived ?? 0, format: 'money' },
          { label: 'Total Applications', value: offering.totalApplications ?? 0 },
          { label: 'Retail Allocation', value: offering.retailAllocationPct ? `${offering.retailAllocationPct}%` : '—' },
        ]}
      />

      <div className="flex items-center gap-2">
        {offering.status === 'PENDING' && (
          <button
            onClick={() => submitMut.mutate(offering.id, { onSuccess: () => toast.success('Submitted to regulator') })}
            disabled={submitMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitMut.isPending ? 'Submitting...' : 'Submit to Regulator'}
          </button>
        )}
        {offering.status === 'PENDING' && (
          <button
            onClick={() => openMut.mutate(offering.id, { onSuccess: () => toast.success('Offering opened for applications') })}
            disabled={openMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <DoorOpen className="w-4 h-4" />
            {openMut.isPending ? 'Opening...' : 'Open Offering'}
          </button>
        )}
        {offering.status === 'OPEN' && (
          <button
            onClick={() => closeMut.mutate(offering.id, { onSuccess: () => toast.success('Offering closed') })}
            disabled={closeMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            <DoorClosed className="w-4 h-4" />
            {closeMut.isPending ? 'Closing...' : 'Close Offering'}
          </button>
        )}
        {(offering.status === 'OPEN' || offering.status === 'CLOSED') && (
          <button
            onClick={() => allotMut.mutate(offering.id, { onSuccess: () => toast.success('Allotment recorded') })}
            disabled={allotMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {allotMut.isPending ? 'Recording...' : 'Record Allotment'}
          </button>
        )}
      </div>
    </div>
  );
}
