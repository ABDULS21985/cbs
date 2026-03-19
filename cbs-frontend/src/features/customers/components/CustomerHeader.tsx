import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Customer } from '../types/customer';

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VERY_HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  PEP: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  SANCTIONED: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
};

interface CustomerHeaderProps {
  customer: Customer;
}

export function CustomerHeader({ customer }: CustomerHeaderProps) {
  const initials = customer.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white">
          {initials || '--'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{customer.fullName}</h1>
            <StatusBadge status={customer.status} dot />
            {customer.riskRating && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_COLORS[customer.riskRating] ?? RISK_COLORS.MEDIUM}`}>
                {customer.riskRating.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-mono">{customer.customerNumber}</span>
            <span>{customer.type}</span>
            {customer.branchCode && <span>{customer.branchCode}</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
            {customer.phone && <span>{customer.phone}</span>}
            {customer.email && <span>{customer.email}</span>}
            {customer.relationshipManager && <span>RM: {customer.relationshipManager}</span>}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">Customer Since</div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {customer.createdAt ? formatDate(customer.createdAt) : '—'}
          </div>
          {customer.kycStatus && (
            <div className="mt-2">
              <StatusBadge status={customer.kycStatus} size="sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
