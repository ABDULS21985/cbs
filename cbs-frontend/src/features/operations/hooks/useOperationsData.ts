import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { atmApi } from '../api/atmApi';
import { atmNetworkApi } from '../api/atmNetworkApi';
import { agentsApi } from '../api/agentBankingApi';
import { branchOperationsApi } from '../api/branchOpsExtApi';
import { branchNetworkApi } from '../api/branchNetworkApi';
import { branchPerformanceApi } from '../api/branchPerformanceApi';
import { branchesApi } from '../api/branchAdminApi';
import { vaultsApi } from '../api/vaultApi';
import { cashVaultsApi } from '../api/cashVaultApi';
import { centralCashApi } from '../api/centralCashApi';
import { bankDraftsApi } from '../api/bankDraftApi';
import { lockboxesApi } from '../api/lockboxApi';
import { workbenchApi } from '../api/workbenchApi';
import { workbenchConfigApi } from '../api/workbenchConfigApi';
import { issuedDevicesApi } from '../api/issuedDeviceApi';
import { openItemsApi } from '../api/openItemApi';
import { partyRoutingApi } from '../api/partyRoutingApi';
import { locationsApi } from '../api/locationApi';
import { glExtApi as glApi } from '../api/glExtApi';
import { documentsApi } from '../api/documentExtApi';
import { workflowsApi } from '../api/workflowExtApi';

// ─── Query Key Factories ────────────────────────────────────────────────────────

const KEYS = {
  // ATM & Terminal
  atm: {
    all: ['atm'] as const,
    terminal: (id: number) => ['atm', 'terminal', id] as const,
    byStatus: (status: string) => ['atm', 'status', status] as const,
    byBranch: (branchCode: string) => ['atm', 'branch', branchCode] as const,
    journal: (terminalId: number) => ['atm', 'journal', terminalId] as const,
  },
  atmNetwork: {
    all: ['atm-network'] as const,
    byStatus: (status: string) => ['atm-network', 'status', status] as const,
    byZone: (zone: string) => ['atm-network', 'zone', zone] as const,
  },

  // Agent Banking
  agent: {
    all: ['agents'] as const,
    detail: (code: string) => ['agents', 'detail', code] as const,
    transactions: (agentId: number) => ['agents', 'transactions', agentId] as const,
  },

  // Branch Operations
  branch: {
    all: ['branch'] as const,
    facilities: (branchId: number) => ['branch', 'facilities', branchId] as const,
    overdueInspections: (params?: Record<string, unknown>) =>
      ['branch', 'overdue-inspections', params] as const,
    queueStatus: (branchId: number) => ['branch', 'queue-status', branchId] as const,
  },
  branchNetwork: {
    all: ['branch-network'] as const,
    byRegion: (region: string) => ['branch-network', 'region', region] as const,
  },
  branchPerformance: {
    all: ['branch-performance'] as const,
    ranking: (params?: Record<string, unknown>) =>
      ['branch-performance', 'ranking', params] as const,
    underperformers: (params?: Record<string, unknown>) =>
      ['branch-performance', 'underperformers', params] as const,
    digitalMigration: (params?: Record<string, unknown>) =>
      ['branch-performance', 'digital-migration', params] as const,
    byBranch: (branchId: number) => ['branch-performance', 'branch', branchId] as const,
  },

  // Vault & Cash
  vault: {
    all: ['vaults'] as const,
    detail: (id: number) => ['vaults', 'detail', id] as const,
    byBranch: (branchCode: string) => ['vaults', 'branch', branchCode] as const,
    transactions: (id: number) => ['vaults', 'transactions', id] as const,
  },
  cashVault: {
    all: ['cash-vaults'] as const,
    byType: (type: string) => ['cash-vaults', 'type', type] as const,
    movements: (code: string) => ['cash-vaults', 'movements', code] as const,
  },
  centralCash: {
    all: ['central-cash'] as const,
    byCurrency: (currency: string) => ['central-cash', 'currency', currency] as const,
  },

  // Bank Drafts
  bankDraft: {
    all: ['bank-drafts'] as const,
    byCustomer: (customerId: number) => ['bank-drafts', 'customer', customerId] as const,
  },

  // Lockbox
  lockbox: {
    all: ['lockboxes'] as const,
    items: (number: string) => ['lockboxes', 'items', number] as const,
    summary: (number: string) => ['lockboxes', 'summary', number] as const,
  },

  // Workbench
  workbench: {
    all: ['workbench'] as const,
    activeSessions: (staffUserId: number) =>
      ['workbench', 'sessions', staffUserId] as const,
  },
  workbenchConfig: {
    all: ['workbench-config'] as const,
    widgets: (params?: Record<string, unknown>) =>
      ['workbench-config', 'widgets', params] as const,
    quickActions: (params?: Record<string, unknown>) =>
      ['workbench-config', 'quick-actions', params] as const,
    load: (type: string) => ['workbench-config', 'load', type] as const,
    sessionAlerts: (sessionId: number) =>
      ['workbench-config', 'alerts', sessionId] as const,
  },

  // Issued Devices
  issuedDevice: {
    all: ['issued-devices'] as const,
    byCustomer: (id: number) => ['issued-devices', 'customer', id] as const,
  },

  // Open Items
  openItem: {
    all: ['open-items'] as const,
    byAssignee: (assignedTo: string) => ['open-items', 'assignee', assignedTo] as const,
  },

  // Party Routing
  partyRouting: {
    all: ['party-routing'] as const,
    byCustomer: (customerId: number) =>
      ['party-routing', 'customer', customerId] as const,
    byRm: (rmId: number) => ['party-routing', 'rm', rmId] as const,
  },

  // Locations
  location: {
    all: ['locations'] as const,
    byType: (type: string) => ['locations', 'type', type] as const,
    children: (parentId: number) => ['locations', 'children', parentId] as const,
  },

  // GL (Extended)
  gl: {
    all: ['gl'] as const,
    postable: (params?: Record<string, unknown>) =>
      ['gl', 'postable', params] as const,
    history: (glCode: string) => ['gl', 'history', glCode] as const,
  },

  // Documents (Extended)
  document: {
    all: ['documents'] as const,
    lcDocuments: (lcId: number) => ['documents', 'lc', lcId] as const,
    customerDocs: (customerId: number) =>
      ['documents', 'customer', customerId] as const,
  },

  // Workflows (Extended)
  workflow: {
    all: ['workflows'] as const,
    definitions: (params?: Record<string, unknown>) =>
      ['workflows', 'definitions', params] as const,
    instance: (id: number) => ['workflows', 'instance', id] as const,
    instances: (params?: Record<string, unknown>) =>
      ['workflows', 'instances', params] as const,
  },
};

// ─── ATM & Terminal Hooks ───────────────────────────────────────────────────────

export function useAtmTerminal(terminalId: number) {
  return useQuery({
    queryKey: KEYS.atm.terminal(terminalId),
    queryFn: () => atmApi.getTerminal(terminalId),
    enabled: !!terminalId,
    staleTime: 15_000,
  });
}

export function useAtmsByStatus(status: string) {
  return useQuery({
    queryKey: KEYS.atm.byStatus(status),
    queryFn: () => atmApi.getByStatus(status),
    enabled: !!status,
    staleTime: 15_000,
  });
}

export function useAtmsByBranch(branchCode: string) {
  return useQuery({
    queryKey: KEYS.atm.byBranch(branchCode),
    queryFn: () => atmApi.getBranchTerminals(branchCode),
    enabled: !!branchCode,
    staleTime: 15_000,
  });
}

export function useAtmJournal(terminalId: number) {
  return useQuery({
    queryKey: KEYS.atm.journal(terminalId),
    queryFn: () => atmApi.getJournal(terminalId),
    enabled: !!terminalId,
    staleTime: 30_000,
  });
}

export function useRegisterAtm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof atmApi.register>[0]) =>
      atmApi.register(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.atm.all });
    },
  });
}

export function useUpdateAtmStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (terminalId: number) => atmApi.updateStatus(terminalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.atm.all });
    },
  });
}

// ─── ATM Network Hooks ──────────────────────────────────────────────────────────

export function useAtmNetworkByStatus(status: string) {
  return useQuery({
    queryKey: KEYS.atmNetwork.byStatus(status),
    queryFn: () => atmNetworkApi.replenish2(status),
    enabled: !!status,
    staleTime: 15_000,
  });
}

export function useAtmNetworkByZone(zone: string) {
  return useQuery({
    queryKey: KEYS.atmNetwork.byZone(zone),
    queryFn: () => atmNetworkApi.byZone(zone),
    enabled: !!zone,
    staleTime: 15_000,
  });
}

export function useRegisterAtmNetworkStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      terminalId,
      data,
    }: {
      terminalId: number;
      data: Parameters<typeof atmNetworkApi.register>[1];
    }) => atmNetworkApi.register(terminalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.atmNetwork.all });
    },
  });
}

export function useReplenishAtm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (terminalId: number) => atmNetworkApi.replenish(terminalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.atmNetwork.all });
      qc.invalidateQueries({ queryKey: KEYS.atm.all });
    },
  });
}

// ─── Agent Banking Hooks ────────────────────────────────────────────────────────

export function useAgent(agentCode: string) {
  return useQuery({
    queryKey: KEYS.agent.detail(agentCode),
    queryFn: () => agentsApi.getAgent(agentCode),
    enabled: !!agentCode,
    staleTime: 30_000,
  });
}

export function useAgentTransactions(agentId: number) {
  return useQuery({
    queryKey: KEYS.agent.transactions(agentId),
    queryFn: () => agentsApi.getTransactions(agentId),
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

export function useAgentTransact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentCode: string) => agentsApi.transact(agentCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.agent.all });
    },
  });
}

export function useAgentFloatTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentCode: string) => agentsApi.topUpFloat(agentCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.agent.all });
    },
  });
}

// ─── Branch Operations Hooks ────────────────────────────────────────────────────

export function useBranchFacilities(branchId: number) {
  return useQuery({
    queryKey: KEYS.branch.facilities(branchId),
    queryFn: () => branchOperationsApi.getFacilitiesByBranch(branchId),
    enabled: !!branchId,
    staleTime: 30_000,
  });
}

export function useOverdueInspections(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.branch.overdueInspections(params),
    queryFn: () => branchOperationsApi.getOverdueInspections(params),
    staleTime: 30_000,
  });
}

export function useBranchQueueStatus(branchId: number) {
  return useQuery({
    queryKey: KEYS.branch.queueStatus(branchId),
    queryFn: () => branchOperationsApi.getQueueStatus(branchId),
    enabled: !!branchId,
    staleTime: 15_000,
  });
}

export function useRegisterFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof branchOperationsApi.registerFacility>[0]) =>
      branchOperationsApi.registerFacility(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

export function useRecordInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchOperationsApi.recordInspection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

export function useIssueQueueTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof branchOperationsApi.issueQueueTicket>[0]) =>
      branchOperationsApi.issueQueueTicket(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

export function useCallNextTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (branchId: number) => branchOperationsApi.callNextTicket(branchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

export function useCompleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchOperationsApi.completeService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

export function useCreateServicePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof branchOperationsApi.createServicePlan>[0]) =>
      branchOperationsApi.createServicePlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

export function useUpdateServicePlanActuals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchOperationsApi.updateActuals(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
    },
  });
}

// ─── Branch Network Hooks ───────────────────────────────────────────────────────

export function useBranchNetworkByRegion(region: string) {
  return useQuery({
    queryKey: KEYS.branchNetwork.byRegion(region),
    queryFn: () => branchNetworkApi.complete2(region),
    enabled: !!region,
    staleTime: 30_000,
  });
}

export function useApproveBranchNetwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      data,
    }: {
      code: string;
      data: Parameters<typeof branchNetworkApi.create>[1];
    }) => branchNetworkApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branchNetwork.all });
    },
  });
}

export function useCompleteBranchNetwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => branchNetworkApi.complete(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branchNetwork.all });
    },
  });
}

// ─── Branch Performance Hooks ───────────────────────────────────────────────────

export function useBranchRanking(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.branchPerformance.ranking(params),
    queryFn: () => branchPerformanceApi.ranking(params),
    staleTime: 30_000,
  });
}

export function useBranchUnderperformers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.branchPerformance.underperformers(params),
    queryFn: () => branchPerformanceApi.underperformers(params),
    staleTime: 30_000,
  });
}

export function useDigitalMigration(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.branchPerformance.digitalMigration(params),
    queryFn: () => branchPerformanceApi.digitalMigration(params),
    staleTime: 30_000,
  });
}

export function useBranchPerformance(branchId: number) {
  return useQuery({
    queryKey: KEYS.branchPerformance.byBranch(branchId),
    queryFn: () => branchPerformanceApi.byBranch(branchId),
    enabled: !!branchId,
    staleTime: 30_000,
  });
}

// ─── Branch Admin Hooks ─────────────────────────────────────────────────────────

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof branchesApi.update>[1] }) =>
      branchesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
      qc.invalidateQueries({ queryKey: KEYS.branchPerformance.all });
    },
  });
}

export function useCloseBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchesApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branch.all });
      qc.invalidateQueries({ queryKey: KEYS.branchNetwork.all });
      qc.invalidateQueries({ queryKey: KEYS.branchPerformance.all });
    },
  });
}

// ─── Vault Hooks ────────────────────────────────────────────────────────────────

export function useVault(id: number) {
  return useQuery({
    queryKey: KEYS.vault.detail(id),
    queryFn: () => vaultsApi.getVault(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useVaultsByBranch(branchCode: string) {
  return useQuery({
    queryKey: KEYS.vault.byBranch(branchCode),
    queryFn: () => vaultsApi.getBranchVaults(branchCode),
    enabled: !!branchCode,
    staleTime: 30_000,
  });
}

export function useVaultTransactions(id: number) {
  return useQuery({
    queryKey: KEYS.vault.transactions(id),
    queryFn: () => vaultsApi.getTransactions(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useVaultCashIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number; reference?: string; narration?: string } }) =>
      vaultsApi.cashIn(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.vault.all });
      qc.invalidateQueries({ queryKey: KEYS.centralCash.all });
    },
  });
}

export function useVaultCashOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number; reference?: string; narration?: string } }) =>
      vaultsApi.cashOut(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.vault.all });
      qc.invalidateQueries({ queryKey: KEYS.centralCash.all });
    },
  });
}

export function useVaultTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromVaultId: number; toVaultId: number; amount: number }) =>
      vaultsApi.transfer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.vault.all });
      qc.invalidateQueries({ queryKey: KEYS.centralCash.all });
    },
  });
}

// ─── Cash Vault Hooks ───────────────────────────────────────────────────────────

export function useCashVaultsByType(type: string) {
  return useQuery({
    queryKey: KEYS.cashVault.byType(type),
    queryFn: () => cashVaultsApi.getByType(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

export function useCashVaultMovements(code: string) {
  return useQuery({
    queryKey: KEYS.cashVault.movements(code),
    queryFn: () => cashVaultsApi.getMovements(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useRegisterCashVault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof cashVaultsApi.register>[0]) =>
      cashVaultsApi.register(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cashVault.all });
    },
  });
}

export function useRecordCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof cashVaultsApi.recordMovement>[0]) =>
      cashVaultsApi.recordMovement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cashVault.all });
      qc.invalidateQueries({ queryKey: KEYS.vault.all });
    },
  });
}

/** @deprecated Use useRecordCashMovement instead */
export const useRegisterCashMovement = useRecordCashMovement;

export function useConfirmCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => cashVaultsApi.confirmDelivery(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cashVault.all });
      qc.invalidateQueries({ queryKey: KEYS.vault.all });
    },
  });
}

export function useReconcileCashVault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => cashVaultsApi.reconcile(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cashVault.all });
    },
  });
}

// ─── Central Cash Hooks ─────────────────────────────────────────────────────────

export function useCentralCashPosition(currency: string) {
  return useQuery({
    queryKey: KEYS.centralCash.byCurrency(currency),
    queryFn: () => centralCashApi.calculate2(currency),
    enabled: !!currency,
    staleTime: 30_000,
  });
}

export function useCalculateCentralCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => centralCashApi.calculate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.centralCash.all });
    },
  });
}

// ─── Bank Draft Hooks ───────────────────────────────────────────────────────────

export function useBankDraftsByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.bankDraft.byCustomer(customerId),
    queryFn: () => bankDraftsApi.byCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function usePresentBankDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => bankDraftsApi.present(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bankDraft.all });
    },
  });
}

export function usePayBankDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => bankDraftsApi.pay(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bankDraft.all });
    },
  });
}

export function useStopBankDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => bankDraftsApi.stop(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bankDraft.all });
    },
  });
}

export function useReissueBankDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => bankDraftsApi.reissue(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bankDraft.all });
    },
  });
}

export function useExpireOverdueDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bankDraftsApi.expireOverdue(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bankDraft.all });
    },
  });
}

// ─── Lockbox Hooks ──────────────────────────────────────────────────────────────

export function useLockboxItems(number: string) {
  return useQuery({
    queryKey: KEYS.lockbox.items(number),
    queryFn: () => lockboxesApi.items(number),
    enabled: !!number,
    staleTime: 30_000,
  });
}

export function useLockboxSummary(number: string) {
  return useQuery({
    queryKey: KEYS.lockbox.summary(number),
    queryFn: () => lockboxesApi.summary(number),
    enabled: !!number,
    staleTime: 30_000,
  });
}

export function useReceiveLockboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      number,
      data,
    }: {
      number: string;
      data: Parameters<typeof lockboxesApi.receive>[1];
    }) => lockboxesApi.receive(number, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lockbox.all });
    },
  });
}

export function useLockboxException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, reason }: { itemId: number; reason: string }) =>
      lockboxesApi.exception(itemId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lockbox.all });
    },
  });
}

export function useLockboxDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => lockboxesApi.deposit(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lockbox.all });
    },
  });
}

// ─── Workbench Hooks ────────────────────────────────────────────────────────────

export function useWorkbenchSessions(staffUserId: number) {
  return useQuery({
    queryKey: KEYS.workbench.activeSessions(staffUserId),
    queryFn: () => workbenchApi.getActive(staffUserId),
    enabled: !!staffUserId,
    staleTime: 15_000,
  });
}

export function useStartWorkbenchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => workbenchApi.start(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbench.all });
    },
  });
}

export function useLoadCustomerInWorkbench() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => workbenchApi.loadCustomer(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbench.all });
    },
  });
}

export function useLogoutWorkbench() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => workbenchApi.logout(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbench.all });
    },
  });
}

// ─── Workbench Config Hooks ─────────────────────────────────────────────────────

export function useWorkbenchWidgets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.workbenchConfig.widgets(params),
    queryFn: () => workbenchConfigApi.getActiveWidgets(params),
    staleTime: 30_000,
  });
}

export function useWorkbenchQuickActions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.workbenchConfig.quickActions(params),
    queryFn: () => workbenchConfigApi.getActiveQuickActions(params),
    staleTime: 30_000,
  });
}

export function useLoadWorkbenchConfig(workbenchType: string) {
  return useQuery({
    queryKey: KEYS.workbenchConfig.load(workbenchType),
    queryFn: () => workbenchConfigApi.loadWorkbench(workbenchType),
    enabled: !!workbenchType,
    staleTime: 30_000,
  });
}

export function useWorkbenchSessionAlerts(sessionId: number) {
  return useQuery({
    queryKey: KEYS.workbenchConfig.sessionAlerts(sessionId),
    queryFn: () => workbenchConfigApi.getSessionAlerts(sessionId),
    enabled: !!sessionId,
    staleTime: 15_000,
  });
}

export function useCreateWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof workbenchConfigApi.createWidget>[0]) =>
      workbenchConfigApi.createWidget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbenchConfig.all });
    },
  });
}

export function useCreateQuickAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof workbenchConfigApi.createQuickAction>[0]) =>
      workbenchConfigApi.createQuickAction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbenchConfig.all });
    },
  });
}

export function useRaiseWorkbenchAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => workbenchConfigApi.raiseAlert(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbenchConfig.all });
    },
  });
}

export function useAcknowledgeWorkbenchAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => workbenchConfigApi.acknowledgeAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workbenchConfig.all });
    },
  });
}

// ─── Issued Device Hooks ────────────────────────────────────────────────────────

export function useIssuedDevicesByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.issuedDevice.byCustomer(customerId),
    queryFn: () => issuedDevicesApi.getByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useActivateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => issuedDevicesApi.activate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.issuedDevice.all });
    },
  });
}

export function useBlockDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => issuedDevicesApi.block(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.issuedDevice.all });
    },
  });
}

export function useReplaceDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => issuedDevicesApi.replace(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.issuedDevice.all });
    },
  });
}

// ─── Open Item Hooks ────────────────────────────────────────────────────────────

export function useOpenItemsByAssignee(assignedTo: string) {
  return useQuery({
    queryKey: KEYS.openItem.byAssignee(assignedTo),
    queryFn: () => openItemsApi.getByAssignee(assignedTo),
    enabled: !!assignedTo,
    staleTime: 30_000,
  });
}

export function useAssignOpenItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, assignedTo, assignedTeam }: { code: string; assignedTo: string; assignedTeam?: string }) =>
      openItemsApi.assign(code, { assignedTo, assignedTeam }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.openItem.all });
    },
  });
}

export function useResolveOpenItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, action, notes }: { code: string; action: string; notes?: string }) =>
      openItemsApi.resolve(code, { action, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.openItem.all });
    },
  });
}

export function useUpdateOpenItemAging() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => openItemsApi.updateAging(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.openItem.all });
    },
  });
}

// ─── Party Routing Hooks ────────────────────────────────────────────────────────

export function usePartyRoutingByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.partyRouting.byCustomer(customerId),
    queryFn: () => partyRoutingApi.byCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function usePartyRoutingByRm(rmId: number) {
  return useQuery({
    queryKey: KEYS.partyRouting.byRm(rmId),
    queryFn: () => partyRoutingApi.byRm(rmId),
    enabled: !!rmId,
    staleTime: 30_000,
  });
}

// ─── Location Hooks ─────────────────────────────────────────────────────────────

export function useLocationsByType(type: string) {
  return useQuery({
    queryKey: KEYS.location.byType(type),
    queryFn: () => locationsApi.byType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useLocationChildren(parentId: number) {
  return useQuery({
    queryKey: KEYS.location.children(parentId),
    queryFn: () => locationsApi.children(parentId),
    enabled: !!parentId,
    staleTime: 60_000,
  });
}

// ─── GL (Extended) Hooks ────────────────────────────────────────────────────────

export function usePostableGlAccounts() {
  return useQuery({
    queryKey: KEYS.gl.postable(undefined),
    queryFn: () => glApi.getPostableAccounts(),
    staleTime: 30_000,
  });
}

export function useGlHistory(glCode: string, from?: string, to?: string) {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const fromDate = from ?? monthAgo;
  const toDate = to ?? today;
  return useQuery({
    queryKey: KEYS.gl.history(glCode),
    queryFn: () => glApi.getGlHistory(glCode, fromDate, toDate),
    enabled: !!glCode,
    staleTime: 30_000,
  });
}

// ─── Document (Extended) Hooks ──────────────────────────────────────────────────

export function useLcDocuments(lcId: number) {
  return useQuery({
    queryKey: KEYS.document.lcDocuments(lcId),
    queryFn: () => documentsApi.getLcDocuments(lcId),
    enabled: !!lcId,
    staleTime: 30_000,
  });
}

export function useCustomerDocuments(customerId: number) {
  return useQuery({
    queryKey: KEYS.document.customerDocs(customerId),
    queryFn: () => documentsApi.getCustomerDocs(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useVerifyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentsApi.verifyDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.document.all });
    },
  });
}

// ─── Workflow (Extended) Hooks ──────────────────────────────────────────────────

export function useWorkflowDefinitions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.workflow.definitions(params),
    queryFn: () => workflowsApi.getAllDefinitions(params),
    staleTime: 30_000,
  });
}

export function useWorkflowInstance(id: number) {
  return useQuery({
    queryKey: KEYS.workflow.instance(id),
    queryFn: () => workflowsApi.getInstance(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useWorkflowInstances(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.workflow.instances(params),
    queryFn: () => workflowsApi.getByStatus(params),
    staleTime: 30_000,
  });
}

export function useCreateWorkflowDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof workflowsApi.createDefinition>[0]) =>
      workflowsApi.createDefinition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workflow.all });
    },
  });
}

export function useInitiateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => workflowsApi.initiate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workflow.all });
    },
  });
}

export function useApproveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => workflowsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workflow.all });
    },
  });
}

export function useRejectWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => workflowsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workflow.all });
    },
  });
}

export function useCheckWorkflowSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => workflowsApi.checkSla(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.workflow.all });
    },
  });
}
