import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { List, Info, Percent, ShieldCheck, Link2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { useAccountDetail } from '../hooks/useAccountDetail';
import { AccountCardHeader } from '../components/detail/AccountCardHeader';
import { TransactionsTab } from '../components/detail/TransactionsTab';
import { AccountDetailsTab } from '../components/detail/AccountDetailsTab';
import { InterestTab } from '../components/detail/InterestTab';
import { HoldsTab } from '../components/detail/HoldsTab';
import { LinkedProductsTab } from '../components/detail/LinkedProductsTab';
import { MaintenanceHistoryTimeline } from '../components/maintenance/MaintenanceHistoryTimeline';

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accountId = id ?? '';

  const { account, isLoading, error, refetch } = useAccountDetail(accountId);

  useEffect(() => {
    document.title = account
      ? `Account Detail - ${account.accountNumber} | CBS`
      : 'Account Detail | CBS';
  }, [account]);

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
    const status = (error as any)?.response?.status ?? (error as any)?.status;
    const is403 = status === 403;
    const is404 = status === 404;

    return (
      <>
        <PageHeader title="Account Details" backTo="/accounts" />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {is403 ? (
              <>
                <p className="text-lg font-medium text-muted-foreground">Access denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have permission to view this account.
                </p>
              </>
            ) : is404 ? (
              <>
                <p className="text-lg font-medium text-muted-foreground">Account not found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The account <span className="font-mono">{accountId}</span> does not exist.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-muted-foreground">Failed to load account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Unable to retrieve account <span className="font-mono">{accountId}</span>. Please check your connection.
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Info,
      content: <AccountDetailsTab account={account} />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: List,
      content: <TransactionsTab accountId={accountId} />,
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
      icon: ShieldCheck,
      content: <HoldsTab accountId={accountId} />,
    },
    {
      id: 'linked',
      label: 'Linked Products',
      icon: Link2,
      content: <LinkedProductsTab accountId={accountId} />,
    },
    {
      id: 'audit',
      label: 'Audit',
      icon: Clock,
      content: (
        <div className="p-6">
          <MaintenanceHistoryTimeline accountId={accountId} />
        </div>
      ),
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
        <AccountCardHeader account={account} />

        {/* Tabs */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <TabsPage tabs={tabs} defaultTab="overview" syncWithUrl />
        </div>
      </div>
    </>
  );
}
