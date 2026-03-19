import { useEffect, useCallback, useState } from 'react';
import { Search, Filter, CheckSquare, Users2, UserCog, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useApprovalQueue, type QueueTab } from '../hooks/useApprovalQueue';
import { ApprovalStatsCards } from '../components/approvals/ApprovalStatsCards';
import { ApprovalQueueTable } from '../components/approvals/ApprovalQueueTable';
import { ApprovalDetailPanel } from '../components/approvals/ApprovalDetailPanel';
import { ApprovalHistoryTable } from '../components/approvals/ApprovalHistoryTable';
import { BulkApproveDialog } from '../components/approvals/BulkApproveDialog';
import { EscalationRulesConfig } from '../components/approvals/EscalationRulesConfig';
import { DelegationForm } from '../components/approvals/DelegationForm';
import { DelegationTable } from '../components/approvals/DelegationTable';
import type { ApprovalRequest, Delegation } from '../api/approvalApi';

// ---- Delegation Manager Modal ----
interface DelegationManagerProps {
  open: boolean;
  onClose: () => void;
  delegations: ReturnType<typeof useApprovalQueue>['delegations'];
  onCancel: (id: string) => void;
  onCreate: (data: Omit<Delegation, 'id' | 'active' | 'createdAt'>) => void;
  loading: boolean;
}

function DelegationManager({ open, onClose, delegations, onCancel, onCreate, loading }: DelegationManagerProps) {
  const [showForm, setShowForm] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-card rounded-xl border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Delegation Manager</h2>
          </div>
          <div className="flex items-center gap-2">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <Users2 className="w-3.5 h-3.5" />
                New Delegation
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {showForm && (
            <div className="bg-muted/30 rounded-lg border border-border p-5">
              <h3 className="text-sm font-semibold mb-4">Create New Delegation</h3>
              <DelegationForm
                onSubmit={(data) => {
                  onCreate(data);
                  setShowForm(false);
                }}
                onCancel={() => setShowForm(false)}
                loading={loading}
              />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Delegations
              <span className="ml-2 text-muted-foreground font-normal">({delegations.length})</span>
            </h3>
            <DelegationTable
              delegations={delegations}
              onCancel={onCancel}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Delegate Request Dialog ----
interface DelegateRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onDelegate: (delegateTo: string, reason: string) => void;
  loading: boolean;
}

const MOCK_APPROVERS = [
  { name: 'Chidi Nwachukwu', role: 'Senior Credit Analyst' },
  { name: 'Taiwo Adesanya', role: 'Senior Relationship Manager' },
  { name: 'Kola Adebayo', role: 'Head of Collections' },
  { name: 'Babatunde Fasanya', role: 'Branch Operations Manager' },
  { name: 'Emeka Okonkwo', role: 'Senior Relationship Manager' },
];

function DelegateRequestDialog({ open, onClose, onDelegate, loading }: DelegateRequestDialogProps) {
  const [delegateTo, setDelegateTo] = useState('');
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateTo) return;
    onDelegate(delegateTo, reason || 'Delegated by approver.');
    setDelegateTo('');
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Delegate Request</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Delegate To <span className="text-red-500">*</span>
            </label>
            <select
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select approver...</option>
              {MOCK_APPROVERS.map((a) => (
                <option key={a.name} value={a.name}>{a.name} — {a.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason..."
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!delegateTo || loading}
              className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Delegating...' : 'Delegate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Tab config ----
const TABS: { key: QueueTab; label: string; countKey?: 'myPending' | 'teamPending' }[] = [
  { key: 'my', label: 'My Queue', countKey: 'myPending' },
  { key: 'team', label: 'Team Queue', countKey: 'teamPending' },
  { key: 'delegated', label: 'Delegated' },
  { key: 'history', label: 'History' },
  { key: 'escalation', label: 'Escalation Rules' },
];

// ---- Main Page ----
export function ApprovalWorkbenchPage() {
  const {
    activeTab,
    setActiveTab,
    selectedItem,
    setSelectedItem,
    selectedIds,
    setSelectedIds,
    showDelegateDialog,
    setShowDelegateDialog,
    showBulkDialog,
    setShowBulkDialog,
    showDelegationManager,
    setShowDelegationManager,
    delegations,
    escalationRules,
    stats,
    loading,
    actionLoading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    priorityFilter,
    setPriorityFilter,
    currentQueueItems,
    selectedQueueItems,
    handleApprove,
    handleReject,
    handleReturn,
    handleDelegate,
    handleBulkApprove,
    handleCreateDelegation,
    handleCancelDelegation,
    handleSaveEscalationRules,
    history,
  } = useApprovalQueue();

  const isQueueTab = activeTab === 'my' || activeTab === 'team' || activeTab === 'delegated';

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedItem || !isQueueTab) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleApprove();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        // Focus the reject panel by triggering the button's click event
        // This is handled by the ApprovalActions component itself
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        // Focus the return panel
      } else if (e.key === 'Escape') {
        setSelectedItem(null);
      }
    },
    [selectedItem, isQueueTab, handleApprove, setSelectedItem],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleDetailAction = (
    action: 'approve' | 'reject' | 'return' | 'delegate',
    _id: string,
    data?: string,
  ) => {
    switch (action) {
      case 'approve': handleApprove(data); break;
      case 'reject': if (data) handleReject(data); break;
      case 'return': if (data) handleReturn(data); break;
      case 'delegate': setShowDelegateDialog(true); break;
    }
  };

  const handleTabChange = (tab: QueueTab) => {
    setActiveTab(tab);
    setSelectedItem(null);
    setSelectedIds([]);
    setSearch('');
    setTypeFilter('');
    setPriorityFilter('');
  };

  const queueItems = isQueueTab ? currentQueueItems() : [];
  const selectedBulkItems = selectedQueueItems();

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Approval Workbench"
        subtitle="Review and action pending approval requests"
        actions={
          <button
            onClick={() => setShowDelegationManager(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            <UserCog className="w-4 h-4" />
            Manage Delegation
          </button>
        }
      />

      {/* Stats */}
      <div className="mt-4">
        <ApprovalStatsCards stats={stats} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border mb-0 px-6">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const count = tab.countKey ? stats[tab.countKey] : undefined;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Queue tabs */}
        {isQueueTab && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left: table + toolbar */}
            <div className={cn(
              'flex flex-col min-h-0 transition-all',
              selectedItem ? 'flex-1' : 'flex-1',
            )}>
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search requests..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-2 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Types</option>
                    <option value="LOAN_APPROVAL">Loan Approval</option>
                    <option value="PAYMENT_APPROVAL">Payment</option>
                    <option value="ACCOUNT_OPENING">Account Opening</option>
                    <option value="FEE_WAIVER">Fee Waiver</option>
                    <option value="RATE_OVERRIDE">Rate Override</option>
                    <option value="WRITE_OFF">Write-Off</option>
                    <option value="RESTRUCTURE">Restructure</option>
                    <option value="LIMIT_CHANGE">Limit Change</option>
                    <option value="KYC_OVERRIDE">KYC Override</option>
                    <option value="PARAMETER_CHANGE">Param Change</option>
                    <option value="USER_CREATION">User Creation</option>
                    <option value="CARD_REQUEST">Card Request</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-2 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Priorities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setShowBulkDialog(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Bulk Approve ({selectedIds.length})
                  </button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {queueItems.length} item{queueItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="ml-3 text-sm text-muted-foreground">Loading queue...</span>
                  </div>
                ) : (
                  <ApprovalQueueTable
                    items={queueItems}
                    selectedIds={selectedIds}
                    onSelectIds={setSelectedIds}
                    onSelectItem={(item: ApprovalRequest) => setSelectedItem(
                      selectedItem?.id === item.id ? null : item,
                    )}
                  />
                )}
              </div>
            </div>

            {/* Right: Detail Panel */}
            {selectedItem && (
              <div className="w-[420px] flex-shrink-0 border-l border-border flex flex-col min-h-0 overflow-hidden">
                <ApprovalDetailPanel
                  request={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  onAction={handleDetailAction}
                  loading={actionLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <ApprovalHistoryTable history={history} />
          </div>
        )}

        {/* Escalation Rules tab */}
        {activeTab === 'escalation' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold">Escalation Rules Configuration</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Configure automatic escalation thresholds for each approval type.
                </p>
              </div>
              <EscalationRulesConfig
                rules={escalationRules}
                onSave={handleSaveEscalationRules}
                loading={actionLoading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Approve Dialog */}
      <BulkApproveDialog
        open={showBulkDialog}
        selectedItems={selectedBulkItems}
        onConfirm={handleBulkApprove}
        onClose={() => setShowBulkDialog(false)}
        loading={actionLoading}
      />

      {/* Delegate Request Dialog */}
      <DelegateRequestDialog
        open={showDelegateDialog}
        onClose={() => setShowDelegateDialog(false)}
        onDelegate={handleDelegate}
        loading={actionLoading}
      />

      {/* Delegation Manager Modal */}
      <DelegationManager
        open={showDelegationManager}
        onClose={() => setShowDelegationManager(false)}
        delegations={delegations}
        onCancel={handleCancelDelegation}
        onCreate={handleCreateDelegation}
        loading={actionLoading}
      />
    </div>
  );
}
