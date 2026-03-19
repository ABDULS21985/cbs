import { AuditTimeline } from '@/components/shared';
import { useCustomerAudit } from '../hooks/useCustomers';

export function CustomerAuditTab({ customerId, active }: { customerId: number; active: boolean }) {
  const { data: entries, isLoading } = useCustomerAudit(customerId, active);
  return <AuditTimeline events={entries ?? []} isLoading={isLoading} />;
}
