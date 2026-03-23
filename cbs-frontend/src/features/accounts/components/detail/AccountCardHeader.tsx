import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { MoneyDisplay, StatusBadge } from '@/components/shared';
import { formatAccountNumber, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Account } from '../../api/accountDetailApi';

interface AccountCardHeaderProps {
  account: Account;
}

const productTypeLabel: Record<string, string> = {
  SAVINGS: 'Savings Account',
  CURRENT: 'Current Account',
  DOMICILIARY: 'Domiciliary Account',
};

export function AccountCardHeader({ account }: AccountCardHeaderProps) {
  const balanceMetrics = [
    {
      label: 'Ledger Balance',
      value: account.ledgerBalance,
      emphasis: 'neutral',
      note: 'Book balance before pending operational actions.',
    },
    {
      label: 'Hold Amount',
      value: account.holdAmount,
      emphasis: account.holdAmount > 0 ? 'warning' : 'neutral',
      note: account.holdAmount > 0 ? 'Funds currently ring-fenced on the account.' : 'No active hold is currently applied.',
    },
    {
      label: 'Overdraft Limit',
      value: account.overdraftLimit,
      emphasis: account.overdraftLimit > 0 ? 'accent' : 'neutral',
      note: account.overdraftLimit > 0 ? 'Additional debit headroom available to this account.' : 'No overdraft facility is active.',
    },
  ] as const;

  const metaPills = [
    {
      icon: CreditCard,
      label: formatAccountNumber(account.accountNumber),
    },
    {
      icon: Building2,
      label: `Branch ${account.branchCode}`,
    },
    {
      icon: CalendarDays,
      label: `Opened ${formatDate(account.openedDate)}`,
    },
    {
      icon: UserRound,
      label: `Officer ${account.relationshipManager}`,
    },
  ];

  return (
    <section className="account-hero-shell">
      <div className="account-hero-overlay" />
      <div className="account-hero-orb-left" />
      <div className="account-hero-orb-right" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="account-hero-chip account-hero-chip-compact">
              {productTypeLabel[account.productType] ?? account.productType}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[2rem]">{account.accountTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {account.productName} · {account.accountType}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="account-hero-chip">
              {account.currency} settlement account
            </div>
            <StatusBadge status={account.status} size="sm" dot />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {metaPills.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="account-hero-chip gap-2"
            >
              <Icon className="h-3.5 w-3.5 text-primary/70" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.92fr)]">
          <div className="account-hero-panel p-5 md:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Available Balance
                </p>
                <MoneyDisplay
                  amount={account.availableBalance}
                  currency={account.currency}
                  size="xl"
                  className="mt-3 text-[2.3rem] font-semibold leading-none text-foreground sm:text-[3rem]"
                />
              </div>
              <div className="account-hero-callout text-foreground">
                <p className="font-medium">{account.allowDebit ? 'Debit-ready balance' : 'Debit currently restricted'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {account.allowDebit
                    ? 'Funds can be used immediately, subject to holds and limits.'
                    : 'Operational controls currently prevent debit transactions.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="account-hero-inset">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Customer
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{account.customerName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ID {account.customerId}{account.customerCifNumber ? ` · CIF ${account.customerCifNumber}` : ''}
                </p>
              </div>

              <div className="account-hero-inset">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Access
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {account.allowCredit ? 'Credits enabled' : 'Credits restricted'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {account.lastTransactionDate ? `Last transaction ${formatDate(account.lastTransactionDate)}` : 'No transactions recorded yet'}
                    </p>
                  </div>
                  <div className="account-hero-mini-icon">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {balanceMetrics.map((metric) => (
              <div
                key={metric.label}
                className="account-hero-metric"
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                <MoneyDisplay
                  amount={metric.value}
                  currency={account.currency}
                  size="lg"
                  className={cn(
                    'mt-3 block text-foreground',
                    metric.emphasis === 'warning' && metric.value > 0 && 'text-amber-600',
                    metric.emphasis === 'accent' && metric.value > 0 && 'text-sky-600',
                  )}
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/accounts/post-transaction?account=${account.accountNumber}`}
            className="account-hero-action"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Post Transaction
          </Link>
          <Link
            to={`/accounts/wallets?accountId=${account.id}`}
            className="account-hero-action"
          >
            <Wallet className="w-4 h-4" />
            Wallets
          </Link>
          <Link
            to="/accounts/statements"
            className="account-hero-action"
          >
            <FileText className="w-4 h-4" />
            Statements
          </Link>
          <Link
            to={`/accounts/${account.accountNumber}/maintenance`}
            className="account-hero-action lg:ml-auto"
          >
            <Settings className="w-4 h-4" />
            Account Maintenance
          </Link>
        </div>
      </div>
    </section>
  );
}
