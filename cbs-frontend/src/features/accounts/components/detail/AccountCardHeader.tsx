import { Link } from 'react-router-dom';
import {
  ArrowRightLeft, FileText, Settings, Wallet,
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
  return (
    <div className="bg-gradient-to-br from-primary/90 to-primary rounded-xl text-primary-foreground p-6 shadow-lg">
      {/* Top row: type + status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider">
            {productTypeLabel[account.productType] ?? account.productType}
          </p>
          <h2 className="text-lg font-semibold mt-0.5">{account.accountTitle}</h2>
          <p className="text-primary-foreground/70 text-xs mt-0.5">{account.productName}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={account.status} size="sm" dot />
        </div>
      </div>

      {/* Account meta */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-primary-foreground/70 mb-5">
        <span className="font-mono text-primary-foreground font-medium tracking-widest">
          {formatAccountNumber(account.accountNumber)}
        </span>
        <span>{account.branchCode}</span>
        <span>Opened {formatDate(account.openedDate)}</span>
        <span>Officer: {account.relationshipManager}</span>
      </div>

      {/* Balance columns */}
      <div className={cn('grid gap-4 mb-6 bg-black/10 rounded-lg p-4', account.overdraftLimit > 0 ? 'grid-cols-4' : 'grid-cols-3')}>
        <div className="text-center">
          <p className="text-xs text-primary-foreground/60 font-medium mb-1">Available Balance</p>
          <MoneyDisplay
            amount={account.availableBalance}
            currency={account.currency}
            size="lg"
            className="text-primary-foreground"
          />
        </div>
        <div className="text-center border-x border-primary-foreground/20">
          <p className="text-xs text-primary-foreground/60 font-medium mb-1">Ledger Balance</p>
          <MoneyDisplay
            amount={account.ledgerBalance}
            currency={account.currency}
            size="lg"
            className="text-primary-foreground"
          />
        </div>
        <div className="text-center">
          <p className="text-xs text-primary-foreground/60 font-medium mb-1">Hold Amount</p>
          <MoneyDisplay
            amount={account.holdAmount}
            currency={account.currency}
            size="lg"
            className={cn('text-primary-foreground', account.holdAmount > 0 && 'text-amber-300')}
          />
        </div>
        {account.overdraftLimit > 0 && (
          <div className="text-center border-l border-primary-foreground/20">
            <p className="text-xs text-primary-foreground/60 font-medium mb-1">Overdraft Limit</p>
            <MoneyDisplay
              amount={account.overdraftLimit}
              currency={account.currency}
              size="lg"
              className="text-primary-foreground"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/accounts/post-transaction?account=${account.accountNumber}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Post Transaction
        </Link>
        <Link
          to={`/accounts/wallets?accountId=${account.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Wallets
        </Link>
        <Link
          to="/accounts/statements"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          Statements
        </Link>
        <Link
          to={`/accounts/${account.accountNumber}/maintenance`}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          Account Maintenance
        </Link>
      </div>
    </div>
  );
}
