import { useQuery } from '@tanstack/react-query';
import { Smartphone, TrendingUp, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { LinkedAccountsTable } from '../components/mobilemoney/LinkedAccountsTable';
import { MobileMoneyTransactions } from '../components/mobilemoney/MobileMoneyTransactions';
import { qrApi } from '../api/qrApi';

export function MobileMoneyPage() {
  const { data: linkedAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['linked-mobile-accounts'],
    queryFn: () => qrApi.getLinkedMobileAccounts(),
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['mobile-transactions'],
    queryFn: () => qrApi.getMobileTransactions(),
  });

  const today = new Date().toDateString();
  const todayTransactions = transactions.filter(
    (tx) => new Date(tx.date).toDateString() === today,
  );
  const todayVolume = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <>
      <PageHeader
        title="Mobile Money"
        subtitle="Manage linked mobile money accounts and transactions"
      />
      <div className="page-container space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Linked Accounts"
            value={linkedAccounts.length}
            format="number"
            icon={Smartphone}
            loading={loadingAccounts}
          />
          <StatCard
            label="Today's Volume"
            value={todayVolume}
            format="money"
            currency="NGN"
            icon={TrendingUp}
            loading={loadingTransactions}
            compact
          />
          <StatCard
            label="Today's Transactions"
            value={todayTransactions.length}
            format="number"
            icon={Receipt}
            loading={loadingTransactions}
          />
        </div>

        <div>
          <LinkedAccountsTable />
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">Recent Transactions</h2>
          <MobileMoneyTransactions />
        </div>
      </div>
    </>
  );
}
