import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CustomerQuickActions } from './CustomerQuickActions';
import type { Customer } from '../types/customer';

interface CustomerOverviewTabProps {
  customer: Customer;
}

export function CustomerOverviewTab({ customer }: CustomerOverviewTabProps) {
  const contactCount = new Set(
    [
      customer.phone ?? null,
      customer.email ?? null,
      ...customer.contacts.map((contact) => contact.contactValue),
    ].filter((value): value is string => Boolean(value)),
  ).size;

  const personalItems = [
    { label: 'Date of Birth', value: customer.dateOfBirth || '—', format: 'date' as const },
    { label: 'Gender', value: customer.gender || '—' },
    { label: 'Nationality', value: customer.nationality || '—' },
    { label: 'Home Address', value: customer.homeAddress || '—' },
    { label: 'Preferred Language', value: customer.preferredLanguage || '—' },
    { label: 'Preferred Channel', value: customer.preferredChannel || '—' },
    { label: 'Relationship Manager', value: customer.relationshipManager || '—' },
    { label: 'Tax ID', value: customer.taxId || '—' },
    { label: 'Onboarded Channel', value: customer.onboardedChannel || '—' },
  ];

  return (
    <div className="space-y-6">
      <CustomerQuickActions customerId={customer.id} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Addresses" value={customer.addresses.length} />
        <StatCard label="IDs on File" value={customer.identifications.length} />
        <StatCard label="Contacts" value={contactCount} />
        <StatCard label="Relationships" value={customer.relationships.length} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Customer Information</h3>
        <InfoGrid items={personalItems} columns={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">KYC Status</h3>
          <div className="flex items-center justify-between">
            <StatusBadge status={customer.kycStatus} />
            {customer.kycExpiryDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Expires: {new Date(customer.kycExpiryDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Profile</h3>
          <div className="flex items-center justify-between">
            <StatusBadge status={customer.riskRating ?? 'MEDIUM'} size="sm" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {customer.status === 'ACTIVE' ? 'Lifecycle Active' : `Lifecycle ${customer.status}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
