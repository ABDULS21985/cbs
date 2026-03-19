import { StatCard } from '@/components/shared/StatCard';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CustomerQuickActions } from './CustomerQuickActions';
import type { Customer } from '../types/customer';

interface CustomerOverviewTabProps {
  customer: Customer;
}

export function CustomerOverviewTab({ customer }: CustomerOverviewTabProps) {
  const personalItems = [
    { label: 'Date of Birth', value: customer.dateOfBirth || '—', format: 'date' as const },
    { label: 'Gender', value: customer.gender || '—' },
    { label: 'Nationality', value: customer.nationality || '—' },
    { label: 'Home Address', value: customer.homeAddress || '—' },
    { label: 'Employer', value: customer.employerName || '—' },
    { label: 'Occupation', value: customer.occupation || '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <CustomerQuickActions customerId={customer.id} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Deposit Accounts" value={customer.totalAccounts ?? 0} />
        <StatCard label="Active Loans" value={customer.totalLoans ?? 0} />
        <StatCard label="Cards" value={customer.totalCards ?? 0} />
        <StatCard label="Open Cases" value={customer.openCases ?? 0} />
      </div>

      {/* Personal details */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Personal Information</h3>
        <InfoGrid items={personalItems.map(i => ({ ...i, value: i.value ?? '—' }))} columns={3} />
      </div>

      {/* KYC Status + Risk Profile */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">KYC Status</h3>
          <div className="flex items-center justify-between">
            <StatusBadge status={customer.kycStatus} />
            {customer.kycExpiryDate && (
              <span className="text-xs text-gray-500">
                Expires: {new Date(customer.kycExpiryDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Profile</h3>
          {customer.riskScore !== undefined && (
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.riskScore}</div>
              {customer.riskRating && (
                <StatusBadge
                  status={
                    customer.riskRating === 'LOW'
                      ? 'ACTIVE'
                      : customer.riskRating === 'HIGH'
                      ? 'SUSPENDED'
                      : 'PENDING'
                  }
                  size="sm"
                />
              )}
            </div>
          )}
          {customer.behavioralTags && customer.behavioralTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customer.behavioralTags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
