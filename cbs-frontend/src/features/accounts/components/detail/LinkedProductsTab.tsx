import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { StatusBadge, FormSection } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { accountDetailApi, type LinkedProducts } from '../../api/accountDetailApi';

interface LinkedProductsTabProps {
  accountId: string;
}

export function LinkedProductsTab({ accountId }: LinkedProductsTabProps) {
  const { data: linked, isLoading } = useQuery<LinkedProducts>({
    queryKey: ['accounts', accountId, 'linked-products'],
    queryFn: () => accountDetailApi.getLinkedProducts(accountId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!linked) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Debit Card */}
      <FormSection title="Debit Card" description="Card linked to this account.">
        {linked.debitCard ? (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/40 to-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 rounded bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-mono font-medium tracking-widest text-sm">{linked.debitCard.maskedPan}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Expires {linked.debitCard.expiryDate}</p>
              </div>
            </div>
            <StatusBadge status={linked.debitCard.status} dot />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No debit card linked to this account.</p>
        )}
      </FormSection>

      {/* Overdraft Facility */}
      {linked.overdraftFacility && (
        <FormSection title="Overdraft Facility" description="Approved overdraft on this account.">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Approved Limit</p>
              <p className="text-lg font-semibold font-mono">{formatMoney(linked.overdraftFacility.limit)}</p>
            </div>
            <div className="p-4 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Utilized</p>
              <p className="text-lg font-semibold font-mono text-amber-600">
                {formatMoney(linked.overdraftFacility.utilized)}
              </p>
            </div>
            <div className="p-4 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Expiry Date</p>
              <p className="text-lg font-semibold">{formatDate(linked.overdraftFacility.expiryDate)}</p>
            </div>
          </div>
          {linked.overdraftFacility.utilized > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Utilization</span>
                <span>{((linked.overdraftFacility.utilized / linked.overdraftFacility.limit) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min((linked.overdraftFacility.utilized / linked.overdraftFacility.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* Standing Orders */}
      <FormSection title="Standing Orders" description="Recurring payment instructions from this account.">
        {linked.standingOrders.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Beneficiary</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Frequency</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Next Execution</th>
                </tr>
              </thead>
              <tbody>
                {linked.standingOrders.map((so, i) => (
                  <tr key={so.id} className={i < linked.standingOrders.length - 1 ? 'border-b' : ''}>
                    <td className="px-4 py-3 font-medium">{so.beneficiary}</td>
                    <td className="px-4 py-3 font-mono">{formatMoney(so.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{so.frequency}</td>
                    <td className="px-4 py-3">{formatDate(so.nextExecution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No standing orders on this account.</p>
        )}
      </FormSection>

      {/* Direct Debits */}
      <FormSection title="Direct Debits" description="Authorized direct debit mandates on this account.">
        {linked.directDebits.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Merchant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Limit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {linked.directDebits.map((dd, i) => (
                  <tr key={dd.id} className={i < linked.directDebits.length - 1 ? 'border-b' : ''}>
                    <td className="px-4 py-3 font-medium">{dd.merchant}</td>
                    <td className="px-4 py-3 font-mono">{formatMoney(dd.limit)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={dd.authorized ? 'ACTIVE' : 'INACTIVE'} dot />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No direct debit mandates on this account.</p>
        )}
      </FormSection>
    </div>
  );
}
