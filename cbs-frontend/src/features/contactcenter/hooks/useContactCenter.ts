import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactCenterApi } from '../api/contactCenterApi';
import { contactRoutingApi } from '../api/contactRoutingApi';
import { ivrApi } from '../api/ivrApi';
import { helpApi } from '../api/helpApi';
import { dialogueApi } from '../api/dialogueApi';
import type { RoutingRule, CallbackRequest } from '../types/contactRouting';
import type { IvrMenu } from '../types/ivr';
import type { HelpArticle, GuidedFlow } from '../types/help';
import type { DialogueMessage } from '../types/dialogue';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const CONTACT_CENTER_KEYS = {
  // Interactions
  interactions: ['contact-center', 'interactions'] as const,
  interactionsByCustomer: (customerId: number) =>
    [...CONTACT_CENTER_KEYS.interactions, 'customer', customerId] as const,
  interactionsByAgent: (agentId: string | number) =>
    [...CONTACT_CENTER_KEYS.interactions, 'agent', agentId] as const,

  // Routing
  routing: ['contact-center', 'routing'] as const,
  routingRules: () => [...CONTACT_CENTER_KEYS.routing, 'rules'] as const,
  agentsByCenter: (centerId: number) =>
    [...CONTACT_CENTER_KEYS.routing, 'agents', 'center', centerId] as const,
  queueDashboard: (centerId: number) =>
    [...CONTACT_CENTER_KEYS.routing, 'queues', 'center', centerId] as const,

  // IVR
  ivr: ['contact-center', 'ivr'] as const,
  ivrMenus: () => [...CONTACT_CENTER_KEYS.ivr, 'menus'] as const,

  // Help
  help: ['contact-center', 'help'] as const,
  helpArticleSearch: (params?: Record<string, unknown>) =>
    [...CONTACT_CENTER_KEYS.help, 'articles', 'search', params] as const,

  // Dialogue
  dialogue: ['contact-center', 'dialogue'] as const,
  dialogueCustomerSessions: (customerId: number) =>
    [...CONTACT_CENTER_KEYS.dialogue, 'customer', customerId] as const,
} as const;

// ─── Interactions Hooks ───────────────────────────────────────────────────────

export function useCustomerInteractions(customerId: number) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.interactionsByCustomer(customerId),
    queryFn: () => contactCenterApi.getInteractionsByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 15_000,
  });
}

export function useAgentInteractions(agentId: string | number) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.interactionsByAgent(agentId),
    queryFn: () => contactCenterApi.getInteractionsByAgent(agentId),
    enabled: !!agentId,
    staleTime: 15_000,
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contactCenterApi.createInteraction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
    },
  });
}

export function useAssignInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contactCenterApi.assignInteraction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

export function useCompleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contactCenterApi.completeInteraction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

// ─── Routing Hooks ────────────────────────────────────────────────────────────

export function useRoutingRules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CONTACT_CENTER_KEYS.routingRules(), params],
    queryFn: () => contactRoutingApi.listActiveRules(params),
    staleTime: 60_000,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RoutingRule>) => contactRoutingApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routingRules() });
    },
  });
}

export function useRouteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => contactRoutingApi.routeContact(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
    },
  });
}

export function useUpdateAgentState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, newState }: { agentId: string | number; newState: string }) => contactRoutingApi.updateAgentState(agentId, newState),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

export function useAgentsByCenter(centerId: number) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.agentsByCenter(centerId),
    queryFn: () => contactRoutingApi.getAgentPerformance(centerId),
    enabled: !!centerId,
    staleTime: 15_000,
  });
}

export function useRequestCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CallbackRequest>) => contactRoutingApi.requestCallback(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

export function useAttemptCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contactRoutingApi.attemptCallback(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

export function useQueueDashboard(centerId: number) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.queueDashboard(centerId),
    queryFn: () => contactRoutingApi.getQueueDashboard(centerId),
    enabled: !!centerId,
    staleTime: 15_000,
  });
}

// ─── IVR Hooks ────────────────────────────────────────────────────────────────

export function useIvrMenus(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...CONTACT_CENTER_KEYS.ivrMenus(), params],
    queryFn: () => ivrApi.listMenus(params),
    staleTime: 60_000,
  });
}

export function useCreateIvrMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IvrMenu>) => ivrApi.createMenu(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.ivrMenus() });
    },
  });
}

export function useStartIvrSession() {
  return useMutation({
    mutationFn: () => ivrApi.startSession(),
  });
}

export function useNavigateIvrSession() {
  return useMutation({
    mutationFn: (sessionId: number) => ivrApi.navigateSession(sessionId),
  });
}

export function useTransferIvrSession() {
  return useMutation({
    mutationFn: (sessionId: number) => ivrApi.transfer(sessionId),
  });
}

// ─── Help Hooks ───────────────────────────────────────────────────────────────

export function useSearchHelpArticles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.helpArticleSearch(params),
    queryFn: () => helpApi.searchArticles(params),
    staleTime: 60_000,
  });
}

export function useCreateHelpArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<HelpArticle>) => helpApi.createArticle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.help });
    },
  });
}

export function usePublishHelpArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => helpApi.publishArticle(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.help });
    },
  });
}

export function useRecordArticleView() {
  return useMutation({
    mutationFn: (code: string) => helpApi.recordView(code),
  });
}

export function useRecordArticleHelpfulness() {
  return useMutation({
    mutationFn: (code: string) => helpApi.recordHelpfulness(code),
  });
}

export function useCreateGuidedFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<GuidedFlow>) => helpApi.createFlow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.help });
    },
  });
}

export function useActivateGuidedFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => helpApi.activateFlow(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.help });
    },
  });
}

export function useStartGuidedFlow() {
  return useMutation({
    mutationFn: (code: string) => helpApi.startFlow(code),
  });
}

// ─── Dialogue Hooks ───────────────────────────────────────────────────────────

export function useDialogueCustomerSessions(customerId: number) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.dialogueCustomerSessions(customerId),
    queryFn: () => dialogueApi.getCustomerSessions(customerId),
    enabled: !!customerId,
    staleTime: 15_000,
  });
}

export function useAddDialogueMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<DialogueMessage> }) =>
      dialogueApi.addMessage(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
    },
  });
}

export function useEscalateDialogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => dialogueApi.escalateToHuman(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
    },
  });
}

export function useEndDialogueSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => dialogueApi.endSession(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
    },
  });
}
