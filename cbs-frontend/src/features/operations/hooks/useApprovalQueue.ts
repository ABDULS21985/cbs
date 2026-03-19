import { useState, useEffect, useCallback } from 'react';
import {
  getMyQueue,
  getTeamQueue,
  getDelegatedQueue,
  getApprovalHistory,
  getStats,
  approveRequest,
  rejectRequest,
  returnForAmendment,
  delegateRequest,
  bulkApprove,
  getDelegations,
  createDelegation,
  cancelDelegation,
  getEscalationRules,
  updateEscalationRule,
  type ApprovalRequest,
  type Delegation,
  type EscalationRule,
} from '../api/approvalApi';

export type QueueTab = 'my' | 'team' | 'delegated' | 'history' | 'escalation';

export function useApprovalQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('my');
  const [selectedItem, setSelectedItem] = useState<ApprovalRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDelegateDialog, setShowDelegateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showDelegationManager, setShowDelegationManager] = useState(false);

  const [myQueue, setMyQueue] = useState<ApprovalRequest[]>([]);
  const [teamQueue, setTeamQueue] = useState<ApprovalRequest[]>([]);
  const [delegatedQueue, setDelegatedQueue] = useState<ApprovalRequest[]>([]);
  const [history, setHistory] = useState<ApprovalRequest[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [stats, setStats] = useState({
    myPending: 0,
    teamPending: 0,
    slaBreached: 0,
    approvedToday: 0,
    rejectedToday: 0,
  });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch {
      // non-critical
    }
  }, []);

  const loadQueueData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [my, team, delegated, hist, dels, rules] = await Promise.all([
        getMyQueue(),
        getTeamQueue(),
        getDelegatedQueue(),
        getApprovalHistory(),
        getDelegations(),
        getEscalationRules(),
      ]);
      setMyQueue(my);
      setTeamQueue(team);
      setDelegatedQueue(delegated);
      setHistory(hist);
      setDelegations(dels);
      setEscalationRules(rules);
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval data');
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  const currentQueueItems = (): ApprovalRequest[] => {
    let items: ApprovalRequest[];
    switch (activeTab) {
      case 'my': items = myQueue; break;
      case 'team': items = teamQueue; break;
      case 'delegated': items = delegatedQueue; break;
      case 'history': items = history; break;
      default: return [];
    }
    return items.filter((item) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.requestNumber.toLowerCase().includes(q) &&
          !item.description.toLowerCase().includes(q) &&
          !item.requestedBy.toLowerCase().includes(q)
        ) return false;
      }
      if (typeFilter && item.type !== typeFilter) return false;
      if (priorityFilter && item.priority !== priorityFilter) return false;
      return true;
    });
  };

  const handleApprove = useCallback(async (comments?: string) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const updated = await approveRequest(selectedItem.id, comments);
      setSelectedItem(updated);
      await loadQueueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  }, [selectedItem, loadQueueData]);

  const handleReject = useCallback(async (reason: string) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const updated = await rejectRequest(selectedItem.id, reason);
      setSelectedItem(updated);
      await loadQueueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  }, [selectedItem, loadQueueData]);

  const handleReturn = useCallback(async (comments: string) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const updated = await returnForAmendment(selectedItem.id, comments);
      setSelectedItem(updated);
      await loadQueueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return request');
    } finally {
      setActionLoading(false);
    }
  }, [selectedItem, loadQueueData]);

  const handleDelegate = useCallback(async (delegateTo: string, reason: string) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const updated = await delegateRequest(selectedItem.id, delegateTo, reason);
      setSelectedItem(updated);
      setShowDelegateDialog(false);
      await loadQueueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delegate request');
    } finally {
      setActionLoading(false);
    }
  }, [selectedItem, loadQueueData]);

  const handleBulkApprove = useCallback(async (comments?: string) => {
    setActionLoading(true);
    try {
      await bulkApprove(selectedIds, comments);
      setSelectedIds([]);
      setShowBulkDialog(false);
      await loadQueueData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk approve');
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, loadQueueData]);

  const handleCreateDelegation = useCallback(async (data: Omit<Delegation, 'id' | 'active' | 'createdAt'>) => {
    setActionLoading(true);
    try {
      await createDelegation(data);
      const dels = await getDelegations();
      setDelegations(dels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delegation');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleCancelDelegation = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await cancelDelegation(id);
      const dels = await getDelegations();
      setDelegations(dels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel delegation');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleSaveEscalationRules = useCallback(async (rules: EscalationRule[]) => {
    setActionLoading(true);
    try {
      await Promise.all(rules.map((r) => updateEscalationRule(r.id, r)));
      const updated = await getEscalationRules();
      setEscalationRules(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save escalation rules');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const selectedQueueItems = (): ApprovalRequest[] => {
    const items = currentQueueItems();
    return items.filter((i) => selectedIds.includes(i.id));
  };

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Item selection
    selectedItem,
    setSelectedItem,
    selectedIds,
    setSelectedIds,

    // Dialog state
    showDelegateDialog,
    setShowDelegateDialog,
    showBulkDialog,
    setShowBulkDialog,
    showDelegationManager,
    setShowDelegationManager,

    // Data
    myQueue,
    teamQueue,
    delegatedQueue,
    history,
    delegations,
    escalationRules,
    stats,

    // Loading / error
    loading,
    actionLoading,
    error,

    // Filters
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    priorityFilter,
    setPriorityFilter,

    // Computed
    currentQueueItems,
    selectedQueueItems,

    // Handlers
    handleApprove,
    handleReject,
    handleReturn,
    handleDelegate,
    handleBulkApprove,
    handleCreateDelegation,
    handleCancelDelegation,
    handleSaveEscalationRules,
    reload: loadQueueData,
  };
}
