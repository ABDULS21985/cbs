import { useState } from 'react';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { Copy, Check, Phone, Mail, Building2, Camera, MessageSquare, Sparkles, ShieldCheck, Layers3 } from 'lucide-react';
import type { Customer } from '../types/customer';
import { CustomerHealthGauge } from './CustomerHealthGauge';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { useHealthScore } from '../hooks/useCustomerIntelligence';

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
  onContactCustomer?: () => void;
}

export function CustomerHeader({ customer, accountCount, loanCount, cardCount, onContactCustomer }: CustomerHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const { data: healthScore, isLoading: healthLoading } = useHealthScore(customer.id);

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
    <div className="customer-hero-shell">
      <div className="customer-hero-overlay" />
      <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.3fr)_340px] xl:p-7">
        <div className="space-y-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative group">
              {customer.profilePhotoUrl ? (
                <img
                  src={customer.profilePhotoUrl}
                  alt={customer.fullName}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-4 ring-white/80"
                />
              ) : (
                <div className={cn(
                  'flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white shadow-[var(--surface-shadow-soft)]',
                  TYPE_AVATAR_COLORS[customer.type] ?? TYPE_AVATAR_COLORS.INDIVIDUAL,
                )}>
                  {initials || '--'}
                </div>
              )}
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
                title="Upload photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[2rem] font-semibold tracking-tight">{customer.fullName}</h1>
                <StatusBadge status={customer.status} dot />
                {customer.riskRating && (
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', RISK_COLORS[customer.riskRating] ?? RISK_COLORS.MEDIUM)}>
                    {customer.riskRating.replace(/_/g, ' ')}
                  </span>
                )}
                {customer.kycStatus && (
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    customer.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    customer.kycStatus === 'EXPIRED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  )}>
                    KYC: {customer.kycStatus}
                    {kycDaysLeft != null && kycDaysLeft <= 30 && kycDaysLeft > 0 && ` (${kycDaysLeft}d)`}
                    {kycDaysLeft != null && kycDaysLeft <= 0 && ' (expired)'}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{customer.type}</span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Relationship workspace for servicing, product monitoring, and customer actions.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={copyNumber}
                  className="customer-hero-chip font-mono hover:text-foreground transition-colors"
                  title="Copy customer number"
                >
                  {customer.customerNumber}
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-50" />}
                </button>
                {customer.branchCode && (
                  <span className="customer-hero-chip"><Building2 className="h-3.5 w-3.5 text-primary" /> {customer.branchCode}</span>
                )}
                {accountCount != null && <span className="customer-hero-chip"><Layers3 className="h-3.5 w-3.5 text-primary" /> {accountCount} accounts</span>}
                {loanCount != null && <span className="customer-hero-chip"><Sparkles className="h-3.5 w-3.5 text-primary" /> {loanCount} loans</span>}
                {cardCount != null && <span className="customer-hero-chip"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> {cardCount} cards</span>}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
                    <Mail className="w-3.5 h-3.5 text-primary" /> {customer.email}
                  </a>
                )}
                {customer.relationshipManager && (
                  <span className="text-muted-foreground">RM: <span className="font-medium text-foreground">{customer.relationshipManager}</span></span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="customer-hero-panel p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Profile Reference</p>
              <p className="mt-2 text-base font-semibold">CIF profile</p>
              <p className="mt-1 text-sm text-muted-foreground">Reference {customer.customerNumber}</p>
            </div>
            <div className="customer-hero-panel p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Servicing Route</p>
              <p className="mt-2 text-base font-semibold">{customer.preferredChannel || 'Default channel'}</p>
              <p className="mt-1 text-sm text-muted-foreground">Onboarded via {customer.onboardedChannel || 'N/A'}</p>
            </div>
            <div className="customer-hero-panel p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Relationship Owner</p>
              <p className="mt-2 text-base font-semibold">{customer.relationshipManager || 'Unassigned'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Customer since {customer.customerSince ? formatDate(customer.customerSince) : customer.createdAt ? formatDate(customer.createdAt) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="customer-hero-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Relationship Health</p>
                <h2 className="mt-2 text-lg font-semibold">Engagement posture</h2>
                <p className="mt-1 text-sm text-muted-foreground">Live health, lifecycle status, and customer responsiveness snapshot.</p>
              </div>
              <CustomerHealthGauge healthScore={healthScore} isLoading={healthLoading} size="md" />
            </div>
            <div className="mt-5 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Lifecycle status</span>
                <StatusBadge status={customer.status} dot />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Risk profile</span>
                <span className="text-sm font-medium">{customer.riskRating ?? 'Unrated'}</span>
              </div>
            </div>
          </div>

          <div className="customer-hero-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Service Actions</p>
                <h2 className="mt-2 text-lg font-semibold">Reach and response</h2>
                <p className="mt-1 text-sm text-muted-foreground">Fast access to communication and customer tenure context.</p>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/10 p-2.5 text-primary">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {onContactCustomer && (
                <button
                  onClick={onContactCustomer}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <MessageSquare className="w-4 h-4" /> Contact Customer
                </button>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Customer Since</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums">
                    {customer.customerSince ? formatDate(customer.customerSince) : customer.createdAt ? formatDate(customer.createdAt) : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Preferred Channel</p>
                  <p className="mt-2 text-sm font-semibold">{customer.preferredChannel || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPhotoUpload && <PhotoUploadDialog customerId={customer.id} onClose={() => setShowPhotoUpload(false)} />}
    </div>
  );
}
