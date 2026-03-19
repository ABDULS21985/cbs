import { InfoGrid, FormSection } from '@/components/shared';
import { formatPercent } from '@/lib/formatters';
import type { Account } from '../../api/accountDetailApi';

interface AccountDetailsTabProps {
  account: Account;
}

export function AccountDetailsTab({ account }: AccountDetailsTabProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Core Account Info */}
      <FormSection title="Account Information" description="Core account details and identifiers.">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Account Number', value: account.accountNumber, format: 'account', copyable: true },
            { label: 'Account Title', value: account.accountTitle },
            { label: 'Product Name', value: account.productName },
            { label: 'Product Type', value: account.productType },
            { label: 'Currency', value: account.currency },
            { label: 'Status', value: account.status },
            { label: 'Branch', value: account.branchName },
            { label: 'Account Officer', value: account.accountOfficer },
            { label: 'Date Opened', value: account.openedDate, format: 'date' },
            { label: 'Customer ID', value: account.customerId, copyable: true },
            { label: 'Customer Name', value: account.customerName },
          ]}
        />
      </FormSection>

      {/* Signatories */}
      {account.signatories && account.signatories.length > 0 && (
        <FormSection title="Signatories" description="Authorized signatories on this account.">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody>
                {account.signatories.map((sig, i) => (
                  <tr key={i} className={i < account.signatories!.length - 1 ? 'border-b' : ''}>
                    <td className="px-4 py-3 font-medium">{sig.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sig.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormSection>
      )}

      {/* Account Restrictions */}
      <FormSection title="Account Restrictions & Flags" description="Operational restrictions currently applied to this account.">
        <div className="space-y-2">
          {account.status === 'FROZEN' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-400 font-medium">Account is frozen — no debits or credits permitted.</span>
            </div>
          )}
          {account.status === 'DORMANT' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">Account is dormant — reactivation required before transactions.</span>
            </div>
          )}
          {account.holdAmount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Hold of {account.currency} {account.holdAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} is active on this account.
              </span>
            </div>
          )}
          {account.status === 'ACTIVE' && account.holdAmount === 0 && (
            <p className="text-sm text-muted-foreground">No active restrictions on this account.</p>
          )}
        </div>
      </FormSection>

      {/* Interest Parameters */}
      <FormSection title="Interest Parameters" description="Current interest configuration for this account.">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Interest Rate', value: formatPercent(account.interestRate) },
            { label: 'Accrual Method', value: account.accrualMethod },
            { label: 'Next Posting Date', value: account.nextPostingDate, format: 'date' },
          ]}
        />
      </FormSection>
    </div>
  );
}
