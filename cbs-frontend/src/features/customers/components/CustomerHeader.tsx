import { formatDate } from '@/lib/formatters';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Customer } from '../types/customer';

const RISK_COLORS = {
  LOW: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400',
};

interface CustomerHeaderProps {
  customer: Customer;
}

export function CustomerHeader({ customer }: CustomerHeaderProps) {
  const initials = customer.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const yearsAsCustomer = customer.customerSince
    ? Math.floor((Date.now() - new Date(customer.customerSince).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>

        {/* Core info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{customer.fullName}</h1>
            <StatusBadge status={customer.status} dot />
            {customer.riskRating && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${RISK_COLORS[customer.riskRating]}`}>
                {customer.riskRating} RISK
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-mono">{customer.customerNumber}</span>
            <span>·</span>
            <span>{customer.type}</span>
            <span>·</span>
            <span>{customer.segment}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-2">
            {customer.phone && <span>📞 {customer.phone}</span>}
            {customer.email && <span>✉️ {customer.email}</span>}
            {customer.branchName && <span>🏦 {customer.branchName}</span>}
          </div>
          {(customer.bvn || customer.nin) && (
            <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500 mt-1">
              {customer.bvn && <span>BVN: {customer.bvn}</span>}
              {customer.nin && <span>NIN: {customer.nin}</span>}
            </div>
          )}
        </div>

        {/* TRV + customer since */}
        <div className="text-right shrink-0">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">Total Relationship Value</div>
          <MoneyDisplay amount={customer.totalRelationshipValue ?? 0} size="xl" />
          {customer.customerSince && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Since {formatDate(customer.customerSince)}
              {yearsAsCustomer !== null && ` (${yearsAsCustomer}yr${yearsAsCustomer !== 1 ? 's' : ''})`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
