import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  List,
  Info,
  Percent,
  ShieldCheck,
  Link2,
  Clock,
  Users,
  Gauge,
  Building2,
  CalendarDays,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { formatAccountNumber, formatDate } from '@/lib/formatters';
import { useAccountDetail } from '../hooks/useAccountDetail';
import { AccountCardHeader } from '../components/detail/AccountCardHeader';
import { TransactionsTab } from '../components/detail/TransactionsTab';
import { AccountDetailsTab } from '../components/detail/AccountDetailsTab';
import { InterestTab } from '../components/detail/InterestTab';
import { HoldsTab } from '../components/detail/HoldsTab';
import { LinkedProductsTab } from '../components/detail/LinkedProductsTab';
import { SignatoriesTab } from '../components/detail/SignatoriesTab';
import { LimitsTab } from '../components/detail/LimitsTab';
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
        <PageHeader title="Account Details" backTo="/accounts" icon={Wallet} />
        <div className="page-container space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_360px]">
            <div className="h-[23rem] rounded-[28px] bg-muted/40 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="h-28 rounded-[24px] bg-muted/30 animate-pulse" />
              <div className="h-28 rounded-[24px] bg-muted/30 animate-pulse" />
              <div className="h-28 rounded-[24px] bg-muted/30 animate-pulse" />
            </div>
          </div>
          <div className="h-[30rem] rounded-[28px] bg-muted/30 animate-pulse" />
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
        <PageHeader title="Account Details" backTo="/accounts" icon={Wallet} />
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
      id: 'signatories',
      label: 'Signatories',
      icon: Users,
      content: <SignatoriesTab accountId={accountId} />,
    },
    {
      id: 'holds',
      label: 'Holds',
      icon: ShieldCheck,
      content: <HoldsTab accountId={accountId} />,
    },
    {
      id: 'limits',
      label: 'Limits',
      icon: Gauge,
      content: <LimitsTab accountId={accountId} currency={account.currency} />,
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
        icon={Wallet}
        actions={(
          <>
            <div className="hidden rounded-full border border-border/70 bg-card/75 px-3 py-1.5 font-mono text-xs text-muted-foreground shadow-[var(--surface-shadow-soft)] md:block">
              {formatAccountNumber(account.accountNumber)}
            </div>
            <StatusBadge status={account.status} dot />
          </>
        )}
      />
      <div className="page-container space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <AccountCardHeader account={account} />
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <section className="account-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Customer</p>
                  <h2 className="mt-2 text-base font-semibold">{account.customerName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CIF {account.customerCifNumber ?? 'Not assigned'} · ID {account.customerId}
                  </p>
                </div>
                <div className="account-icon-badge">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="account-inline-fact mt-4 flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Branch {account.branchCode}
              </div>
            </section>

            <section className="account-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Controls</p>
                  <h2 className="mt-2 text-base font-semibold">Transaction posture</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Operational permissions from the live account contract.</p>
                </div>
                <div className="account-icon-badge">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="account-inline-fact flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Debit access</span>
                  <span className={account.allowDebit ? 'font-medium text-emerald-500' : 'font-medium text-amber-500'}>
                    {account.allowDebit ? 'Enabled' : 'Blocked'}
                  </span>
                </div>
                <div className="account-inline-fact flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Credit access</span>
                  <span className={account.allowCredit ? 'font-medium text-emerald-500' : 'font-medium text-amber-500'}>
                    {account.allowCredit ? 'Enabled' : 'Blocked'}
                  </span>
                </div>
              </div>
            </section>

            <section className="account-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Lifecycle</p>
                  <h2 className="mt-2 text-base font-semibold">Account activity</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Recent operational milestones and activity dates.</p>
                </div>
                <div className="account-icon-badge">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <dl className="mt-4 space-y-3">
                <div className="account-inline-fact flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-sm text-muted-foreground">Opened</dt>
                  <dd className="text-sm font-medium">{formatDate(account.openedDate)}</dd>
                </div>
                <div className="account-inline-fact flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-sm text-muted-foreground">Last transaction</dt>
                  <dd className="text-sm font-medium">
                    {account.lastTransactionDate ? formatDate(account.lastTransactionDate) : 'No activity yet'}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <div className="account-workspace-shell">
          <div className="account-workspace-banner">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Account Workspace</p>
                <h2 className="mt-2 text-lg font-semibold">Operations, activity, and controls</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Review balances, monitor movements, and manage the operational state of this account from a single view.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">
                  {account.currency}
                </div>
                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">
                  {account.accountType}
                </div>
              </div>
            </div>
          </div>
          <TabsPage tabs={tabs} defaultTab="overview" syncWithUrl />
        </div>
      </div>
    </>
  );
}
