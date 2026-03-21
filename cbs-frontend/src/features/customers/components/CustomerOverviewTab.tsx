import { useState } from 'react';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { CustomerQuickActions } from './CustomerQuickActions';
import { EditableSection } from './CustomerEditMode';
import { RelationshipGraph } from './RelationshipGraph';
import { AddAddressDialog } from './AddAddressDialog';
import { AddContactDialog } from './AddContactDialog';
import { AddNoteDialog } from './AddNoteDialog';
import { AddRelationshipDialog } from './AddRelationshipDialog';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { MapPin, Shield, FileText, Users, Pin, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer, CustomerAddress } from '../types/customer';
import { usePatchCustomer, useRelationshipGraph } from '../hooks/useCustomerIntelligence';
import { useDeleteAddress } from '../hooks/useCustomers';
import { usePermission } from '@/hooks/usePermission';

type DialogState =
  | { type: 'none' }
  | { type: 'addAddress' }
  | { type: 'editAddress'; address: CustomerAddress }
  | { type: 'addContact' }
  | { type: 'addNote' }
  | { type: 'addRelationship' }
  | { type: 'changeStatus' };

interface CustomerOverviewTabProps {
  customer: Customer;
}

export function CustomerOverviewTab({ customer }: CustomerOverviewTabProps) {
  const patchCustomer = usePatchCustomer();
  const deleteAddress = useDeleteAddress();
  const { data: graphData, isLoading: graphLoading } = useRelationshipGraph(customer.id);
  const canEdit = usePermission('customers', 'update');
  const canAdmin = usePermission('customers', 'delete');

  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const contactCount = new Set(
    [customer.phone, customer.email, ...customer.contacts.map((c) => c.contactValue)].filter(Boolean),
  ).size;

  const isIndividual = customer.type === 'INDIVIDUAL' || customer.type === 'SOLE_PROPRIETOR';

  const handleSave = async (_sectionId: string, data: Record<string, unknown>) => {
    // Map frontend field names to backend DTO field names
    const mapped = { ...data };
    if ('phone' in mapped) {
      mapped.phonePrimary = mapped.phone;
      delete mapped.phone;
    }
    await patchCustomer.mutateAsync({ id: customer.id, data: mapped });
  };

  const handleDeleteAddress = async (addressId: number) => {
    try {
      await deleteAddress.mutateAsync({ customerId: customer.id, addressId });
      toast.success('Address deleted');
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const personalItems = isIndividual
    ? [
        { label: 'Date of Birth', value: customer.dateOfBirth || '—', format: 'date' as const },
        { label: 'Gender', value: customer.gender || '—' },
        { label: 'Nationality', value: customer.nationality || '—' },
        { label: 'State of Origin', value: customer.stateOfOrigin || '—' },
        { label: 'Marital Status', value: customer.maritalStatus || '—' },
        { label: 'Tax ID (TIN)', value: customer.taxId || '—', mono: true },
        { label: 'BVN', value: customer.bvn || '—', mono: true },
        { label: 'Preferred Language', value: customer.preferredLanguage || '—' },
        { label: 'Preferred Channel', value: customer.preferredChannel || '—' },
      ]
    : [
        { label: 'Registered Name', value: customer.fullName },
        { label: 'Registration Number', value: customer.registrationNumber || '—', mono: true },
        { label: 'Industry', value: customer.industryCode || '—' },
        { label: 'Sector', value: customer.sectorCode || '—' },
        { label: 'Tax ID (TIN)', value: customer.taxId || '—', mono: true },
        { label: 'Preferred Language', value: customer.preferredLanguage || '—' },
        { label: 'Preferred Channel', value: customer.preferredChannel || '—' },
        { label: 'Onboarded Channel', value: customer.onboardedChannel || '—' },
        { label: 'Relationship Manager', value: customer.relationshipManager || '—' },
      ];

  const contactItems = [
    { label: 'Email', value: customer.email || '—' },
    { label: 'Phone', value: customer.phone || '—' },
    { label: 'Secondary Phone', value: customer.phoneSecondary || '—' },
    { label: 'Preferred Language', value: customer.preferredLanguage || '—' },
    { label: 'Preferred Channel', value: customer.preferredChannel || '—' },
  ];

  const employmentItems = [
    { label: 'Employer', value: customer.employerName || '—' },
    { label: 'Occupation', value: customer.occupation || '—' },
  ];

  const kycDaysLeft = customer.kycExpiryDate
    ? Math.ceil((new Date(customer.kycExpiryDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="p-4 space-y-6">
      <CustomerQuickActions
        customerId={customer.id}
        customerStatus={customer.status}
        customerName={customer.fullName}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Addresses" value={customer.addresses.length} icon={MapPin} />
        <StatCard label="IDs on File" value={customer.identifications.length} icon={Shield} />
        <StatCard label="Contacts" value={contactCount} icon={FileText} />
        <StatCard label="Relationships" value={customer.relationships.length} icon={Users} />
      </div>

      {/* Two-column: Personal Info + KYC/Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info — Editable */}
          <FormSection title={isIndividual ? 'Personal Information' : 'Corporate Information'}>
            <EditableSection
              sectionId="personal"
              title={isIndividual ? 'Personal Info' : 'Corporate Info'}
              customer={customer}
              onSave={handleSave}
              isSaving={patchCustomer.isPending}
            >
              <InfoGrid items={personalItems} columns={3} />
            </EditableSection>
          </FormSection>

          {/* Contact — Editable */}
          <FormSection title="Contact Details">
            <EditableSection
              sectionId="contact"
              title="Contact"
              customer={customer}
              onSave={handleSave}
              isSaving={patchCustomer.isPending}
            >
              <InfoGrid items={contactItems} columns={3} />
            </EditableSection>
          </FormSection>

          {/* Employment — Editable */}
          {isIndividual && (customer.employerName || customer.occupation) && (
            <FormSection title="Employment">
              <EditableSection
                sectionId="employment"
                title="Employment"
                customer={customer}
                onSave={handleSave}
                isSaving={patchCustomer.isPending}
              >
                <InfoGrid items={employmentItems} columns={2} />
              </EditableSection>
            </FormSection>
          )}
        </div>

        <div className="space-y-4">
          {/* KYC Status */}
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

          {/* Risk Profile — Editable */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Risk Profile</h3>
            <EditableSection
              sectionId="risk"
              title="Risk Rating"
              customer={customer}
              onSave={handleSave}
              isSaving={patchCustomer.isPending}
            >
              <div className="flex items-center justify-between">
                <StatusBadge status={customer.riskRating ?? 'MEDIUM'} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {customer.status === 'ACTIVE' ? 'Lifecycle Active' : `Lifecycle ${customer.status}`}
                </span>
              </div>
            </EditableSection>
          </div>

          {/* RM Assignment — Editable */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Relationship Manager</h3>
            <EditableSection
              sectionId="rm"
              title="RM"
              customer={customer}
              onSave={handleSave}
              isSaving={patchCustomer.isPending}
            >
              <p className="text-sm font-medium">{customer.relationshipManager || 'Not assigned'}</p>
            </EditableSection>
          </div>
        </div>
      </div>

      {/* Relationship Graph (replaces flat list) */}
      <FormSection title="Relationships" collapsible defaultOpen={customer.relationships.length > 0}>
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={() => setDialog({ type: 'addRelationship' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" /> Add Relationship
              </button>
            </div>
          )}
          {customer.relationships.length > 0 && graphData && (
            <RelationshipGraph
              data={graphData}
              centralCustomerId={customer.id}
              centralCustomerName={customer.fullName}
              isLoading={graphLoading}
            />
          )}
          {customer.relationships.length > 0 && !graphData && !graphLoading && (
            <div className="space-y-2">
              {customer.relationships.map((rel, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{rel.relatedCustomerDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{rel.relationshipType.replace(/_/g, ' ')}</p>
                  </div>
                  {rel.ownershipPercentage != null && (
                    <span className="text-sm font-mono font-medium">{rel.ownershipPercentage}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {customer.relationships.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No relationships recorded.</p>
          )}
        </div>
      </FormSection>

      {/* Identifications */}
      <FormSection title="Identifications" collapsible defaultOpen={customer.identifications.length > 0}>
        <div className="space-y-2">
          {customer.identifications.map((id) => (
            <div key={id.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{id.idType.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {id.idNumber.length > 6
                    ? `${id.idNumber.slice(0, 3)}****${id.idNumber.slice(-3)}`
                    : id.idNumber}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={id.isVerified ? 'VERIFIED' : 'PENDING'} size="sm" />
                {id.expiryDate && <p className="text-[10px] text-muted-foreground mt-0.5">Exp: {formatDate(id.expiryDate)}</p>}
              </div>
            </div>
          ))}
          {customer.identifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No identification documents on file.</p>
          )}
        </div>
      </FormSection>

      {/* Addresses */}
      <FormSection title="Addresses" collapsible defaultOpen={customer.addresses.length > 0}>
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={() => setDialog({ type: 'addAddress' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" /> Add Address
              </button>
            </div>
          )}
          {customer.addresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customer.addresses.map((addr) => (
                <div key={addr.id} className="rounded-lg border p-3 space-y-1 group relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">{addr.addressType.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-1">
                      {addr.isPrimary && <span className="text-[10px] font-bold text-primary">PRIMARY</span>}
                      {canEdit && (
                        <button onClick={() => setDialog({ type: 'editAddress', address: addr })}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all" title="Edit">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      {canAdmin && (
                        <button onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" title="Delete">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">{[addr.addressLine1, addr.addressLine2].filter(Boolean).join(', ')}</p>
                  <p className="text-xs text-muted-foreground">{[addr.city, addr.state, addr.country].filter(Boolean).join(', ')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No addresses recorded.</p>
          )}
        </div>
      </FormSection>

      {/* Contacts */}
      <FormSection title="Contact Methods" collapsible defaultOpen={customer.contacts.length > 0}>
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={() => setDialog({ type: 'addContact' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            </div>
          )}
          {customer.contacts.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No additional contact methods.</p>
          )}
        </div>
      </FormSection>

      {/* Notes */}
      <FormSection title="Notes" collapsible defaultOpen={customer.notes.length > 0}>
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={() => setDialog({ type: 'addNote' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" /> Add Note
              </button>
            </div>
          )}
          {customer.notes.length > 0 ? (
            <div className="space-y-3">
              {[...customer.notes].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((note, i) => (
                <div key={i} className={cn('rounded-lg border p-3', note.isPinned && 'border-primary/30 bg-primary/5')}>
                  <div className="flex items-center gap-2 mb-1">
                    {note.isPinned && <Pin className="w-3 h-3 text-primary" />}
                    <span className="text-xs font-medium">{note.subject || note.noteType}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{note.createdBy} · {note.createdAt ? formatDate(note.createdAt) : ''}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{note.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No notes recorded.</p>
          )}
        </div>
      </FormSection>

      {/* Dialogs */}
      {dialog.type === 'addAddress' && (
        <AddAddressDialog customerId={customer.id} onClose={() => setDialog({ type: 'none' })} />
      )}
      {dialog.type === 'editAddress' && (
        <AddAddressDialog customerId={customer.id} existing={dialog.address} onClose={() => setDialog({ type: 'none' })} />
      )}
      {dialog.type === 'addContact' && (
        <AddContactDialog customerId={customer.id} onClose={() => setDialog({ type: 'none' })} />
      )}
      {dialog.type === 'addNote' && (
        <AddNoteDialog customerId={customer.id} onClose={() => setDialog({ type: 'none' })} />
      )}
      {dialog.type === 'addRelationship' && (
        <AddRelationshipDialog customerId={customer.id} onClose={() => setDialog({ type: 'none' })} />
      )}
      {dialog.type === 'changeStatus' && (
        <ChangeStatusDialog
          customerId={customer.id}
          currentStatus={customer.status}
          customerName={customer.fullName}
          onClose={() => setDialog({ type: 'none' })}
        />
      )}
    </div>
  );
}
