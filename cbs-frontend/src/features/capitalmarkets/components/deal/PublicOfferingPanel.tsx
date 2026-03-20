import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney, formatDate } from '@/lib/formatters';
import { Send, Check, FileText } from 'lucide-react';
import { usePublicOfferingByDeal, useSubmitOfferingToRegulator, useRecordAllotment } from '../../hooks/useCapitalMarketsExt';

interface PublicOfferingPanelProps {
  dealId: number;
  currency: string;
}

export function PublicOfferingPanel({ dealId, currency }: PublicOfferingPanelProps) {
  const { data: offering, isLoading } = usePublicOfferingByDeal(dealId);
  const submitMut = useSubmitOfferingToRegulator();
  const allotMut = useRecordAllotment();

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
          { label: 'Offer Price', value: offering.pricePerShare ? formatMoney(offering.pricePerShare, currency) : '—' },
          { label: 'Application Open', value: offering.applicationOpen ?? '—', format: offering.applicationOpen ? 'date' : undefined },
          { label: 'Application Close', value: offering.applicationClose ?? '—', format: offering.applicationClose ? 'date' : undefined },
          { label: 'Listing Date', value: offering.listingDate ?? '—', format: offering.listingDate ? 'date' : undefined },
          { label: 'Oversubscription', value: offering.oversubscriptionRatio ? `${offering.oversubscriptionRatio.toFixed(2)}x` : '—' },
          { label: 'Target Amount', value: offering.targetAmount ?? 0, format: 'money' },
          { label: 'Currency', value: offering.currency ?? currency },
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
