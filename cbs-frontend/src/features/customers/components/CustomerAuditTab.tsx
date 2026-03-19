import { AuditTimeline } from '@/components/shared';
import { useCustomerAudit } from '../hooks/useCustomers';

export function CustomerAuditTab({ customerId, active }: { customerId: number; active: boolean }) {
  const { data: entries, isLoading } = useCustomerAudit(customerId, active);
  const events = (entries ?? []).map((entry) => ({
    ...entry,
    details: entry.details ?? undefined,
  }));

  return <AuditTimeline events={events} isLoading={isLoading} />;
}
