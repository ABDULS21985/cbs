import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { InfoGrid, MoneyDisplay, StatusBadge } from '@/components/shared';
import { formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Account } from '../../api/accountDetailApi';

interface AccountDetailsTabProps {
  account: Account;
}

interface DetailPanelProps {
  title: string;
  description: string;
  children: ReactNode;
}

function DetailPanel({ title, description, children }: DetailPanelProps) {
  return (
    <section className="account-detail-panel">
      <div className="border-b border-border/70 px-6 py-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function AccountDetailsTab({ account }: AccountDetailsTabProps) {
  const restrictions = [
    account.status === 'FROZEN'
      ? {
          title: 'Account is frozen',
          description: 'No debits or credits permitted until the restriction is lifted.',
          tone: 'danger',
        }
      : null,
    account.status === 'PND_DEBIT'
      ? {
          title: 'Post No Debit',
          description: 'Debit transactions are restricted on this account.',
          tone: 'danger',
        }
      : null,
    account.status === 'PND_CREDIT'
      ? {
          title: 'Post No Credit',
          description: 'Credit transactions are restricted on this account.',
          tone: 'warning',
        }
      : null,
    account.status === 'DORMANT'
      ? {
          title: 'Account is dormant',
          description: 'Reactivation is required before transactions can resume.',
          tone: 'warning',
        }
      : null,
    !account.allowDebit && account.status === 'ACTIVE'
      ? {
          title: 'Debit access is blocked',
          description: 'Operational controls currently prevent debit transactions.',
          tone: 'warning',
        }
      : null,
    !account.allowCredit && account.status === 'ACTIVE'
      ? {
          title: 'Credit access is blocked',
          description: 'Operational controls currently prevent incoming credits.',
          tone: 'warning',
        }
      : null,
    account.holdAmount > 0
      ? {
          title: 'Funds on hold',
          description: `Hold of ${account.currency} ${account.holdAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} is currently active.`,
          tone: 'warning',
        }
      : null,
    account.overdraftLimit > 0
      ? {
          title: 'Overdraft facility active',
          description: `Overdraft limit of ${account.currency} ${account.overdraftLimit.toLocaleString('en-NG', { minimumFractionDigits: 2 })} is available on this account.`,
          tone: 'info',
        }
      : null,
  ].filter(Boolean) as { title: string; description: string; tone: 'danger' | 'warning' | 'info' }[];

  return (
    <div className="p-6 space-y-6 md:p-7">
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="account-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Relationship</p>
              <h2 className="mt-2 text-base font-semibold">Customer profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">Primary ownership and servicing metadata for this account.</p>
            </div>
            <div className="account-icon-badge">
              <UserRound className="h-4 w-4" />
            </div>
          </div>
          <dl className="mt-5 space-y-3">
            <div className="account-inline-fact px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Primary Customer</dt>
              <dd className="mt-2 text-sm font-medium">{account.customerName}</dd>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="account-inline-fact px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Customer ID</dt>
                <dd className="mt-2 font-mono text-sm">{account.customerId}</dd>
              </div>
              <div className="account-inline-fact px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">CIF Number</dt>
                <dd className="mt-2 font-mono text-sm">{account.customerCifNumber ?? 'Not assigned'}</dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="account-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Controls</p>
              <h2 className="mt-2 text-base font-semibold">Operational posture</h2>
              <p className="mt-1 text-sm text-muted-foreground">Live transaction permissions, status, and balance access.</p>
            </div>
            <div className="account-icon-badge">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="account-inline-fact flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="mt-2 text-sm font-medium">Current operating state</p>
              </div>
              <StatusBadge status={account.status} dot />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="account-inline-fact px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Debit access</dt>
                <dd className={cn('mt-2 text-sm font-medium', account.allowDebit ? 'text-emerald-500' : 'text-amber-500')}>
                  {account.allowDebit ? 'Enabled' : 'Blocked'}
                </dd>
              </div>
              <div className="account-inline-fact px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Credit access</dt>
                <dd className={cn('mt-2 text-sm font-medium', account.allowCredit ? 'text-emerald-500' : 'text-amber-500')}>
                  {account.allowCredit ? 'Enabled' : 'Blocked'}
                </dd>
              </div>
            </div>
            <div className="account-inline-fact px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Usable Funds</dt>
              <dd className="mt-2">
                <MoneyDisplay amount={account.availableBalance} currency={account.currency} size="lg" />
              </dd>
            </div>
          </div>
        </section>

        <section className="account-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Lifecycle</p>
              <h2 className="mt-2 text-base font-semibold">Key milestones</h2>
              <p className="mt-1 text-sm text-muted-foreground">Dates and servicing anchors across the account lifecycle.</p>
            </div>
            <div className="account-icon-badge">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <dl className="mt-5 space-y-3">
            <div className="account-inline-fact px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Date Opened</dt>
              <dd className="mt-2 text-sm font-medium">{formatDate(account.openedDate)}</dd>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="account-inline-fact px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Date Activated</dt>
                <dd className="mt-2 text-sm font-medium">
                  {account.activatedDate ? formatDate(account.activatedDate) : 'Not yet activated'}
                </dd>
              </div>
              <div className="account-inline-fact px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Last Transaction</dt>
                <dd className="mt-2 text-sm font-medium">
                  {account.lastTransactionDate ? formatDate(account.lastTransactionDate) : 'No transactions'}
                </dd>
              </div>
            </div>
          </dl>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.92fr)]">
        <div className="space-y-6">
          <DetailPanel title="Account Information" description="Core account details and identifiers.">
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
          </DetailPanel>

          {account.signatories && account.signatories.length > 0 && (
            <DetailPanel title="Signatories" description="Authorized signatories on this account.">
              <div className="overflow-hidden rounded-[20px] border border-border/70 bg-background/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/45">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.signatories.map((sig, i) => (
                      <tr key={`${sig.name}-${sig.role}-${i}`} className={cn('bg-transparent', i < account.signatories!.length - 1 && 'border-b border-border/60')}>
                        <td className="px-4 py-3.5 font-medium">{sig.name}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{sig.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailPanel>
          )}

          <DetailPanel title="Interest Parameters" description="Current interest configuration exposed by the live account contract.">
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
          </DetailPanel>
        </div>

        <div className="space-y-6">
          <DetailPanel title="Key Dates" description="Important lifecycle dates for this account.">
            <InfoGrid
              columns={2}
              items={[
                { label: 'Date Opened', value: account.openedDate, format: 'date' as const },
                { label: 'Date Activated', value: account.activatedDate ?? 'Not yet activated', format: account.activatedDate ? 'date' as const : undefined },
                { label: 'Last Transaction', value: account.lastTransactionDate ?? 'No transactions', format: account.lastTransactionDate ? 'date' as const : undefined },
                ...(account.dormancyDate ? [{ label: 'Dormancy Date', value: account.dormancyDate, format: 'date' as const }] : []),
                ...(account.maturityDate ? [{ label: 'Maturity Date', value: account.maturityDate, format: 'date' as const }] : []),
                ...(account.closedDate ? [{ label: 'Closed Date', value: account.closedDate, format: 'date' as const }] : []),
              ]}
            />
          </DetailPanel>

          <DetailPanel title="Account Restrictions & Flags" description="Operational restrictions currently applied to this account.">
            {restrictions.length > 0 ? (
              <div className="space-y-3">
                {restrictions.map((restriction) => (
                  <div
                    key={restriction.title}
                    className={cn(
                      'account-flag-card',
                      restriction.tone === 'danger' && 'account-flag-card-danger',
                      restriction.tone === 'warning' && 'account-flag-card-warning',
                      restriction.tone === 'info' && 'account-flag-card-info',
                    )}
                  >
                    <div
                      className={cn(
                        'account-flag-icon',
                        restriction.tone === 'danger' && 'account-flag-icon-danger',
                        restriction.tone === 'warning' && 'account-flag-icon-warning',
                        restriction.tone === 'info' && 'account-flag-icon-info',
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          restriction.tone === 'danger' && 'text-red-200',
                          restriction.tone === 'warning' && 'text-amber-200',
                          restriction.tone === 'info' && 'text-blue-200',
                        )}
                      >
                        {restriction.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{restriction.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="account-flag-card account-flag-card-success items-start">
                <div className="account-flag-icon account-flag-icon-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-200">No active restrictions</p>
                  <p className="mt-1 text-sm text-muted-foreground">No active restrictions on this account.</p>
                </div>
              </div>
            )}
          </DetailPanel>

          <section className="account-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Servicing Anchors</p>
                <h2 className="mt-2 text-base font-semibold">Relationship and controls</h2>
                <p className="mt-1 text-sm text-muted-foreground">Fast facts frequently referenced during account servicing.</p>
              </div>
              <div className="account-icon-badge">
                <Fingerprint className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="account-inline-fact flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-2.5">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Servicing Officer</p>
                    <p className="text-xs text-muted-foreground">Primary servicing owner</p>
                  </div>
                </div>
                <span className="text-sm font-medium">Officer {account.relationshipManager}</span>
              </div>

              <div className="account-inline-fact flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-2.5">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Statement Frequency</p>
                    <p className="text-xs text-muted-foreground">Delivery cadence exposed by the live contract</p>
                  </div>
                </div>
                <span className="text-sm font-medium">{account.statementFrequency}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
