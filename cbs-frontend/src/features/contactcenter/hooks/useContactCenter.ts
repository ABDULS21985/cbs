import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactCenterApi } from '../api/contactCenterApi';
import { contactRoutingApi } from '../api/contactRoutingApi';
import { ivrApi } from '../api/ivrApi';
import { helpApi } from '../api/helpApi';
import { dialogueApi } from '../api/dialogueApi';
import type { RoutingRule, CallbackRequest } from '../types/contactRouting';
import type { IvrMenu } from '../types/ivr';
import type { HelpArticle, GuidedFlow } from '../types/help';
import type { DialogueMessage, DialogueSession } from '../types/dialogue';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const CONTACT_CENTER_KEYS = {
  // Centers
  centers: ['contact-center', 'centers'] as const,

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
  ivrSessions: () => [...CONTACT_CENTER_KEYS.ivr, 'sessions'] as const,

  // Help
  help: ['contact-center', 'help'] as const,
  helpArticles: () => [...CONTACT_CENTER_KEYS.help, 'articles'] as const,
  helpArticleSearch: (params?: Record<string, unknown>) =>
    [...CONTACT_CENTER_KEYS.help, 'articles', 'search', params] as const,
  helpFlows: () => [...CONTACT_CENTER_KEYS.help, 'flows'] as const,

  // Dialogue
  dialogue: ['contact-center', 'dialogue'] as const,
  dialogueSessions: (params?: Record<string, unknown>) =>
    [...CONTACT_CENTER_KEYS.dialogue, 'sessions', params] as const,
  dialogueMessages: (code: string) =>
    [...CONTACT_CENTER_KEYS.dialogue, 'messages', code] as const,
  dialogueCustomerSessions: (customerId: number) =>
    [...CONTACT_CENTER_KEYS.dialogue, 'customer', customerId] as const,
} as const;

// ─── Interactions Hooks ───────────────────────────────────────────────────────

export function useAllInteractions() {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.interactions,
    queryFn: () => contactCenterApi.getAllInteractions(),
    refetchInterval: 10_000,
  });
}

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
    mutationFn: ({ id, agentId }: { id: string; agentId: string }) =>
      contactCenterApi.assignInteraction(id, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

export function useCompleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, disposition, sentiment, fcr }: { id: string; disposition: string; sentiment?: string; fcr?: boolean }) =>
      contactCenterApi.completeInteraction(id, disposition, sentiment, fcr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.routing });
    },
  });
}

// ─── Center Hooks ────────────────────────────────────────────────────────────

export function useCenters() {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.centers,
    queryFn: () => contactCenterApi.getCenters(),
    staleTime: 60_000,
  });
}

export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contactCenterApi.createCenter(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.centers });
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
    mutationFn: ({ customerId, reason, channel }: { customerId: number; reason: string; channel: string }) =>
      contactRoutingApi.routeContact(customerId, reason, channel),
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
    mutationFn: ({ id, outcome }: { id: number; outcome?: string }) =>
      contactRoutingApi.attemptCallback(id, outcome),
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

export function useIvrSessions() {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.ivrSessions(),
    queryFn: () => ivrApi.listSessions(),
    staleTime: 15_000,
  });
}

export function useStartIvrSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callerNumber, customerId }: { callerNumber: string; customerId?: number }) =>
      ivrApi.startSession(callerNumber, customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.ivrSessions() });
    },
  });
}

export function useNavigateIvrSession() {
  return useMutation({
    mutationFn: ({ sessionId, option }: { sessionId: string; option: string }) =>
      ivrApi.navigateSession(sessionId, option),
  });
}

export function useTransferIvrSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      ivrApi.transfer(sessionId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.ivrSessions() });
    },
  });
}

// ─── Help Hooks ───────────────────────────────────────────────────────────────

export function useHelpArticles() {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.helpArticles(),
    queryFn: () => helpApi.listArticles(),
    staleTime: 60_000,
  });
}

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, helpful }: { code: string; helpful: boolean }) =>
      helpApi.recordHelpfulness(code, helpful),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.help });
    },
  });
}

export function useGuidedFlows() {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.helpFlows(),
    queryFn: () => helpApi.listFlows(),
    staleTime: 60_000,
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

export function useDialogueSessions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.dialogueSessions(params),
    queryFn: () => dialogueApi.listSessions(params),
    refetchInterval: 10_000,
  });
}

export function useDialogueMessages(code: string) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.dialogueMessages(code),
    queryFn: () => dialogueApi.getMessages(code),
    enabled: !!code,
    refetchInterval: 5_000,
  });
}

export function useDialogueCustomerSessions(customerId: number) {
  return useQuery({
    queryKey: CONTACT_CENTER_KEYS.dialogueCustomerSessions(customerId),
    queryFn: () => dialogueApi.getCustomerSessions(customerId),
    enabled: !!customerId,
    staleTime: 15_000,
  });
}

export function useStartDialogueSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DialogueSession>) => dialogueApi.startSession(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
    },
  });
}

export function useAddDialogueMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<DialogueMessage> }) =>
      dialogueApi.addMessage(code, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogueMessages(variables.code) });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
    },
  });
}

export function useEscalateDialogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, agentId }: { code: string; agentId: string }) =>
      dialogueApi.escalateToHuman(code, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.interactions });
    },
  });
}

export function useEndDialogueSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, resolutionStatus }: { code: string; resolutionStatus?: string }) =>
      dialogueApi.endSession(code, resolutionStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACT_CENTER_KEYS.dialogue });
    },
  });
}
