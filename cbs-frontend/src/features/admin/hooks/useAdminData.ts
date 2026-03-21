import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── API Imports ────────────────────────────────────────────────────────────

import { advertisingApi } from '../api/advertisingApi';
import { bizDevApi } from '../api/bizDevApi';
import { brandGuidelinesApi } from '../api/brandApi';
import { campaignsApi } from '../api/campaignApi';
import { commissionsApi } from '../api/commissionApi';
import { competitorsApi } from '../api/competitorApi';
import { governanceApi } from '../api/governanceApi';
import { loyaltyApi } from '../api/loyaltyApi';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  getTemplateVersions,
  getChannelConfigs,
  updateChannelConfig,
  testChannelSend,
  getDeliveryStats,
  getFailureRecords,
  getScheduledNotifications,
  createScheduledNotification,
  toggleSchedule,
} from '../api/notificationAdminApi';
import type {
  NotificationChannel,
  NotificationCategory,
  NotificationTemplate,
  TemplateStatus,
  ScheduledNotification,
  ChannelConfig,
} from '../api/notificationAdminApi';
import { parameterApi } from '../api/parameterApi';
import type {
  RateTier,
  RateTableUpdateRequest,
  CreateLookupRequest,
  SystemParameter,
} from '../api/parameterApi';
import { pricingApi } from '../api/pricingApi';
import { productAnalyticsApi } from '../api/productAnalyticsApi';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  publishProduct,
  retireProduct,
  getBundles,
  createBundle,
  getProductVersions,
} from '../api/productApi';
import type {
  BankingProduct,
  ProductBundle,
  ProductStatus,
  ProductType,
  ProductCategory,
} from '../api/productApi';
import { productBundlesApi } from '../api/productBundleApi';
import { productCatalogApi } from '../api/productCatalogApi';
import { productDeploymentsApi } from '../api/productDeployApi';
import { productFactoryApi } from '../api/productFactoryExtApi';
import { productInventoryApi } from '../api/productInventoryApi';
import { productQualityApi } from '../api/productQualityApi';
import { promotionsApi } from '../api/promotionApi';
import { propositionsApi } from '../api/propositionApi';
import { providerApi } from '../api/providerApi';
import type { RegisterProviderRequest, UpdateProviderRequest, ProviderFailoverConfig } from '../api/providerApi';
import { providersApi } from '../api/providerExtApi';
import { salesLeadsApi } from '../api/salesLeadApi';
import { salesPlansApi } from '../api/salesPlanApi';
import { salesSupportApi } from '../api/salesSupportApi';
import { surveysApi } from '../api/surveyApi';
import { userAdminApi } from '../api/userAdminApi';
import type { CreateUserRequest, CreateRoleRequest } from '../api/userAdminApi';

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const KEYS = {
  // Advertising
  advertising: {
    all: ['advertising'] as const,
    byStatus: (status: string) => ['advertising', 'byStatus', status] as const,
    byMediaType: (type: string) => ['advertising', 'byMediaType', type] as const,
  },

  // Biz Dev
  bizDev: {
    all: ['bizDev'] as const,
    byStatus: (status: string) => ['bizDev', 'byStatus', status] as const,
  },

  // Brand Guidelines
  brand: {
    all: ['brand'] as const,
    byType: (type: string) => ['brand', 'byType', type] as const,
    active: ['brand', 'active'] as const,
  },

  // Campaigns
  campaigns: {
    all: ['campaigns'] as const,
    performance: (code: string) => ['campaigns', 'performance', code] as const,
    active: ['campaigns', 'active'] as const,
  },

  // Commissions
  commissions: {
    all: ['commissions'] as const,
    agreementsByParty: (id: number) => ['commissions', 'agreements', 'party', id] as const,
    payoutsByParty: (id: number) => ['commissions', 'payouts', 'party', id] as const,
  },

  // Competitors
  competitors: {
    all: ['competitors'] as const,
    byType: (type: string) => ['competitors', 'byType', type] as const,
    threats: (level: string) => ['competitors', 'threats', level] as const,
  },

  // Governance
  governance: {
    all: ['governance'] as const,
    byKey: (key: string) => ['governance', 'byKey', key] as const,
    byCategory: (category: string) => ['governance', 'byCategory', category] as const,
    audit: (id: number) => ['governance', 'audit', id] as const,
  },

  // Loyalty
  loyalty: {
    all: ['loyalty'] as const,
    customerAccounts: (customerId: number) => ['loyalty', 'customer', customerId] as const,
    transactions: (loyaltyNumber: string) => ['loyalty', 'transactions', loyaltyNumber] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    templates: (params?: { channel?: NotificationChannel; category?: NotificationCategory; status?: TemplateStatus; search?: string }) =>
      ['notifications', 'templates', params] as const,
    template: (id: string) => ['notifications', 'template', id] as const,
    templateVersions: (id: string) => ['notifications', 'templateVersions', id] as const,
    channels: ['notifications', 'channels'] as const,
    deliveryStats: (days?: number) => ['notifications', 'deliveryStats', days] as const,
    failures: ['notifications', 'failures'] as const,
    scheduled: ['notifications', 'scheduled'] as const,
  },

  // Parameters
  parameters: {
    all: ['parameters'] as const,
    list: (params?: { category?: string; search?: string }) => ['parameters', 'list', params] as const,
    detail: (code: string) => ['parameters', 'detail', code] as const,
    history: (code: string) => ['parameters', 'history', code] as const,
    featureFlags: ['parameters', 'featureFlags'] as const,
    rateTables: ['parameters', 'rateTables'] as const,
    rateTable: (id: string) => ['parameters', 'rateTable', id] as const,
    lookupCodes: (params?: { category?: string }) => ['parameters', 'lookupCodes', params] as const,
    systemInfo: ['parameters', 'systemInfo'] as const,
  },

  // Pricing
  pricing: {
    all: ['pricing'] as const,
    activeDiscounts: (params?: Record<string, unknown>) => ['pricing', 'activeDiscounts', params] as const,
    customerSpecialPricing: (customerId: number) => ['pricing', 'specialPricing', 'customer', customerId] as const,
    discountUtilization: (params?: Record<string, unknown>) => ['pricing', 'utilization', params] as const,
  },

  // Products (core)
  products: {
    all: ['products'] as const,
    list: (params?: { status?: ProductStatus; type?: ProductType; category?: ProductCategory }) =>
      ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    bundles: ['products', 'bundles'] as const,
    versions: (id: string) => ['products', 'versions', id] as const,
  },

  // Product Analytics
  productAnalytics: {
    all: ['productAnalytics'] as const,
    byProduct: (code: string) => ['productAnalytics', 'byProduct', code] as const,
    byFamily: (family: string) => ['productAnalytics', 'byFamily', family] as const,
  },

  // Product Bundles
  productBundles: {
    all: ['productBundles'] as const,
    active: (params?: Record<string, unknown>) => ['productBundles', 'active', params] as const,
    enrollments: (customerId: number) => ['productBundles', 'enrollments', customerId] as const,
  },

  // Product Catalog
  productCatalog: {
    all: ['productCatalog'] as const,
    byFamily: (family: string) => ['productCatalog', 'byFamily', family] as const,
    sharia: (params?: Record<string, unknown>) => ['productCatalog', 'sharia', params] as const,
  },

  // Product Deployments
  productDeploy: {
    all: ['productDeploy'] as const,
    byProduct: (productCode: string) => ['productDeploy', 'byProduct', productCode] as const,
  },

  // Product Factory
  productFactory: {
    all: ['productFactory'] as const,
    active: (params?: Record<string, unknown>) => ['productFactory', 'active', params] as const,
    byCategory: (category: string) => ['productFactory', 'byCategory', category] as const,
  },

  // Product Inventory
  productInventory: {
    all: ['productInventory'] as const,
    lowStock: (params?: Record<string, unknown>) => ['productInventory', 'lowStock', params] as const,
    byBranch: (branchId: number) => ['productInventory', 'byBranch', branchId] as const,
  },

  // Product Quality
  productQuality: {
    all: ['productQuality'] as const,
    trend: (productCode: string) => ['productQuality', 'trend', productCode] as const,
    dashboard: (params?: Record<string, unknown>) => ['productQuality', 'dashboard', params] as const,
    compare: (params?: Record<string, unknown>) => ['productQuality', 'compare', params] as const,
  },

  // Promotions
  promotions: {
    all: ['promotions'] as const,
    active: (params?: Record<string, unknown>) => ['promotions', 'active', params] as const,
    byType: (type: string) => ['promotions', 'byType', type] as const,
  },

  // Propositions
  propositions: {
    all: ['propositions'] as const,
    bySegment: (segment: string) => ['propositions', 'bySegment', segment] as const,
  },

  // Providers (admin)
  providers: {
    all: ['providers'] as const,
    list: ['providers', 'list'] as const,
    detail: (id: string) => ['providers', 'detail', id] as const,
    healthLogs: (id: string, days?: number) => ['providers', 'healthLogs', id, days] as const,
    transactions: (id: string, params?: Record<string, unknown>) => ['providers', 'transactions', id, params] as const,
    sla: (params?: Record<string, unknown>) => ['providers', 'sla', params] as const,
    costs: (params?: Record<string, unknown>) => ['providers', 'costs', params] as const,
  },

  // Providers (ext)
  providersExt: {
    all: ['providersExt'] as const,
    dashboard: (code: string) => ['providersExt', 'dashboard', code] as const,
    costReport: (params?: Record<string, unknown>) => ['providersExt', 'costReport', params] as const,
    slaCompliance: (params?: Record<string, unknown>) => ['providersExt', 'slaCompliance', params] as const,
  },

  // Sales Leads
  salesLeads: {
    all: ['salesLeads'] as const,
    byAssignee: (assignedTo: string) => ['salesLeads', 'byAssignee', assignedTo] as const,
    byStage: (stage: string) => ['salesLeads', 'byStage', stage] as const,
  },

  // Sales Plans
  salesPlans: {
    all: ['salesPlans'] as const,
    byRegion: (region: string) => ['salesPlans', 'byRegion', region] as const,
    officerTargets: (id: number) => ['salesPlans', 'officerTargets', id] as const,
  },

  // Sales Support
  salesSupport: {
    all: ['salesSupport'] as const,
    articles: (params?: Record<string, unknown>) => ['salesSupport', 'articles', params] as const,
    collateral: (params?: Record<string, unknown>) => ['salesSupport', 'collateral', params] as const,
  },

  // Surveys
  surveys: {
    all: ['surveys'] as const,
    byType: (type: string) => ['surveys', 'byType', type] as const,
    responses: (code: string) => ['surveys', 'responses', code] as const,
  },

  // User Admin
  users: {
    all: ['users'] as const,
    list: (params?: Record<string, unknown>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    roles: ['users', 'roles'] as const,
    role: (id: string) => ['users', 'role', id] as const,
    permissions: ['users', 'permissions'] as const,
    sessions: ['users', 'sessions'] as const,
    loginHistory: (params?: { userId?: string; dateFrom?: string; dateTo?: string; outcome?: string }) =>
      ['users', 'loginHistory', params] as const,
    dashboardStats: ['users', 'dashboardStats'] as const,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ADVERTISING
// ═══════════════════════════════════════════════════════════════════════════════

export function useAdvertisingByStatus(status: string) {
  return useQuery({
    queryKey: KEYS.advertising.byStatus(status),
    queryFn: () => advertisingApi.recordPerformance2(status),
    staleTime: 30_000,
    enabled: !!status,
  });
}

export function useAdvertisingByMediaType(type: string) {
  return useQuery({
    queryKey: KEYS.advertising.byMediaType(type),
    queryFn: () => advertisingApi.getByMediaType(type),
    staleTime: 30_000,
    enabled: !!type,
  });
}

export function useCreateAdvertising() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<Parameters<typeof advertisingApi.create>[1]> }) =>
      advertisingApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.advertising.all });
    },
  });
}

export function useRecordAdvertisingPerformance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advertisingApi.recordPerformance(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.advertising.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIZ DEV
// ═══════════════════════════════════════════════════════════════════════════════

export function useBizDevByStatus(status: string) {
  return useQuery({
    queryKey: KEYS.bizDev.byStatus(status),
    queryFn: () => bizDevApi.getByStatus(status),
    staleTime: 30_000,
    enabled: !!status,
  });
}

export function useCreateBizDev() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<Parameters<typeof bizDevApi.create>[1]> }) =>
      bizDevApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bizDev.all });
    },
  });
}

export function useUpdateBizDevProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => bizDevApi.updateProgress(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bizDev.all });
    },
  });
}

export function useCompleteBizDev() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => bizDevApi.updateProgress2(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bizDev.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND GUIDELINES
// ═══════════════════════════════════════════════════════════════════════════════

export function useBrandGuidelinesByType(type: string) {
  return useQuery({
    queryKey: KEYS.brand.byType(type),
    queryFn: () => brandGuidelinesApi.getByType(type),
    staleTime: 60_000,
    enabled: !!type,
  });
}

export function useActiveBrandGuidelines(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.brand.active,
    queryFn: () => brandGuidelinesApi.getByType2(params),
    staleTime: 60_000,
  });
}

export function useCreateBrandGuideline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<Parameters<typeof brandGuidelinesApi.create>[1]> }) =>
      brandGuidelinesApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.brand.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════════

export function useCampaignPerformance(code: string) {
  return useQuery({
    queryKey: KEYS.campaigns.performance(code),
    queryFn: () => campaignsApi.performance(code),
    staleTime: 30_000,
    enabled: !!code,
  });
}

export function useActiveCampaigns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.campaigns.active,
    queryFn: () => campaignsApi.getActiveSummary(params),
    staleTime: 30_000,
  });
}

export function useApproveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<Parameters<typeof campaignsApi.approveCampaign>[1]> }) =>
      campaignsApi.approveCampaign(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns.all });
    },
  });
}

export function useLaunchCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => campaignsApi.launch(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns.all });
    },
  });
}

export function useRecordCampaignMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => campaignsApi.recordMetrics(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function useCommissionAgreementsByParty(partyId: number) {
  return useQuery({
    queryKey: KEYS.commissions.agreementsByParty(partyId),
    queryFn: () => commissionsApi.getAgreementsByParty(String(partyId)),
    staleTime: 30_000,
    enabled: !!partyId,
  });
}

export function useCommissionPayoutsByParty(partyId: number) {
  return useQuery({
    queryKey: KEYS.commissions.payoutsByParty(partyId),
    queryFn: () => commissionsApi.getPayoutsByParty(String(partyId)),
    staleTime: 30_000,
    enabled: !!partyId,
  });
}

export function useCreateCommissionAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof commissionsApi.createAgreement>[0]) =>
      commissionsApi.createAgreement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.commissions.all });
    },
  });
}

export function useActivateCommissionAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      commissionsApi.activateAgreement(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.commissions.all });
    },
  });
}

export function useCalculateCommissionPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, params }: { code: string; params: { grossSales: number; qualifyingSales: number; period: string } }) =>
      commissionsApi.calculatePayout(code, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.commissions.all });
    },
  });
}

export function useApproveCommissionPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => commissionsApi.approvePayout(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.commissions.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITORS
// ═══════════════════════════════════════════════════════════════════════════════

export function useCompetitorsByType(type: string) {
  return useQuery({
    queryKey: KEYS.competitors.byType(type),
    queryFn: () => competitorsApi.getByType(type),
    staleTime: 60_000,
    enabled: !!type,
  });
}

export function useCompetitorThreats(level: string) {
  return useQuery({
    queryKey: KEYS.competitors.threats(level),
    queryFn: () => competitorsApi.getThreats(level),
    staleTime: 60_000,
    enabled: !!level,
  });
}

export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof competitorsApi.update>[1] }) =>
      competitorsApi.update(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.competitors.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE
// ═══════════════════════════════════════════════════════════════════════════════

export function useGovernanceParameterByKey(key: string) {
  return useQuery({
    queryKey: KEYS.governance.byKey(key),
    queryFn: () => governanceApi.getByKey(key),
    staleTime: 60_000,
    enabled: !!key,
  });
}

export function useGovernanceParametersByCategory(category: string) {
  return useQuery({
    queryKey: KEYS.governance.byCategory(category),
    queryFn: () => governanceApi.getByCategory(category),
    staleTime: 60_000,
    enabled: !!category,
  });
}

export function useGovernanceParameterAudit(id: number) {
  return useQuery({
    queryKey: KEYS.governance.audit(id),
    queryFn: () => governanceApi.getAudit(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useUpdateGovernanceParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newValue, reason }: { id: number; newValue: string; reason?: string }) =>
      governanceApi.update(id, newValue, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.governance.all });
    },
  });
}

export function useApproveGovernanceParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => governanceApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.governance.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOYALTY
// ═══════════════════════════════════════════════════════════════════════════════

export function useLoyaltyCustomerAccounts(customerId: number) {
  return useQuery({
    queryKey: KEYS.loyalty.customerAccounts(customerId),
    queryFn: () => loyaltyApi.getCustomerAccounts(customerId),
    staleTime: 30_000,
    enabled: !!customerId,
  });
}

export function useLoyaltyTransactions(loyaltyNumber: string) {
  return useQuery({
    queryKey: KEYS.loyalty.transactions(loyaltyNumber),
    queryFn: () => loyaltyApi.getTransactions(loyaltyNumber),
    staleTime: 30_000,
    enabled: !!loyaltyNumber,
  });
}

export function useCreateLoyaltyProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof loyaltyApi.createProgram>[0]) =>
      loyaltyApi.createProgram(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.loyalty.all });
    },
  });
}

export function useEnrollLoyalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => loyaltyApi.enroll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.loyalty.all });
    },
  });
}

export function useEarnLoyaltyPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loyaltyNumber: string) => loyaltyApi.earn(loyaltyNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.loyalty.all });
    },
  });
}

export function useRedeemLoyaltyPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loyaltyNumber: string) => loyaltyApi.redeem(loyaltyNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.loyalty.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function useNotificationTemplates(params?: {
  channel?: NotificationChannel;
  category?: NotificationCategory;
  status?: TemplateStatus;
  search?: string;
}) {
  return useQuery({
    queryKey: KEYS.notifications.templates(params),
    queryFn: () => getTemplates(params),
    staleTime: 30_000,
  });
}

export function useNotificationTemplate(id: string) {
  return useQuery({
    queryKey: KEYS.notifications.template(id),
    queryFn: () => getTemplateById(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useNotificationTemplateVersions(id: string) {
  return useQuery({
    queryKey: KEYS.notifications.templateVersions(id),
    queryFn: () => getTemplateVersions(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useNotificationChannelConfigs() {
  return useQuery({
    queryKey: KEYS.notifications.channels,
    queryFn: () => getChannelConfigs(),
    staleTime: 60_000,
  });
}

export function useNotificationDeliveryStats(days = 30) {
  return useQuery({
    queryKey: KEYS.notifications.deliveryStats(days),
    queryFn: () => getDeliveryStats(days),
    staleTime: 30_000,
  });
}

export function useNotificationFailures() {
  return useQuery({
    queryKey: KEYS.notifications.failures,
    queryFn: () => getFailureRecords(),
    staleTime: 30_000,
  });
}

export function useScheduledNotifications() {
  return useQuery({
    queryKey: KEYS.notifications.scheduled,
    queryFn: () => getScheduledNotifications(),
    staleTime: 30_000,
  });
}

export function useCreateNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationTemplate>) => createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}

export function useUpdateNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationTemplate> }) =>
      updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}

export function usePublishNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}

export function useArchiveNotificationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}

export function useUpdateNotificationChannelConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channel, data }: { channel: NotificationChannel; data: Partial<ChannelConfig> }) =>
      updateChannelConfig(channel, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.channels });
    },
  });
}

export function useTestNotificationChannel() {
  return useMutation({
    mutationFn: ({ channel, recipient }: { channel: NotificationChannel; recipient: string }) =>
      testChannelSend(channel, recipient),
  });
}

export function useCreateScheduledNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScheduledNotification>) => createScheduledNotification(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.scheduled });
    },
  });
}

export function useToggleScheduledNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.scheduled });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

export function useParameters(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: KEYS.parameters.list(params),
    queryFn: () => parameterApi.getParameters(params),
    staleTime: 60_000,
  });
}

export function useParameter(code: string) {
  return useQuery({
    queryKey: KEYS.parameters.detail(code),
    queryFn: () => parameterApi.getParameter(code),
    staleTime: 60_000,
    enabled: !!code,
  });
}

export function useParameterHistory(id: number | undefined) {
  return useQuery({
    queryKey: KEYS.parameters.history(id ? String(id) : ''),
    queryFn: () => parameterApi.getParameterHistory(id!),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: KEYS.parameters.featureFlags,
    queryFn: () => parameterApi.getFeatureFlags(),
    staleTime: 60_000,
  });
}

export function useRateTables() {
  return useQuery({
    queryKey: KEYS.parameters.rateTables,
    queryFn: () => parameterApi.getRateTables(),
    staleTime: 60_000,
  });
}

export function useRateTable(id: number) {
  return useQuery({
    queryKey: KEYS.parameters.rateTable(String(id)),
    queryFn: () => parameterApi.getRateTable(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useLookupCodes(params?: { category?: string }) {
  return useQuery({
    queryKey: KEYS.parameters.lookupCodes(params),
    queryFn: () => parameterApi.getLookupCodes(params),
    staleTime: 60_000,
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: KEYS.parameters.systemInfo,
    queryFn: () => parameterApi.getSystemInfo(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUpdateParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { value: string; reason: string } }) =>
      parameterApi.updateParameterById(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters.all });
    },
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, enabled, reason }: { code: string; enabled: boolean; reason: string }) =>
      parameterApi.toggleFeatureFlag(code, enabled, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters.featureFlags });
    },
  });
}

export function useCreateRateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type?: string; tiers?: RateTier[] }) =>
      parameterApi.createRateTable(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters.rateTables });
    },
  });
}

export function useUpdateRateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RateTableUpdateRequest }) =>
      parameterApi.updateRateTable(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters.rateTables });
    },
  });
}

export function useCreateLookupCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLookupRequest) => parameterApi.createLookupCode(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters.all });
    },
  });
}

export function useUpdateLookupCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ code: string; description: string; status: string }> }) =>
      parameterApi.updateLookupCode(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════════════════════════

export function useActiveDiscounts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.pricing.activeDiscounts(params),
    queryFn: () => pricingApi.getActiveDiscounts(params),
    staleTime: 60_000,
  });
}

export function useCustomerSpecialPricing(customerId: number) {
  return useQuery({
    queryKey: KEYS.pricing.customerSpecialPricing(customerId),
    queryFn: () => pricingApi.getCustomerSpecialPricing(customerId),
    staleTime: 30_000,
    enabled: !!customerId,
  });
}

export function useDiscountUtilization(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.pricing.discountUtilization(params),
    queryFn: () => pricingApi.getDiscountUtilization(params),
    staleTime: 30_000,
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof pricingApi.createDiscount>[0]) =>
      pricingApi.createDiscount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pricing.all });
    },
  });
}

export function useEvaluateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pricingApi.evaluateDiscount(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pricing.all });
    },
  });
}

export function useCreateSpecialPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof pricingApi.createSpecialPricing>[0]) =>
      pricingApi.createSpecialPricing(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pricing.all });
    },
  });
}

export function useReviewSpecialPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pricingApi.reviewSpecialPricing(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.pricing.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS (core)
// ═══════════════════════════════════════════════════════════════════════════════

export function useProducts(params?: { status?: ProductStatus; type?: ProductType; category?: ProductCategory }) {
  return useQuery({
    queryKey: KEYS.products.list(params),
    queryFn: () => getProducts(params),
    staleTime: 60_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: KEYS.products.detail(id),
    queryFn: () => getProductById(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useProductBundlesList() {
  return useQuery({
    queryKey: KEYS.products.bundles,
    queryFn: () => getBundles(),
    staleTime: 60_000,
  });
}

export function useProductVersions(id: string) {
  return useQuery({
    queryKey: KEYS.products.versions(id),
    queryFn: () => getProductVersions(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BankingProduct>) => createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.products.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BankingProduct> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.products.all });
    },
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.products.all });
    },
  });
}

export function useRetireProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retireProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.products.all });
    },
  });
}

export function useCreateProductBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductBundle>) => createBundle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.products.bundles });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

export function useProductAnalyticsByProduct(code: string, periodType: string = 'MONTHLY') {
  return useQuery({
    queryKey: [...KEYS.productAnalytics.byProduct(code), periodType],
    queryFn: () => productAnalyticsApi.getByProduct(code, periodType),
    staleTime: 30_000,
    enabled: !!code,
  });
}

export function useProductAnalyticsByFamily(family: string, periodType: string = 'MONTHLY', periodDate: string = new Date().toISOString().slice(0, 10)) {
  return useQuery({
    queryKey: [...KEYS.productAnalytics.byFamily(family), periodType, periodDate],
    queryFn: () => productAnalyticsApi.getByFamily(family, periodType, periodDate),
    staleTime: 30_000,
    enabled: !!family,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT BUNDLES
// ═══════════════════════════════════════════════════════════════════════════════

export function useActiveProductBundles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.productBundles.active(params),
    queryFn: () => productBundlesApi.getActive(params),
    staleTime: 60_000,
  });
}

export function useProductBundleEnrollments(customerId: number) {
  return useQuery({
    queryKey: KEYS.productBundles.enrollments(customerId),
    queryFn: () => productBundlesApi.getEnrollments(customerId),
    staleTime: 30_000,
    enabled: !!customerId,
  });
}

export function useEnrollProductBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Record<string, unknown> }) =>
      productBundlesApi.enroll(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productBundles.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

export function useProductCatalogByFamily(family: string) {
  return useQuery({
    queryKey: KEYS.productCatalog.byFamily(family),
    queryFn: () => productCatalogApi.byFamily(family),
    staleTime: 60_000,
    enabled: !!family,
  });
}

export function useShariaCompliantProducts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.productCatalog.sharia(params),
    queryFn: () => productCatalogApi.sharia(params),
    staleTime: 60_000,
  });
}

export function useLaunchProductCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => productCatalogApi.launch(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productCatalog.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT DEPLOYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function useProductDeploymentsByProduct(productCode: string) {
  return useQuery({
    queryKey: KEYS.productDeploy.byProduct(productCode),
    queryFn: () => productDeploymentsApi.getByProduct(productCode),
    staleTime: 30_000,
    enabled: !!productCode,
  });
}

export function useApproveProductDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof productDeploymentsApi.create>[1] }) =>
      productDeploymentsApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productDeploy.all });
    },
  });
}

export function useCompleteProductDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => productDeploymentsApi.complete(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productDeploy.all });
    },
  });
}

export function useRollbackProductDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => productDeploymentsApi.complete2(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productDeploy.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function useActiveProductTemplates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.productFactory.active(params),
    queryFn: () => productFactoryApi.getActive(params),
    staleTime: 60_000,
  });
}

export function useProductTemplatesByCategory(category: string) {
  return useQuery({
    queryKey: KEYS.productFactory.byCategory(category),
    queryFn: () => productFactoryApi.getByCategory(category),
    staleTime: 60_000,
    enabled: !!category,
  });
}

export function useCreateProductTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof productFactoryApi.create>[0]) =>
      productFactoryApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productFactory.all });
    },
  });
}

export function useSubmitProductTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productFactoryApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productFactory.all });
    },
  });
}

export function useApproveProductTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productFactoryApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productFactory.all });
    },
  });
}

export function useActivateProductTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productFactoryApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productFactory.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function useProductInventoryLowStock(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.productInventory.lowStock(params),
    queryFn: () => productInventoryApi.getLowStock(params),
    staleTime: 30_000,
  });
}

export function useProductInventoryByBranch(branchId: number) {
  return useQuery({
    queryKey: KEYS.productInventory.byBranch(branchId),
    queryFn: () => productInventoryApi.getByBranch(branchId),
    staleTime: 30_000,
    enabled: !!branchId,
  });
}

export function useIssueProductInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => productInventoryApi.issue(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productInventory.all });
    },
  });
}

export function useReplenishProductInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => productInventoryApi.replenish(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.productInventory.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT QUALITY
// ═══════════════════════════════════════════════════════════════════════════════

export function useProductQualityTrend(productCode: string) {
  return useQuery({
    queryKey: KEYS.productQuality.trend(productCode),
    queryFn: () => productQualityApi.getQualityTrend(productCode),
    staleTime: 30_000,
    enabled: !!productCode,
  });
}

export function useProductQualityDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.productQuality.dashboard(params),
    queryFn: () => productQualityApi.getQualityDashboard(params),
    staleTime: 30_000,
  });
}

export function useProductQualityCompare(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.productQuality.compare(params),
    queryFn: () => productQualityApi.compareProducts(params),
    staleTime: 30_000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function useActivePromotions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.promotions.active(params),
    queryFn: () => promotionsApi.redeem2(params),
    staleTime: 30_000,
  });
}

export function usePromotionsByType(type: string) {
  return useQuery({
    queryKey: KEYS.promotions.byType(type),
    queryFn: () => promotionsApi.getByType(type),
    staleTime: 30_000,
    enabled: !!type,
  });
}

export function useActivatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof promotionsApi.create>[1] }) =>
      promotionsApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.promotions.all });
    },
  });
}

export function useRedeemPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => promotionsApi.redeem(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.promotions.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function usePropositionsBySegment(segment: string) {
  return useQuery({
    queryKey: KEYS.propositions.bySegment(segment),
    queryFn: () => propositionsApi.bySegment(segment),
    staleTime: 60_000,
    enabled: !!segment,
  });
}

export function useActivateProposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => propositionsApi.activate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.propositions.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS (admin)
// ═══════════════════════════════════════════════════════════════════════════════

export function useProviders() {
  return useQuery({
    queryKey: KEYS.providers.list,
    queryFn: () => providerApi.getProviders(),
    staleTime: 30_000,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: KEYS.providers.detail(id),
    queryFn: () => providerApi.getProviderById(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useProviderHealthLogs(id: string) {
  return useQuery({
    queryKey: KEYS.providers.healthLogs(id),
    queryFn: () => providerApi.getHealthLogs(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useProviderTransactionLogs(id: string) {
  return useQuery({
    queryKey: KEYS.providers.transactions(id),
    queryFn: () => providerApi.getTransactionLogs(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useProviderSlaRecords() {
  return useQuery({
    queryKey: KEYS.providers.sla(),
    queryFn: () => providerApi.getSlaRecords(),
    staleTime: 30_000,
  });
}

export function useProviderCostRecords() {
  return useQuery({
    queryKey: KEYS.providers.costs(),
    queryFn: () => providerApi.getCostRecords(),
    staleTime: 30_000,
  });
}

export function useRegisterProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterProviderRequest) => providerApi.registerProvider(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProviderRequest }) =>
      providerApi.updateProvider(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

export function useProviderHealthCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerApi.healthCheckNow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

export function useTriggerProviderFailover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerApi.triggerFailover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

export function useSuspendProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerApi.suspendProvider(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

export function useSaveProviderFailoverConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: ProviderFailoverConfig }) =>
      providerApi.saveFailoverConfig(id, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS (ext)
// ═══════════════════════════════════════════════════════════════════════════════

export function useProviderExtDashboard(code: string) {
  return useQuery({
    queryKey: KEYS.providersExt.dashboard(code),
    queryFn: () => providersApi.dashboard(code),
    staleTime: 30_000,
    enabled: !!code,
  });
}

export function useProviderCostReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.providersExt.costReport(params),
    queryFn: () => providersApi.costReport(params),
    staleTime: 30_000,
  });
}

export function useProviderSlaCompliance(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.providersExt.slaCompliance(params),
    queryFn: () => providersApi.slaCompliance(params),
    staleTime: 30_000,
  });
}

export function useActivateProviderExt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => providersApi.activate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providersExt.all });
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

export function useProviderExtHealthCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => providersApi.healthCheck(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providersExt.all });
    },
  });
}

export function useLogProviderTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof providersApi.logTransaction>[1] }) =>
      providersApi.logTransaction(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providersExt.all });
    },
  });
}

export function useProviderExtFailover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => providersApi.failover(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.providersExt.all });
      qc.invalidateQueries({ queryKey: KEYS.providers.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES LEADS
// ═══════════════════════════════════════════════════════════════════════════════

export function useSalesLeadsByAssignee(assignedTo: string) {
  return useQuery({
    queryKey: KEYS.salesLeads.byAssignee(assignedTo),
    queryFn: () => salesLeadsApi.getByAssignee(assignedTo),
    staleTime: 30_000,
    enabled: !!assignedTo,
  });
}

export function useSalesLeadsByStage(stage: string) {
  return useQuery({
    queryKey: KEYS.salesLeads.byStage(stage),
    queryFn: () => salesLeadsApi.byStage(stage),
    staleTime: 30_000,
    enabled: !!stage,
  });
}

export function useAdvanceSalesLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ number, data }: { number: string; data: Parameters<typeof salesLeadsApi.advanceLead>[1] }) =>
      salesLeadsApi.advanceLead(number, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesLeads.all });
    },
  });
}

export function useAssignSalesLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => salesLeadsApi.assign(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesLeads.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES PLANS
// ═══════════════════════════════════════════════════════════════════════════════

export function useSalesPlansByRegion(region: string) {
  return useQuery({
    queryKey: KEYS.salesPlans.byRegion(region),
    queryFn: () => salesPlansApi.getPlansByRegion(region),
    staleTime: 30_000,
    enabled: !!region,
  });
}

export function useSalesTargetsByOfficer(officerId: number) {
  return useQuery({
    queryKey: KEYS.salesPlans.officerTargets(officerId),
    queryFn: () => salesPlansApi.getTargetsByOfficer(officerId),
    staleTime: 30_000,
    enabled: !!officerId,
  });
}

export function useCreateSalesPlanTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof salesPlansApi.create>[1] }) =>
      salesPlansApi.create(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesPlans.all });
    },
  });
}

export function useRecordSalesActual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => salesPlansApi.recordActual(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesPlans.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function useSalesSupportArticles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.salesSupport.articles(params),
    queryFn: () => salesSupportApi.searchArticles(params),
    staleTime: 60_000,
  });
}

export function useSalesSupportCollateral(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.salesSupport.collateral(params),
    queryFn: () => salesSupportApi.searchCollateral(params),
    staleTime: 60_000,
  });
}

export function useCreateSalesArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof salesSupportApi.createArticle>[0]) =>
      salesSupportApi.createArticle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesSupport.all });
    },
  });
}

export function usePublishSalesArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof salesSupportApi.createArticle2>[1] }) =>
      salesSupportApi.createArticle2(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesSupport.all });
    },
  });
}

export function useCreateSalesCollateral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof salesSupportApi.createCollateral>[0]) =>
      salesSupportApi.createCollateral(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesSupport.all });
    },
  });
}

export function usePublishSalesCollateral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof salesSupportApi.createCollateral2>[1] }) =>
      salesSupportApi.createCollateral2(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesSupport.all });
    },
  });
}

export function useRecordArticleView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => salesSupportApi.recordView(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.salesSupport.articles() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SURVEYS
// ═══════════════════════════════════════════════════════════════════════════════

export function useSurveysByType(type: string) {
  return useQuery({
    queryKey: KEYS.surveys.byType(type),
    queryFn: () => surveysApi.getByType(type),
    staleTime: 30_000,
    enabled: !!type,
  });
}

export function useSurveyResponses(code: string) {
  return useQuery({
    queryKey: KEYS.surveys.responses(code),
    queryFn: () => surveysApi.getResponses(code),
    staleTime: 30_000,
    enabled: !!code,
  });
}

export function useLaunchSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof surveysApi.launchSurvey>[1] }) =>
      surveysApi.launchSurvey(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.surveys.all });
    },
  });
}

export function useRespondToSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof surveysApi.respond>[1] }) =>
      surveysApi.respond(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.surveys.all });
    },
  });
}

export function useCloseSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Parameters<typeof surveysApi.submitResponse>[1] }) =>
      surveysApi.submitResponse(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.surveys.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

export function useUsers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.users.list(params),
    queryFn: () => userAdminApi.getUsers(params),
    staleTime: 30_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: KEYS.users.detail(id),
    queryFn: () => userAdminApi.getUser(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: KEYS.users.roles,
    queryFn: () => userAdminApi.getRoles(),
    staleTime: 60_000,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: KEYS.users.role(id),
    queryFn: () => userAdminApi.getRole(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: KEYS.users.permissions,
    queryFn: () => userAdminApi.getPermissions(),
    staleTime: 60_000,
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: KEYS.users.sessions,
    queryFn: () => userAdminApi.getActiveSessions(),
    staleTime: 30_000,
  });
}

export function useLoginHistory(params: { userId?: string; dateFrom?: string; dateTo?: string; outcome?: string }) {
  return useQuery({
    queryKey: KEYS.users.loginHistory(params),
    queryFn: () => userAdminApi.getLoginHistory(params),
    staleTime: 30_000,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: KEYS.users.dashboardStats,
    queryFn: () => userAdminApi.getDashboardStats(),
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => userAdminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.all });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserRequest> }) =>
      userAdminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.all });
    },
  });
}

export function useDisableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      userAdminApi.disableUser(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.all });
    },
  });
}

export function useEnableUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userAdminApi.enableUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.all });
    },
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userAdminApi.resetPassword(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.all });
    },
  });
}

export function useForceLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userAdminApi.forceLogout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.sessions });
    },
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userAdminApi.unlockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.all });
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => userAdminApi.createRole(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.roles });
    },
  });
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      userAdminApi.updateRolePermissions(roleId, permissions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.roles });
    },
  });
}

export function useForceLogoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => userAdminApi.forceLogoutSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.users.sessions });
    },
  });
}
