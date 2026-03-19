import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationApi } from '../api/integrationApi';
import { financialGatewayApi } from '../api/financialGatewayApi';
import { eventsApi } from '../api/eventApi';
import { tenantsApi } from '../api/tenantApi';
import { dataLakeApi } from '../api/dataLakeApi';
import { serviceDirectoryApi } from '../api/serviceDirectoryApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { messageAnalysisApi } from '../api/messageAnalysisApi';
import type { IntegrationRoute, Iso20022Message, Psd2TppRegistration, Psd2ScaSession } from '../types/integration';
import type { FinancialGateway } from '../types/financialGateway';
import type { DomainEvent, EventSubscription } from '../types/event';
import type { DataExportJob } from '../types/dataLake';
import type { MarketplaceApiProduct, MarketplaceSubscription } from '../types/marketplace';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const GATEWAY_KEYS = {
  // Integration
  integration: ['gateway', 'integration'] as const,
  routes: () => [...GATEWAY_KEYS.integration, 'routes'] as const,
  dlqCount: () => [...GATEWAY_KEYS.integration, 'dlq-count'] as const,
  iso20022ByStatus: (status: string) => [...GATEWAY_KEYS.integration, 'iso20022', status] as const,
  codeSet: (codeSetName: string) => [...GATEWAY_KEYS.integration, 'code-set', codeSetName] as const,
  codeLookup: (codeSetName: string, code: string) =>
    [...GATEWAY_KEYS.integration, 'code-lookup', codeSetName, code] as const,
  swiftMapping: () => [...GATEWAY_KEYS.integration, 'swift-mapping'] as const,
  activeTpps: () => [...GATEWAY_KEYS.integration, 'tpp', 'active'] as const,
  customerScaSessions: (customerId: number) =>
    [...GATEWAY_KEYS.integration, 'sca', 'customer', customerId] as const,

  // Financial Gateway
  financialGateway: ['gateway', 'financial'] as const,
  queuedMessages: (gatewayId: number) =>
    [...GATEWAY_KEYS.financialGateway, 'queued', gatewayId] as const,
  messagesByType: (type: string) =>
    [...GATEWAY_KEYS.financialGateway, 'type', type] as const,

  // Events
  events: ['gateway', 'events'] as const,
  eventReplay: (aggregateType: string, aggregateId: number) =>
    [...GATEWAY_KEYS.events, 'replay', aggregateType, aggregateId] as const,
  subscriptions: () => [...GATEWAY_KEYS.events, 'subscriptions'] as const,

  // Tenants
  tenants: ['gateway', 'tenants'] as const,
  tenant: (tenantCode: string) => [...GATEWAY_KEYS.tenants, tenantCode] as const,

  // Data Lake
  dataLake: ['gateway', 'data-lake'] as const,
  dataLakeJobs: () => [...GATEWAY_KEYS.dataLake, 'jobs'] as const,
  dataLakeByEntity: (entity: string) => [...GATEWAY_KEYS.dataLake, 'entity', entity] as const,

  // Service Directory
  serviceDirectory: ['gateway', 'service-directory'] as const,
  serviceCategory: (category: string) =>
    [...GATEWAY_KEYS.serviceDirectory, 'category', category] as const,

  // Marketplace
  marketplace: ['gateway', 'marketplace'] as const,
  publishedProducts: () => [...GATEWAY_KEYS.marketplace, 'products'] as const,
  productsByCategory: (category: string) =>
    [...GATEWAY_KEYS.marketplace, 'products', 'category', category] as const,
  productAnalytics: (id: number) =>
    [...GATEWAY_KEYS.marketplace, 'products', id, 'analytics'] as const,

  // Message Analysis
  messageAnalysis: ['gateway', 'message-analysis'] as const,
  analyzeMessage: (ref: string) => [...GATEWAY_KEYS.messageAnalysis, 'message', ref] as const,
  actionRequired: () => [...GATEWAY_KEYS.messageAnalysis, 'action-required'] as const,
} as const;

// ─── Integration Hooks ────────────────────────────────────────────────────────

export function useIntegrationRoutes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.routes(), params],
    queryFn: () => integrationApi.getRoutes(params),
    staleTime: 30_000,
  });
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IntegrationRoute>) => integrationApi.createRoute(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.routes() });
    },
  });
}

export function useRouteHealthCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (routeCode: string) => integrationApi.healthCheck(routeCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.routes() });
    },
  });
}

export function useSendIntegrationMessage() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => integrationApi.sendMessage(data),
  });
}

export function useRetryDeadLetters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationApi.retryDeadLetters(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.dlqCount() });
    },
  });
}

export function useResolveDeadLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => integrationApi.resolve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.dlqCount() });
    },
  });
}

export function useDlqCount(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.dlqCount(), params],
    queryFn: () => integrationApi.dlqCount(params),
    staleTime: 30_000,
  });
}

export function useIso20022Ingest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Iso20022Message>) => integrationApi.ingest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.integration });
    },
  });
}

export function useIso20022UpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => integrationApi.updateStatus(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.integration });
    },
  });
}

export function useIso20022MessagesByStatus(status: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.iso20022ByStatus(status),
    queryFn: () => integrationApi.getByStatus(status),
    enabled: !!status,
    staleTime: 30_000,
  });
}

export function useIso20022CodeSet(codeSetName: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.codeSet(codeSetName),
    queryFn: () => integrationApi.getCodeSet(codeSetName),
    enabled: !!codeSetName,
    staleTime: 30_000,
  });
}

export function useIso20022CodeLookup(codeSetName: string, code: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.codeLookup(codeSetName, code),
    queryFn: () => integrationApi.lookupCode(codeSetName, code),
    enabled: !!codeSetName && !!code,
    staleTime: 30_000,
  });
}

export function useSwiftMigrationMapping(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.swiftMapping(), params],
    queryFn: () => integrationApi.getSwiftMapping(params),
    staleTime: 30_000,
  });
}

export function useRegisterTpp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Psd2TppRegistration>) => integrationApi.registerTpp(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.activeTpps() });
    },
  });
}

export function useActivateTpp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tppId: number) => integrationApi.activate(tppId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.activeTpps() });
    },
  });
}

export function useSuspendTpp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tppId: number) => integrationApi.suspend(tppId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.activeTpps() });
    },
  });
}

export function useActiveTpps(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.activeTpps(), params],
    queryFn: () => integrationApi.getActiveTpps(params),
    staleTime: 30_000,
  });
}

export function useInitiateSca() {
  return useMutation({
    mutationFn: () => integrationApi.initiateSca(),
  });
}

export function useFinaliseSca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => integrationApi.finaliseSca(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.integration });
    },
  });
}

export function useCustomerScaSessions(customerId: number) {
  return useQuery({
    queryKey: GATEWAY_KEYS.customerScaSessions(customerId),
    queryFn: () => integrationApi.getCustomerSessions(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

// ─── Financial Gateway Hooks ──────────────────────────────────────────────────

export function useRegisterGatewayMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinancialGateway>) => financialGatewayApi.register(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.financialGateway });
    },
  });
}

export function useAckGatewayMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => financialGatewayApi.ack(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.financialGateway });
    },
  });
}

export function useNackGatewayMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => financialGatewayApi.ack2(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.financialGateway });
    },
  });
}

export function useQueuedGatewayMessages(gatewayId: number) {
  return useQuery({
    queryKey: GATEWAY_KEYS.queuedMessages(gatewayId),
    queryFn: () => financialGatewayApi.queued(gatewayId),
    enabled: !!gatewayId,
    staleTime: 30_000,
  });
}

export function useGatewayMessagesByType(type: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.messagesByType(type),
    queryFn: () => financialGatewayApi.queued2(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

// ─── Events Hooks ─────────────────────────────────────────────────────────────

export function usePublishEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => eventsApi.publish(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.events });
    },
  });
}

export function useProcessOutbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eventsApi.processOutbox(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.events });
    },
  });
}

export function useEventReplay(aggregateType: string, aggregateId: number) {
  return useQuery({
    queryKey: GATEWAY_KEYS.eventReplay(aggregateType, aggregateId),
    queryFn: () => eventsApi.replay(aggregateType, aggregateId),
    enabled: !!aggregateType && !!aggregateId,
    staleTime: 30_000,
  });
}

export function useCreateEventSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EventSubscription>) => eventsApi.createSubscription(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.subscriptions() });
    },
  });
}

export function useEventSubscriptions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.subscriptions(), params],
    queryFn: () => eventsApi.getSubscriptions(params),
    staleTime: 30_000,
  });
}

// ─── Tenants Hooks ────────────────────────────────────────────────────────────

export function useTenant(tenantCode: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.tenant(tenantCode),
    queryFn: () => tenantsApi.get(tenantCode),
    enabled: !!tenantCode,
    staleTime: 30_000,
  });
}

export function useDeactivateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantCode: string) => tenantsApi.deactivate(tenantCode),
    onSuccess: (_data, tenantCode) => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.tenant(tenantCode) });
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.tenants });
    },
  });
}

// ─── Data Lake Hooks ──────────────────────────────────────────────────────────

export function useDataLakeJobs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.dataLakeJobs(), params],
    queryFn: () => dataLakeApi.getActiveJobs(params),
    staleTime: 30_000,
  });
}

export function useDataLakeJobsByEntity(entity: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.dataLakeByEntity(entity),
    queryFn: () => dataLakeApi.getByEntity(entity),
    enabled: !!entity,
    staleTime: 30_000,
  });
}

export function useCreateDataLakeJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DataExportJob>) => dataLakeApi.createJob(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.dataLakeJobs() });
    },
  });
}

export function useExecuteDataLakeJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dataLakeApi.execute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.dataLake });
    },
  });
}

// ─── Service Directory Hooks ──────────────────────────────────────────────────

export function useServiceDirectoryByCategory(category: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.serviceCategory(category),
    queryFn: () => serviceDirectoryApi.create(category),
    enabled: !!category,
    staleTime: 30_000,
  });
}

// ─── Marketplace Hooks ────────────────────────────────────────────────────────

export function usePublishedProducts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.publishedProducts(), params],
    queryFn: () => marketplaceApi.getPublished(params),
    staleTime: 30_000,
  });
}

export function useProductsByCategory(category: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.productsByCategory(category),
    queryFn: () => marketplaceApi.getByCategory(category),
    enabled: !!category,
    staleTime: 30_000,
  });
}

export function useProductAnalytics(id: number) {
  return useQuery({
    queryKey: GATEWAY_KEYS.productAnalytics(id),
    queryFn: () => marketplaceApi.getAnalytics(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateMarketplaceProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MarketplaceApiProduct>) => marketplaceApi.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.publishedProducts() });
    },
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.marketplace });
    },
  });
}

export function useDeprecateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.deprecate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.marketplace });
    },
  });
}

export function useMarketplaceSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceApi.subscribe(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.marketplace });
    },
  });
}

export function useApproveSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: number) => marketplaceApi.approve(subscriptionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GATEWAY_KEYS.marketplace });
    },
  });
}

export function useRecordMarketplaceUsage() {
  return useMutation({
    mutationFn: () => marketplaceApi.recordUsage(),
  });
}

// ─── Message Analysis Hooks ───────────────────────────────────────────────────

export function useAnalyzeMessage(ref: string) {
  return useQuery({
    queryKey: GATEWAY_KEYS.analyzeMessage(ref),
    queryFn: () => messageAnalysisApi.analyze(ref),
    enabled: !!ref,
    staleTime: 30_000,
  });
}

export function useActionRequiredMessages(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GATEWAY_KEYS.actionRequired(), params],
    queryFn: () => messageAnalysisApi.actionRequired(params),
    staleTime: 30_000,
  });
}
