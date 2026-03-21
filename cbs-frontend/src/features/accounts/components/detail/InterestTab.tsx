import { useQuery } from '@tanstack/react-query';
import { FormSection, InfoGrid, DataTable, EmptyState } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import type { Account, InterestHistory } from '../../api/accountDetailApi';
import { accountDetailApi } from '../../api/accountDetailApi';
import { type ColumnDef } from '@tanstack/react-table';

interface InterestTabProps {
  account: Account;
}

const interestColumns: ColumnDef<InterestHistory, unknown>[] = [
  {
    accessorKey: 'postingDate',
    header: 'Posting Date',
    cell: ({ getValue }) => (
      <span className="text-sm">{formatDate(String(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'periodStart',
    header: 'Period Start',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'periodEnd',
    header: 'Period End',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'rate',
    header: 'Rate (p.a.)',
    cell: ({ getValue }) => (
      <span className="text-sm font-mono">{formatPercent(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'days',
    header: 'Days',
    cell: ({ getValue }) => (
      <span className="text-sm font-mono text-center block">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Interest Amount',
    cell: ({ getValue }) => (
      <span className="text-sm font-mono text-right block text-green-600 dark:text-green-400">
        {formatMoney(Number(getValue()))}
      </span>
    ),
  },
];

export function InterestTab({ account }: InterestTabProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['account-interest-history', account.accountNumber],
    queryFn: () => accountDetailApi.getInterestHistory(account.accountNumber),
    staleTime: 60_000,
  });

  return (
    <div className="p-6 space-y-6">
      <FormSection title="Interest Summary" description="Current interest configuration and accrual status.">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Current Rate (p.a.)', value: formatPercent(account.interestRate) },
            { label: 'Accrued Interest', value: formatMoney(account.accruedInterest, account.currency) },
            { label: 'Ledger Balance', value: formatMoney(account.ledgerBalance, account.currency) },
            { label: 'Statement Frequency', value: account.statementFrequency },
            { label: 'Last Interest Calculation', value: account.lastInterestCalcDate ?? 'Not yet calculated', format: account.lastInterestCalcDate ? 'date' as const : undefined },
            { label: 'Last Interest Posting', value: account.lastInterestPostDate ?? 'Not yet posted', format: account.lastInterestPostDate ? 'date' as const : undefined },
          ]}
        />
      </FormSection>

      <FormSection title="Interest Posting History" description="Historical interest calculations and postings for this account.">
        {history.length === 0 && !isLoading ? (
          <EmptyState
            title="No interest postings"
            description="No interest has been posted to this account yet."
          />
        ) : (
          <DataTable
            columns={interestColumns}
            data={history}
            isLoading={isLoading}
            emptyMessage="No interest posting records found"
            pageSize={10}
          />
        )}
      </FormSection>
    </div>
  );
}
