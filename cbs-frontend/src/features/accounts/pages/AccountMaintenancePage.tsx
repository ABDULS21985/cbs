import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Settings, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { accountMaintenanceApi } from '../api/accountMaintenanceApi';
import { StatusChangeForm } from '../components/maintenance/StatusChangeForm';
import { SignatoryManager } from '../components/maintenance/SignatoryManager';
import { InterestRateOverrideForm } from '../components/maintenance/InterestRateOverrideForm';
import { LimitChangeForm } from '../components/maintenance/LimitChangeForm';
import { OfficerChangeForm } from '../components/maintenance/OfficerChangeForm';
import { MaintenanceHistoryTimeline } from '../components/maintenance/MaintenanceHistoryTimeline';

const SECTIONS = [
  { id: 'status', label: 'Status Change', description: 'Activate, freeze, or close this account' },
  { id: 'signatories', label: 'Signatory Management', description: 'Add or remove signatories and update signing rules' },
  { id: 'interest', label: 'Interest Rate Override', description: 'Override the account interest rate temporarily' },
  { id: 'limits', label: 'Transaction Limits', description: 'Adjust daily, per-transaction, and channel-specific limits' },
  { id: 'officer', label: 'Account Officer', description: 'Reassign to a different relationship officer' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function AccordionSection({
  label,
  description,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

export function AccountMaintenancePage() {
  const { id: accountId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [openSection, setOpenSection] = useState<SectionId | null>('status');

  const { data: account, isLoading, isError, refetch } = useQuery({
    queryKey: ['account-basic-info', accountId],
    queryFn: () => accountMaintenanceApi.getAccountBasicInfo(accountId!),
    enabled: !!accountId,
    staleTime: 60_000,
  });

  const handleToggle = (sectionId: SectionId) => {
    setOpenSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['account-basic-info', accountId] });
    queryClient.invalidateQueries({ queryKey: ['account-maintenance-history', accountId] });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Account Maintenance"
          backTo={`/accounts/${accountId}`}
        />
        <div className="page-container space-y-4">
          <div className="rounded-xl border bg-card p-5 animate-pulse">
            <div className="h-5 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5 animate-pulse">
              <div className="h-4 w-40 bg-muted rounded mb-1.5" />
              <div className="h-3 w-64 bg-muted rounded" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (isError || !account) {
    return (
      <>
        <PageHeader
          title="Account Maintenance"
          backTo={`/accounts/${accountId}`}
        />
        <div className="page-container">
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Failed to load account information</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Unable to retrieve account details. Please check your connection and try again.
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 text-sm font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Account Maintenance"
        subtitle="Manage account settings, signatories, limits, and more"
        backTo={`/accounts/${accountId}`}
        actions={
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground hidden sm:inline">Maintenance Mode</span>
          </div>
        }
      />

      <div className="page-container space-y-4">
        {/* Account info header */}
        <div className="rounded-xl border bg-card px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Account Number</p>
              <p className="font-mono font-semibold text-sm tracking-wider">{account.accountNumber}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Account Name</p>
              <p className="text-sm font-semibold">{account.accountTitle}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Product</p>
              <p className="text-sm">{account.productName}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Currency</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {account.currency}
              </span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              <StatusBadge status={account.status} dot />
            </div>
          </div>
        </div>

        {/* Accordion sections */}
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <AccordionSection
              key={section.id}
              label={section.label}
              description={section.description}
              isOpen={openSection === section.id}
              onToggle={() => handleToggle(section.id)}
            >
              {section.id === 'status' && (
                <div className="pt-3">
                  <StatusChangeForm
                    accountId={accountId!}
                    currentStatus={account.status}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
              {section.id === 'signatories' && (
                <div className="pt-3">
                  <SignatoryManager
                    accountId={accountId!}
                    signatories={account.signatories}
                    currentSigningRule={account.signingRule}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
              {section.id === 'interest' && (
                <div className="pt-3">
                  <InterestRateOverrideForm
                    accountId={accountId!}
                    currentRate={account.interestRate}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
              {section.id === 'limits' && (
                <div className="pt-3">
                  <LimitChangeForm
                    accountId={accountId!}
                    currentLimits={account.limits}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
              {section.id === 'officer' && (
                <div className="pt-3">
                  <OfficerChangeForm
                    accountId={accountId!}
                    currentOfficer={account.currentOfficer}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
            </AccordionSection>
          ))}
        </div>

        {/* Maintenance history */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Maintenance History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete audit trail of all maintenance actions performed on this account
            </p>
          </div>
          <MaintenanceHistoryTimeline accountId={accountId!} />
        </div>
      </div>
    </>
  );
}
