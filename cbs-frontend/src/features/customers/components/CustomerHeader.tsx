import { useState } from 'react';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { Copy, Check, Phone, Mail, Building2 } from 'lucide-react';
import type { Customer } from '../types/customer';

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VERY_HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  PEP: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  SANCTIONED: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
};

const TYPE_AVATAR_COLORS: Record<string, string> = {
  INDIVIDUAL: 'from-blue-500 to-blue-700',
  CORPORATE: 'from-purple-500 to-purple-700',
  SME: 'from-green-500 to-green-700',
  SOLE_PROPRIETOR: 'from-amber-500 to-amber-700',
  TRUST: 'from-cyan-500 to-cyan-700',
  GOVERNMENT: 'from-gray-500 to-gray-700',
  NGO: 'from-pink-500 to-pink-700',
};

interface CustomerHeaderProps {
  customer: Customer;
  accountCount?: number;
  loanCount?: number;
  cardCount?: number;
}

export function CustomerHeader({ customer, accountCount, loanCount, cardCount }: CustomerHeaderProps) {
  const [copied, setCopied] = useState(false);

  const initials = customer.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const copyNumber = () => {
    navigator.clipboard.writeText(customer.customerNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const kycDaysLeft = customer.kycExpiryDate
    ? Math.ceil((new Date(customer.kycExpiryDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className={cn(
          'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl font-bold text-white',
          TYPE_AVATAR_COLORS[customer.type] ?? TYPE_AVATAR_COLORS.INDIVIDUAL,
        )}>
          {initials || '--'}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{customer.fullName}</h1>
            <StatusBadge status={customer.status} dot />
            {customer.riskRating && (
              <span className={cn('rounded px-2 py-0.5 text-xs font-medium', RISK_COLORS[customer.riskRating] ?? RISK_COLORS.MEDIUM)}>
                {customer.riskRating.replace(/_/g, ' ')}
              </span>
            )}
            {customer.kycStatus && (
              <span className={cn('rounded px-2 py-0.5 text-xs font-medium',
                customer.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                customer.kycStatus === 'EXPIRED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}>
                KYC: {customer.kycStatus}
                {kycDaysLeft != null && kycDaysLeft <= 30 && kycDaysLeft > 0 && ` (${kycDaysLeft}d)`}
                {kycDaysLeft != null && kycDaysLeft <= 0 && ' (expired)'}
              </span>
            )}
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">{customer.type}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <button onClick={copyNumber} className="flex items-center gap-1 font-mono hover:text-foreground transition-colors" title="Copy customer number">
              {customer.customerNumber}
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-50" />}
            </button>
            {customer.branchCode && (
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {customer.branchCode}</span>
            )}
            {accountCount != null && <span>{accountCount} accounts</span>}
            {loanCount != null && <span>{loanCount} loans</span>}
            {cardCount != null && <span>{cardCount} cards</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" /> {customer.email}
              </a>
            )}
            {customer.relationshipManager && (
              <span className="text-muted-foreground">RM: <span className="font-medium text-foreground">{customer.relationshipManager}</span></span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted-foreground">Customer Since</div>
          <div className="text-base font-semibold tabular-nums">
            {customer.customerSince ? formatDate(customer.customerSince) : customer.createdAt ? formatDate(customer.createdAt) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
