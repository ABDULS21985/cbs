import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { CustomerQuickActions } from './CustomerQuickActions';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { MapPin, Shield, FileText, Users, Pin } from 'lucide-react';
import type { Customer } from '../types/customer';

interface CustomerOverviewTabProps {
  customer: Customer;
}

export function CustomerOverviewTab({ customer }: CustomerOverviewTabProps) {
  const contactCount = new Set(
    [customer.phone, customer.email, ...customer.contacts.map((c) => c.contactValue)].filter(Boolean),
  ).size;

  const isIndividual = customer.type === 'INDIVIDUAL' || customer.type === 'SOLE_PROPRIETOR';

  const personalItems = isIndividual
    ? [
        { label: 'Date of Birth', value: customer.dateOfBirth || '—', format: 'date' as const },
        { label: 'Gender', value: customer.gender || '—' },
        { label: 'Nationality', value: customer.nationality || '—' },
        { label: 'State of Origin', value: customer.stateOfOrigin || '—' },
        { label: 'Tax ID (TIN)', value: customer.taxId || '—', mono: true },
        { label: 'BVN', value: customer.bvn || '—', mono: true },
        { label: 'Preferred Language', value: customer.preferredLanguage || '—' },
        { label: 'Preferred Channel', value: customer.preferredChannel || '—' },
        { label: 'Onboarded Channel', value: customer.onboardedChannel || '—' },
      ]
    : [
        { label: 'Registered Name', value: customer.fullName },
        { label: 'Registration Number', value: customer.registrationNumber || '—', mono: true },
        { label: 'Industry', value: customer.industry || '—' },
        { label: 'Sector', value: customer.sector || '—' },
        { label: 'Tax ID (TIN)', value: customer.taxId || '—', mono: true },
        { label: 'Preferred Language', value: customer.preferredLanguage || '—' },
        { label: 'Preferred Channel', value: customer.preferredChannel || '—' },
        { label: 'Onboarded Channel', value: customer.onboardedChannel || '—' },
        { label: 'Relationship Manager', value: customer.relationshipManager || '—' },
      ];

  const kycDaysLeft = customer.kycExpiryDate
    ? Math.ceil((new Date(customer.kycExpiryDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="p-4 space-y-6">
      <CustomerQuickActions customerId={customer.id} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Addresses" value={customer.addresses.length} icon={MapPin} />
        <StatCard label="IDs on File" value={customer.identifications.length} icon={Shield} />
        <StatCard label="Contacts" value={contactCount} icon={FileText} />
        <StatCard label="Relationships" value={customer.relationships.length} icon={Users} />
      </div>

      {/* Two-column: Personal Info + KYC/Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <FormSection title={isIndividual ? 'Personal Information' : 'Corporate Information'}>
            <InfoGrid items={personalItems} columns={3} />
          </FormSection>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">KYC Status</h3>
            <div className="flex items-center justify-between">
              <StatusBadge status={customer.kycStatus} />
              {customer.kycExpiryDate && (
                <span className={cn('text-xs',
                  kycDaysLeft != null && kycDaysLeft <= 0 ? 'text-red-600 font-medium' :
                  kycDaysLeft != null && kycDaysLeft <= 30 ? 'text-amber-600 font-medium' :
                  'text-muted-foreground'
                )}>
                  {kycDaysLeft != null && kycDaysLeft <= 0 ? 'Expired' :
                   kycDaysLeft != null ? `${kycDaysLeft} days left` :
                   formatDate(customer.kycExpiryDate)}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Risk Profile</h3>
            <div className="flex items-center justify-between">
              <StatusBadge status={customer.riskRating ?? 'MEDIUM'} size="sm" />
              <span className="text-xs text-muted-foreground">
                {customer.status === 'ACTIVE' ? 'Lifecycle Active' : `Lifecycle ${customer.status}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Identifications */}
      {customer.identifications.length > 0 && (
        <FormSection title="Identifications" collapsible defaultOpen={false}>
          <div className="space-y-2">
            {customer.identifications.map((id) => (
              <div key={id.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{id.identificationType}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {id.identificationNumber.length > 6
                      ? `${id.identificationNumber.slice(0, 3)}****${id.identificationNumber.slice(-3)}`
                      : id.identificationNumber}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={id.verificationStatus ?? 'PENDING'} size="sm" />
                  {id.expiryDate && <p className="text-[10px] text-muted-foreground mt-0.5">Exp: {formatDate(id.expiryDate)}</p>}
                </div>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Addresses */}
      {customer.addresses.length > 0 && (
        <FormSection title="Addresses" collapsible defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customer.addresses.map((addr) => (
              <div key={addr.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{addr.addressType}</span>
                  {addr.isPrimary && <span className="text-[10px] font-bold text-primary">PRIMARY</span>}
                </div>
                <p className="text-sm">{[addr.addressLine1, addr.addressLine2].filter(Boolean).join(', ')}</p>
                <p className="text-xs text-muted-foreground">{[addr.city, addr.state, addr.country].filter(Boolean).join(', ')}</p>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Contacts */}
      {customer.contacts.length > 0 && (
        <FormSection title="Contact Methods" collapsible defaultOpen={false}>
          <div className="space-y-2">
            {customer.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">{c.contactType}</span>
                  <span className="text-sm">{c.contactValue}</span>
                  {c.isPrimary && <span className="text-[10px] font-bold text-primary">PRIMARY</span>}
                </div>
                <StatusBadge status={c.isVerified ? 'VERIFIED' : 'UNVERIFIED'} size="sm" />
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Relationships */}
      {customer.relationships.length > 0 && (
        <FormSection title="Relationships" collapsible defaultOpen={false}>
          <div className="space-y-2">
            {customer.relationships.map((rel, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{rel.relatedCustomerName}</p>
                  <p className="text-xs text-muted-foreground">{rel.relationshipType}</p>
                </div>
                {rel.ownershipPercentage != null && (
                  <span className="text-sm font-mono font-medium">{rel.ownershipPercentage}%</span>
                )}
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Notes */}
      {customer.notes.length > 0 && (
        <FormSection title="Notes" collapsible defaultOpen={false}>
          <div className="space-y-3">
            {[...customer.notes].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((note, i) => (
              <div key={i} className={cn('rounded-lg border p-3', note.isPinned && 'border-primary/30 bg-primary/5')}>
                <div className="flex items-center gap-2 mb-1">
                  {note.isPinned && <Pin className="w-3 h-3 text-primary" />}
                  <span className="text-xs font-medium">{note.subject}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{note.createdBy} · {note.createdAt ? formatDate(note.createdAt) : ''}</span>
                </div>
                <p className="text-sm text-muted-foreground">{note.content}</p>
              </div>
            ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
