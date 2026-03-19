import { useParams } from 'react-router-dom';
import { List, Info, Percent, Lock, Link } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { useAccountDetail } from '../hooks/useAccountDetail';
import { AccountCardHeader } from '../components/detail/AccountCardHeader';
import { TransactionsTab } from '../components/detail/TransactionsTab';
import { AccountDetailsTab } from '../components/detail/AccountDetailsTab';
import { InterestTab } from '../components/detail/InterestTab';
import { HoldsTab } from '../components/detail/HoldsTab';
import { LinkedProductsTab } from '../components/detail/LinkedProductsTab';

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accountId = id ?? '';

  const { account, isLoading, error } = useAccountDetail(accountId);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Account Details" backTo="/accounts" />
        <div className="page-container space-y-4">
          <div className="h-52 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-10 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-64 rounded-lg bg-muted/30 animate-pulse" />
        </div>
      </>
    );
  }

  if (error || !account) {
    return (
      <>
        <PageHeader title="Account Details" backTo="/accounts" />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">Account not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              The account <span className="font-mono">{accountId}</span> could not be loaded.
            </p>
          </div>
        </div>
      </>
    );
  }

  const handleTransfer = () => {
    toast.info('Transfer functionality coming soon');
  };

  const handleDeposit = () => {
    toast.info('Deposit functionality coming soon');
  };

  const handleWithdraw = () => {
    toast.info('Withdrawal functionality coming soon');
  };

  const tabs = [
    {
      id: 'transactions',
      label: 'Transactions',
      icon: List,
      content: <TransactionsTab accountId={accountId} />,
    },
    {
      id: 'details',
      label: 'Account Details',
      icon: Info,
      content: <AccountDetailsTab account={account} />,
    },
    {
      id: 'interest',
      label: 'Interest',
      icon: Percent,
      content: <InterestTab account={account} />,
    },
    {
      id: 'holds',
      label: 'Holds',
      icon: Lock,
      badge: account.holdAmount > 0 ? 1 : 0,
      content: <HoldsTab accountId={accountId} />,
    },
    {
      id: 'linked',
      label: 'Linked Products',
      icon: Link,
      content: <LinkedProductsTab accountId={accountId} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={account.accountTitle}
        subtitle={`${account.productName} · ${account.accountNumber}`}
        backTo="/accounts"
      />
      <div className="page-container space-y-4">
        {/* Balance card */}
        <AccountCardHeader
          account={account}
          onTransfer={handleTransfer}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
        />

        {/* Tabs */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <TabsPage tabs={tabs} defaultTab="transactions" syncWithUrl />
        </div>
      </div>
    </>
  );
}
