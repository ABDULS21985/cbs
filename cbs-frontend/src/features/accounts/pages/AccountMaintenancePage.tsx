import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  AlertCircle,
  X,
  ShieldAlert,
  Users,
  Percent,
  ArrowUpDown,
  UserCog,
  FileSignature,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { accountMaintenanceApi } from '../api/accountMaintenanceApi';
import { StatusChangeForm } from '../components/maintenance/StatusChangeForm';
import { SignatoryManager } from '../components/maintenance/SignatoryManager';
import { InterestRateOverrideForm } from '../components/maintenance/InterestRateOverrideForm';
import { LimitChangeForm } from '../components/maintenance/LimitChangeForm';
import { OfficerChangeForm } from '../components/maintenance/OfficerChangeForm';
import { MaintenanceHistoryTimeline } from '../components/maintenance/MaintenanceHistoryTimeline';

const ACTIONS = [
  {
    id: 'status',
    label: 'Status Change',
    description: 'Activate, freeze, or close this account',
    icon: ShieldAlert,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    id: 'signatories',
    label: 'Signatory Management',
    description: 'Add or remove account signatories',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'interest',
    label: 'Interest Rate Override',
    description: 'Override the account interest rate',
    icon: Percent,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    id: 'limits',
    label: 'Limit Change',
    description: 'Adjust transaction and channel limits',
    icon: ArrowUpDown,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    id: 'officer',
    label: 'Officer Change',
    description: 'Reassign relationship officer',
    icon: UserCog,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    id: 'signing-rule',
    label: 'Signing Rule Update',
    description: 'Update account signing rules',
    icon: FileSignature,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
  },
] as const;

type ActionId = (typeof ACTIONS)[number]['id'];

export function AccountMaintenancePage() {
  const { id: accountId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);

  const { data: account, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['account-basic-info', accountId],
    queryFn: () => accountMaintenanceApi.getAccountBasicInfo(accountId!),
    enabled: !!accountId,
    staleTime: 60_000,
  });

  useEffect(() => {
    document.title = account
      ? `Maintenance - ${account.accountNumber} | CBS`
      : 'Account Maintenance | CBS';
  }, [account]);

  const handleSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['account-basic-info', accountId] });
    queryClient.invalidateQueries({ queryKey: ['account-maintenance-history', accountId] });
  }, [queryClient, accountId]);

  const closePanel = useCallback(() => setActiveAction(null), []);

  // Close slide-over on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closePanel]);

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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-lg mb-3" />
                <div className="h-4 w-24 bg-muted rounded mb-1.5" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError || !account) {
    const status = (queryError as any)?.response?.status ?? (queryError as any)?.status;
    const is403 = status === 403;
    const is404 = status === 404;

    return (
      <>
        <PageHeader
          title="Account Maintenance"
          backTo={`/accounts/${accountId}`}
        />
        <div className="page-container">
          {is403 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-muted-foreground">Access denied</p>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to view this account.
              </p>
            </div>
          ) : is404 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-muted-foreground">Account not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                The account <span className="font-mono">{accountId}</span> does not exist.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </>
    );
  }

  const activeConfig = ACTIONS.find((a) => a.id === activeAction);

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

        {/* Action cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const isActive = activeAction === action.id;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => setActiveAction(isActive ? null : action.id)}
                className={`
                  rounded-xl border p-4 text-left transition-all
                  ${isActive
                    ? 'border-primary ring-2 ring-primary/20 bg-card'
                    : 'bg-card hover:bg-muted/50 hover:border-border/80'
                  }
                `}
              >
                <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4.5 h-4.5 ${action.color}`} />
                </div>
                <h3 className="text-sm font-semibold leading-tight">{action.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </button>
            );
          })}
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

      {/* Slide-over panel */}
      {activeAction && activeConfig && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closePanel}
          />

          {/* Panel */}
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${activeConfig.bg} flex items-center justify-center`}>
                  <activeConfig.icon className={`w-4 h-4 ${activeConfig.color}`} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{activeConfig.label}</h2>
                  <p className="text-xs text-muted-foreground">{activeConfig.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {activeAction === 'status' && (
                <StatusChangeForm
                  accountId={accountId!}
                  currentStatus={account.status}
                  onSuccess={handleSuccess}
                />
              )}
              {activeAction === 'signatories' && (
                <SignatoryManager
                  accountId={accountId!}
                  signatories={account.signatories}
                  currentSigningRule={account.signingRule}
                  onSuccess={handleSuccess}
                />
              )}
              {activeAction === 'interest' && (
                <InterestRateOverrideForm
                  accountId={accountId!}
                  currentRate={account.interestRate}
                  onSuccess={handleSuccess}
                />
              )}
              {activeAction === 'limits' && (
                <LimitChangeForm
                  accountId={accountId!}
                  currentLimits={account.limits}
                  onSuccess={handleSuccess}
                />
              )}
              {activeAction === 'officer' && (
                <OfficerChangeForm
                  accountId={accountId!}
                  currentOfficer={account.currentOfficer}
                  onSuccess={handleSuccess}
                />
              )}
              {activeAction === 'signing-rule' && (
                <SignatoryManager
                  accountId={accountId!}
                  signatories={account.signatories}
                  currentSigningRule={account.signingRule}
                  onSuccess={handleSuccess}
                />
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
