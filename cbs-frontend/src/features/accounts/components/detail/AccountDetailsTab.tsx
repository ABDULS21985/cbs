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
            { label: 'Account Type', value: account.accountType },
            { label: 'Product Name', value: account.productName },
            { label: 'Product Category', value: account.productType },
            { label: 'Currency', value: account.currency },
            { label: 'Status', value: account.status },
            { label: 'Branch Code', value: account.branchCode },
            { label: 'Relationship Manager', value: account.relationshipManager },
            { label: 'Customer ID', value: account.customerId, copyable: true },
            { label: 'Customer Name', value: account.customerName },
            ...(account.customerCifNumber ? [{ label: 'CIF Number', value: account.customerCifNumber, copyable: true }] : []),
          ]}
        />
      </FormSection>

      {/* Key Dates */}
      <FormSection title="Key Dates" description="Important lifecycle dates for this account.">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Date Opened', value: account.openedDate, format: 'date' as const },
            { label: 'Date Activated', value: account.activatedDate ?? 'Not yet activated', format: account.activatedDate ? 'date' as const : undefined },
            { label: 'Last Transaction', value: account.lastTransactionDate ?? 'No transactions', format: account.lastTransactionDate ? 'date' as const : undefined },
            ...(account.dormancyDate ? [{ label: 'Dormancy Date', value: account.dormancyDate, format: 'date' as const }] : []),
            ...(account.maturityDate ? [{ label: 'Maturity Date', value: account.maturityDate, format: 'date' as const }] : []),
            ...(account.closedDate ? [{ label: 'Closed Date', value: account.closedDate, format: 'date' as const }] : []),
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
          {account.status === 'PND_DEBIT' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-400 font-medium">Post No Debit — debit transactions are restricted on this account.</span>
            </div>
          )}
          {account.status === 'PND_CREDIT' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">Post No Credit — credit transactions are restricted on this account.</span>
            </div>
          )}
          {account.status === 'DORMANT' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">Account is dormant — reactivation required before transactions.</span>
            </div>
          )}
          {!account.allowDebit && account.status === 'ACTIVE' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">Debit transactions are currently blocked on this account.</span>
            </div>
          )}
          {!account.allowCredit && account.status === 'ACTIVE' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">Credit transactions are currently blocked on this account.</span>
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
          {account.overdraftLimit > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-blue-700 dark:text-blue-400 font-medium">
                Overdraft facility of {account.currency} {account.overdraftLimit.toLocaleString('en-NG', { minimumFractionDigits: 2 })} is active.
              </span>
            </div>
          )}
          {account.status === 'ACTIVE' && account.holdAmount === 0 && account.allowDebit && account.allowCredit && (
            <p className="text-sm text-muted-foreground">No active restrictions on this account.</p>
          )}
        </div>
      </FormSection>

      {/* Interest Parameters */}
      <FormSection title="Interest Parameters" description="Current interest configuration exposed by the live account contract.">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Interest Rate', value: formatPercent(account.interestRate) },
            { label: 'Accrued Interest', value: `${account.currency} ${account.accruedInterest.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Statement Frequency', value: account.statementFrequency },
            { label: 'Last Interest Calculation', value: account.lastInterestCalcDate ?? 'Not yet calculated', format: account.lastInterestCalcDate ? 'date' as const : undefined },
            { label: 'Last Interest Posting', value: account.lastInterestPostDate ?? 'Not yet posted', format: account.lastInterestPostDate ? 'date' as const : undefined },
          ]}
        />
      </FormSection>
    </div>
  );
}
