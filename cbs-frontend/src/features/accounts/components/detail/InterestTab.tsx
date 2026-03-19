import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, FormSection, InfoGrid } from '@/components/shared';
import { formatDate, formatMoney, formatPercent } from '@/lib/formatters';
import { accountDetailApi, type InterestHistory } from '../../api/accountDetailApi';
import type { Account } from '../../api/accountDetailApi';
import { differenceInDays, startOfMonth, endOfMonth, format } from 'date-fns';

interface InterestTabProps {
  account: Account;
}

const historyColumns: ColumnDef<InterestHistory, any>[] = [
  {
    accessorKey: 'postingDate',
    header: 'Posting Date',
    cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
  },
  {
    accessorKey: 'periodStart',
    header: 'Period',
    cell: ({ row }) => (
      <span className="text-sm">
        {formatDate(row.original.periodStart)} — {formatDate(row.original.periodEnd)}
      </span>
    ),
  },
  {
    accessorKey: 'days',
    header: 'Days',
    cell: ({ getValue }) => <span className="text-sm font-mono">{getValue<number>()}</span>,
  },
  {
    accessorKey: 'rate',
    header: 'Rate (% p.a.)',
    cell: ({ getValue }) => <span className="text-sm font-mono">{formatPercent(getValue<number>())}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount Posted',
    cell: ({ getValue }) => (
      <span className="text-sm font-mono text-green-600">{formatMoney(getValue<number>())}</span>
    ),
  },
];

export function InterestTab({ account }: InterestTabProps) {
  const { data: history = [], isLoading } = useQuery<InterestHistory[]>({
    queryKey: ['accounts', account.id, 'interest-history'],
    queryFn: () => accountDetailApi.getInterestHistory(account.id),
    staleTime: 60_000,
  });

  const today = new Date();
  const periodStart = startOfMonth(today);
  const periodEnd = endOfMonth(today);
  const daysElapsed = differenceInDays(today, periodStart) + 1;

  // Simple daily balance accrual estimate
  const dailyRate = account.interestRate / 100 / 365;
  const estimatedAccrual = account.ledgerBalance * dailyRate * daysElapsed;

  return (
    <div className="p-6 space-y-6">
      {/* Current accrual period */}
      <FormSection title="Current Accrual Period" description="Interest accruing in the current period (not yet posted).">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Period Start', value: format(periodStart, 'yyyy-MM-dd'), format: 'date' },
            { label: 'Period End', value: format(periodEnd, 'yyyy-MM-dd'), format: 'date' },
            { label: 'Days Elapsed', value: `${daysElapsed} days` },
            { label: 'Current Rate (p.a.)', value: formatPercent(account.interestRate) },
            { label: 'Accrual Method', value: account.accrualMethod },
            { label: 'Next Posting Date', value: account.nextPostingDate, format: 'date' },
          ]}
        />
      </FormSection>

      {/* Accrued interest */}
      <FormSection title="Accrued Interest" description="Estimated interest accrued so far this period.">
        <div className="flex items-center gap-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Estimated Accrual (Not Yet Posted)</p>
            <p className="text-2xl font-semibold font-mono text-green-700 dark:text-green-400">
              {formatMoney(estimatedAccrual)}
            </p>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Ledger Balance × Daily Rate × Days Elapsed</p>
            <p className="font-mono">
              {formatMoney(account.ledgerBalance)} × {(dailyRate * 100).toFixed(6)}% × {daysElapsed}
            </p>
          </div>
        </div>
      </FormSection>

      {/* Interest history */}
      <FormSection title="Interest Posting History" description="Previous interest amounts credited to this account.">
        <DataTable
          columns={historyColumns}
          data={history}
          isLoading={isLoading}
          emptyMessage="No interest history found"
          pageSize={12}
        />
      </FormSection>
    </div>
  );
}
