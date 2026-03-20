import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { MfaChallengePage } from '@/features/auth/pages/MfaChallengePage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { SessionTimeoutModal } from '@/features/auth/components/SessionTimeoutModal';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { AccountMaintenancePage } from '@/features/accounts/pages/AccountMaintenancePage';
import { AccountOpeningPage } from '@/features/accounts/pages/AccountOpeningPage';
import { AccountDetailPage } from '@/features/accounts/pages/AccountDetailPage';
import { PortalLayout } from '@/features/portal/layout/PortalLayout';
import CustomerListPage from '@/features/customers/pages/CustomerListPage';
import Customer360Page from '@/features/customers/pages/Customer360Page';
import OnboardingWizardPage from '@/features/customers/pages/OnboardingWizardPage';
import KycDashboardPage from '@/features/customers/pages/KycDashboardPage';
import { KycReviewPage } from '@/features/customers/pages/KycReviewPage';
import SegmentationPage from '@/features/customers/pages/SegmentationPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
// Lazy-loaded customer pages are in lazyRoutes.ts
import { NotFoundPage as NotFoundPageFull } from '@/pages/NotFoundPage';
import { ServerErrorPage } from '@/pages/ServerErrorPage';
import {
  AchOperationsPage,
  ActiveLoansPage,
  AmlMonitoringPage,
  AuditTrailPage,
  BillPaymentPage,
  BranchOpsPage,
  BulkPaymentPage,
  CapitalMarketsPage,
  CardClearingPage,
  CardDetailPage,
  CardListPage,
  CardTransactionsPage,
  CaseDetailPage,
  CaseListPage,
  CashPoolPage,
  NotionalPoolPage,
  ChannelAnalyticsPage,
  ChequeManagementPage,
  CollectionsPage,
  ComplianceDashboardPage,
  AmlDashboardPage,
  AmlAlertDetailPage,
  FraudDashboardPage,
  FraudAlertDetailPage,
  ContactCenterPage,
  CreditRiskPage,
  CustomReportBuilderPage,
  CustomerAnalyticsPage,
  DepositAnalyticsPage,
  DocumentManagementPage,
  EclDashboardPage,
  EodConsolePage,
  ExecutiveDashboardPage,
  FacilityDetailPage,
  FacilityListPage,
  FeeDefinitionDetailPage,
  FeeScheduleListPage,
  FinancialReportsPage,
  FixedDepositDetailPage,
  SegmentDetailPage,
  FixedDepositListPage,
  FixedIncomePage,
  FraudManagementPage,
  GatewayConsolePage,
  GeneralLedgerPage,
  GoalDetailPage,
  GoalListPage,
  InternationalTransferPage,
  LeaseDetailPage,
  LeaseListPage,
  LoanAnalyticsPage,
  LoanApplicationListPage,
  LoanApplicationPage,
  LoanDashboardPage,
  LoanDetailPage,
  LoanRepaymentPage,
  LoanRestructurePage,
  MarketingAnalyticsPage,
  MarketDataPage,
  MarketLiquidityRiskPage,
  MerchantListPage,
  MobileMoneyPage,
  MortgageDetailPage,
  MortgageListPage,
  NewCasePage,
  NewFeeDefinitionPage,
  NewFixedDepositPage,
  NewGoalPage,
  NewTransferPage,
  NotificationCenterPage,
  OperationalReportsPage,
  OperationalRiskPage,
  OrderManagementPage,
  PaymentAnalyticsPage,
  PortalAccountsPage,
  PortalBeneficiariesPage,
  PortalCardControlsPage,
  PortalDashboard,
  PortalProfilePage,
  PortalServiceRequestsPage,
  PortalTransferPage,
  PosTerminalPage,
  ProductCreatePage,
  ProductDetailPage,
  ProductFactoryPage,
  ProviderDetailPage,
  QrPaymentPage,
  ReconciliationWorkbenchPage,
  RecurringDepositDetailPage,
  RecurringDepositListPage,
  RegulatoryReturnsPage,
  ReportViewerPage,
  ReturnDetailPage,
  RiskDashboardPage,
  SanctionsScreeningPage,
  SavedReportsPage,
  ServiceProviderPage,
  StandingOrderDetailPage,
  StandingOrderListPage,
  StatementGeneratorPage,
  SyndicationPage,
  SystemParametersPage,
  TemplateManagementPage,
  TradeFinancePage,
  TradeOpsPage,
  TransactionSearchPage,
  TreasuryAlmReportsPage,
  UserAdminPage,
  VirtualAccountDetailPage,
  VirtualAccountListPage,
  WealthManagementPage,
  WealthPlanDetailPage,
  AgreementCreatePage,
  AgreementDetailPage,
  AgreementEditPage,
  AgreementListPage,
  AgreementsHubPage,
  PricingDashboardPage,
  TdFrameworkListPage,
  TdFrameworkDetailPage,
  TdSummaryDashboardPage,
  CommissionAgreementsPage,
  CommissionDetailPage,
  CommunicationCenterPage,
  TemplateDetailPage,
  AgentDashboardPage,
  AgentWorkbenchPage,
  AgentDetailPage,
  QueueDashboardPage,
  CallbackPage,
  IvrManagerPage,
  KnowledgeBasePage,
  ChatSessionsPage,
  RoutingRulesPage,
  ChannelConfigPage,
  CommsPreferencesPage,
  PortalNotificationsPage,
  CollateralRegisterPage,
  CollateralDetailPage,
  ComplianceReportsPage,
  ApprovalQueuePage,
  OperationsHomePage,
  TreasuryHomePage,
  TreasuryDashboardPage,
  TreasuryDealsPage,
  TradingDeskPage,
  MarketMakingPage,
  CapitalMarketsDashboardPage,
  CapitalMarketsDealDetailPage,
  CmTradeOpsPage,
  CmSettlementPage,
  CmCustodyPage,
  SecuritiesPositionPage,
  QuantModelPage,
  CmSuitabilityPage,
  SecuritizationPage,
  ProgramTradingPage,
  EconomicCapitalPage,
  QuoteManagementPage,
  ValuationPage,
  InvestmentPortfolioPage,
  PortfolioDetailPage,
  FundManagementPage,
  FundDetailPage,
  AdvisoryDashboardPage,
  CorporateFinancePage,
  ProjectFinancePage,
  SuitabilityPage,
  IntelligencePage,
  AlmDashboardPage,
  DurationAnalyticsPage,
  LiquidityGapPage,
  StressTestingPage,
  AlcoReportPage,
  RegulatorySubmissionPage,
  CustodySettlementPage,
  CustodyHubPage,
  SecuritiesFailsPage,
  FailDetailPage,
  CustodyPositionsPage,
  CustodyPositionDetailPage,
  CounterpartyPage,
  CounterpartyDetailPage,
  CustodyValuationPage,
  CustodyValuationRunPage,
  ChannelManagementPage,
  OpenBankingPage,
  MerchantAcquiringPage,
  MarketDataManagementPage,
  TradeFinanceHubPage,
  AccountListPage,
  WalletPage,
  PaymentsDashboardPage,
  CardDisputePage,
  CardDisputeDetailPage,
  MerchantDetailPage,
  MerchantOnboardPage,
  TerminalDetailPage,
  CardRequestPage,
  CardIssuancePage,
  TreasuryPositionsPage,
  FxRatesPage,
  ComplianceAssessmentsPage,
  ComplianceSanctionsPage,
  ScreeningDetailPage,
  ComplianceHubPage,
  GapAnalysisPage,
  RegulatoryDefinitionsPage,
  ReportsHomePage,
  AdminHomePage,
  CampaignManagementPage,
  CommissionManagementPage,
  LoyaltyProgramPage,
  PricingManagementPage,
  SalesManagementPage,
  SurveyManagementPage,
  GovernancePage,
  NotificationManagementPage,
} from './lazyRoutes';

// Placeholder page — used for all unimplemented modules
function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle || 'This module will be implemented in a subsequent prompt.'} />
      <div className="page-container">
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Module Coming Soon</p>
          <p className="text-sm mt-1">Navigate using the sidebar to explore available modules.</p>
        </div>
      </div>
    </>
  );
}

// Inline DashboardPage and NotFoundPage removed — now imported from feature modules

export function AppRouter() {
  return (
    <>
      <SessionTimeoutModal />
      <Routes>
        {/* Auth routes — no shell */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/mfa" element={<MfaChallengePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Main app — with shell + auth protection */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Customers */}
        <Route path="/customers" element={<Outlet />}>
          <Route index element={<CustomerListPage />} />
          <Route path="onboarding" element={<OnboardingWizardPage />} />
          <Route path="kyc" element={<KycDashboardPage />} />
          <Route path="kyc/:id" element={<KycReviewPage />} />
          <Route path="segments" element={<SegmentationPage />} />
          <Route path="segments/:code" element={<SegmentDetailPage />} />
          <Route path=":id" element={<Customer360Page />} />
        </Route>

        {/* Accounts */}
        <Route path="/accounts" element={<Outlet />}>
          <Route index element={<AccountListPage />} />
          <Route path="open" element={<AccountOpeningPage />} />
          <Route path="fixed-deposits" element={<FixedDepositListPage />} />
          <Route path="fixed-deposits/new" element={<NewFixedDepositPage />} />
          <Route path="fixed-deposits/:id" element={<FixedDepositDetailPage />} />
          <Route path="goals" element={<GoalListPage />} />
          <Route path="goals/new" element={<NewGoalPage />} />
          <Route path="goals/:id" element={<GoalDetailPage />} />
          <Route path="recurring-deposits" element={<RecurringDepositListPage />} />
          <Route path="recurring-deposits/:id" element={<RecurringDepositDetailPage />} />
          <Route path=":id" element={<AccountDetailPage />} />
          <Route path=":id/maintenance" element={<AccountMaintenancePage />} />
          <Route path="reconciliation" element={<ReconciliationWorkbenchPage />} />
          <Route path="virtual-accounts" element={<VirtualAccountListPage />} />
          <Route path="virtual-accounts/:id" element={<VirtualAccountDetailPage />} />
          <Route path="cash-pooling" element={<CashPoolPage />} />
          <Route path="notional-pooling" element={<NotionalPoolPage />} />
          <Route path="wallets" element={<WalletPage />} />
          <Route path="statements" element={<StatementGeneratorPage />} />
        </Route>

        {/* Lending */}
        <Route path="/lending" element={<Outlet />}>
          <Route index element={<LoanDashboardPage />} />
          <Route path="applications" element={<LoanApplicationListPage />} />
          <Route path="applications/new" element={<LoanApplicationPage />} />
          <Route path="active" element={<ActiveLoansPage />} />
          <Route path=":id" element={<LoanDetailPage />} />
          <Route path=":id/repay" element={<LoanRepaymentPage />} />
          <Route path=":id/restructure" element={<LoanRestructurePage />} />
          <Route path="facilities" element={<FacilityListPage />} />
          <Route path="facilities/:id" element={<FacilityDetailPage />} />
          <Route path="collateral" element={<CollateralRegisterPage />} />
          <Route path="collateral/:id" element={<CollateralDetailPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="mortgages" element={<MortgageListPage />} />
          <Route path="mortgages/:id" element={<MortgageDetailPage />} />
          <Route path="leases" element={<LeaseListPage />} />
          <Route path="leases/:id" element={<LeaseDetailPage />} />
          <Route path="ecl" element={<EclDashboardPage />} />
        </Route>

        {/* Payments */}
        <Route path="/payments" element={<Outlet />}>
          <Route index element={<PaymentsDashboardPage />} />
          <Route path="new" element={<NewTransferPage />} />
          <Route path="history" element={<TransactionSearchPage />} />
          <Route path="standing-orders" element={<StandingOrderListPage />} />
          <Route path="standing-orders/:id" element={<StandingOrderDetailPage />} />
          <Route path="bills" element={<BillPaymentPage />} />
          <Route path="bulk" element={<BulkPaymentPage />} />
          <Route path="international" element={<InternationalTransferPage />} />
          <Route path="cheques" element={<ChequeManagementPage />} />
          <Route path="qr" element={<QrPaymentPage />} />
          <Route path="mobile-money" element={<MobileMoneyPage />} />
        </Route>

        {/* Cards */}
        <Route path="/cards" element={<Outlet />}>
          <Route index element={<CardListPage />} />
          <Route path=":id" element={<CardDetailPage />} />
          <Route path="transactions" element={<CardTransactionsPage />} />
          <Route path="merchants" element={<MerchantListPage />} />
          <Route path="merchants/onboard" element={<MerchantOnboardPage />} />
          <Route path="merchants/:merchantId" element={<MerchantDetailPage />} />
          <Route path="pos" element={<PosTerminalPage />} />
          <Route path="pos/:terminalId" element={<TerminalDetailPage />} />
          <Route path="clearing" element={<CardClearingPage />} />
          <Route path="disputes" element={<CardDisputePage />} />
          <Route path="disputes/:disputeId" element={<CardDisputeDetailPage />} />
          <Route path="request" element={<CardRequestPage />} />
          <Route path="issuance" element={<CardIssuancePage />} />
        </Route>

        {/* Treasury */}
        <Route path="/treasury" element={<Outlet />}>
          <Route index element={<TreasuryHomePage />} />
          <Route path="overview" element={<TreasuryDashboardPage />} />
          <Route path="deals" element={<TreasuryDealsPage />} />
          <Route path="trading-desk" element={<TradingDeskPage />} />
          <Route path="market-making" element={<MarketMakingPage />} />
          <Route path="positions" element={<TreasuryPositionsPage />} />
          <Route path="fx" element={<FxRatesPage />} />
          <Route path="fixed-income" element={<FixedIncomePage />} />
          <Route path="market-data" element={<MarketDataPage />} />
          <Route path="orders" element={<OrderManagementPage />} />
          <Route path="trade-ops" element={<TradeOpsPage />} />
          <Route path="capital-markets" element={<CapitalMarketsPage />} />
        </Route>

        {/* Capital Markets */}
        <Route path="/capital-markets" element={<Outlet />}>
          <Route index element={<CapitalMarketsDashboardPage />} />
          <Route path="trade-ops" element={<CmTradeOpsPage />} />
          <Route path="settlement" element={<CmSettlementPage />} />
          <Route path="custody" element={<CmCustodyPage />} />
          <Route path="positions" element={<SecuritiesPositionPage />} />
          <Route path="models" element={<QuantModelPage />} />
          <Route path="suitability" element={<CmSuitabilityPage />} />
          <Route path="securitization" element={<SecuritizationPage />} />
          <Route path="program-trading" element={<ProgramTradingPage />} />
          <Route path="economic-capital" element={<EconomicCapitalPage />} />
          <Route path="quotes" element={<QuoteManagementPage />} />
          <Route path="valuation" element={<ValuationPage />} />
          <Route path=":id" element={<CapitalMarketsDealDetailPage />} />
        </Route>

        {/* Investments */}
        <Route path="/investments" element={<Outlet />}>
          <Route index element={<InvestmentPortfolioPage />} />
          <Route path="portfolios/:code" element={<PortfolioDetailPage />} />
          <Route path="funds" element={<FundManagementPage />} />
          <Route path="funds/:code" element={<FundDetailPage />} />
        </Route>

        {/* Advisory */}
        <Route path="/advisory" element={<Outlet />}>
          <Route index element={<AdvisoryDashboardPage />} />
          <Route path="corporate-finance" element={<CorporateFinancePage />} />
          <Route path="project-finance" element={<ProjectFinancePage />} />
          <Route path="suitability" element={<SuitabilityPage />} />
        </Route>

        {/* Intelligence */}
        <Route path="/intelligence" element={<Outlet />}>
          <Route index element={<IntelligencePage />} />
        </Route>

        {/* ALM */}
        <Route path="/alm" element={<Outlet />}>
          <Route index element={<AlmDashboardPage />} />
          <Route path="stress-testing" element={<StressTestingPage />} />
          <Route path="liquidity" element={<LiquidityGapPage />} />
          <Route path="alco-report" element={<AlcoReportPage />} />
          <Route path="regulatory" element={<RegulatorySubmissionPage />} />
          <Route path="duration" element={<DurationAnalyticsPage />} />
        </Route>

        {/* Custody */}
        <Route path="/custody" element={<Outlet />}>
          <Route index element={<CustodyHubPage />} />
          <Route path="settlements" element={<CustodySettlementPage />} />
          <Route path="fails" element={<SecuritiesFailsPage />} />
          <Route path="fails/:ref" element={<FailDetailPage />} />
          <Route path="positions" element={<CustodyPositionsPage />} />
          <Route path="positions/:positionId" element={<CustodyPositionDetailPage />} />
          <Route path="counterparties" element={<CounterpartyPage />} />
          <Route path="counterparties/:code" element={<CounterpartyDetailPage />} />
          <Route path="valuations" element={<CustodyValuationPage />} />
          <Route path="valuations/runs/:ref" element={<CustodyValuationRunPage />} />
        </Route>

        {/* Channels */}
        <Route path="/channels" element={<Outlet />}>
          <Route index element={<ChannelManagementPage />} />
        </Route>

        {/* Open Banking */}
        <Route path="/open-banking" element={<Outlet />}>
          <Route index element={<OpenBankingPage />} />
        </Route>

        {/* Acquiring */}
        <Route path="/acquiring" element={<Outlet />}>
          <Route index element={<MerchantAcquiringPage />} />
        </Route>

        {/* Market Data Management */}
        <Route path="/market-data-mgmt" element={<Outlet />}>
          <Route index element={<MarketDataManagementPage />} />
        </Route>

        {/* Risk */}
        <Route path="/risk" element={<Outlet />}>
          <Route index element={<RiskDashboardPage />} />
          <Route path="aml" element={<AmlMonitoringPage />} />
          <Route path="fraud" element={<FraudManagementPage />} />
          <Route path="sanctions" element={<SanctionsScreeningPage />} />
          <Route path="credit" element={<CreditRiskPage />} />
          <Route path="market-liquidity" element={<MarketLiquidityRiskPage />} />
          <Route path="operational" element={<OperationalRiskPage />} />
        </Route>

        {/* Compliance */}
        <Route path="/compliance" element={<Outlet />}>
          <Route index element={<ComplianceHubPage />} />
          <Route path="dashboard" element={<ComplianceDashboardPage />} />
          <Route path="aml" element={<AmlDashboardPage />} />
          <Route path="aml/alerts/:id" element={<AmlAlertDetailPage />} />
          <Route path="sanctions" element={<ComplianceSanctionsPage />} />
          <Route path="sanctions/screenings/:id" element={<ScreeningDetailPage />} />
          <Route path="fraud" element={<FraudDashboardPage />} />
          <Route path="fraud/alerts/:id" element={<FraudAlertDetailPage />} />
          <Route path="returns" element={<RegulatoryReturnsPage />} />
          <Route path="returns/:id" element={<ReturnDetailPage />} />
          <Route path="reports" element={<ComplianceReportsPage />} />
          <Route path="assessments" element={<ComplianceAssessmentsPage />} />
          <Route path="gaps" element={<GapAnalysisPage />} />
          <Route path="definitions" element={<RegulatoryDefinitionsPage />} />
          <Route path="audit" element={<AuditTrailPage />} />
        </Route>

        {/* Operations */}
        <Route path="/operations" element={<Outlet />}>
          <Route index element={<OperationsHomePage />} />
          <Route path="eod" element={<EodConsolePage />} />
          <Route path="gl" element={<GeneralLedgerPage />} />
          <Route path="branches" element={<BranchOpsPage />} />
          <Route path="approvals" element={<ApprovalQueuePage />} />
          <Route path="gateway" element={<GatewayConsolePage />} />
          <Route path="ach" element={<AchOperationsPage />} />
          <Route path="documents" element={<DocumentManagementPage />} />
        </Route>

        {/* Reports */}
        <Route path="/reports" element={<Outlet />}>
          <Route index element={<ReportsHomePage />} />
          <Route path="executive" element={<ExecutiveDashboardPage />} />
          <Route path="financial" element={<FinancialReportsPage />} />
          <Route path="loans" element={<LoanAnalyticsPage />} />
          <Route path="custom" element={<SavedReportsPage />} />
          <Route path="custom/new" element={<CustomReportBuilderPage />} />
          <Route path="custom/:id/view" element={<ReportViewerPage />} />
          <Route path="payments" element={<PaymentAnalyticsPage />} />
          <Route path="deposits" element={<DepositAnalyticsPage />} />
          <Route path="channels" element={<ChannelAnalyticsPage />} />
          <Route path="customers" element={<CustomerAnalyticsPage />} />
          <Route path="treasury" element={<TreasuryAlmReportsPage />} />
          <Route path="marketing" element={<MarketingAnalyticsPage />} />
          <Route path="operations" element={<OperationalReportsPage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<Outlet />}>
          <Route index element={<AdminHomePage />} />
          <Route path="users" element={<UserAdminPage />} />
          <Route path="parameters" element={<SystemParametersPage />} />
          <Route path="products" element={<ProductFactoryPage />} />
          <Route path="products/new" element={<ProductCreatePage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="fees" element={<FeeScheduleListPage />} />
          <Route path="fees/new" element={<NewFeeDefinitionPage />} />
          <Route path="fees/:id" element={<FeeDefinitionDetailPage />} />
          <Route path="providers" element={<ServiceProviderPage />} />
          <Route path="providers/:id" element={<ProviderDetailPage />} />
          <Route path="notifications" element={<NotificationManagementPage />} />
          <Route path="campaigns" element={<CampaignManagementPage />} />
          <Route path="commissions" element={<CommissionManagementPage />} />
          <Route path="loyalty" element={<LoyaltyProgramPage />} />
          <Route path="pricing" element={<PricingManagementPage />} />
          <Route path="sales" element={<SalesManagementPage />} />
          <Route path="surveys" element={<SurveyManagementPage />} />
          <Route path="governance" element={<GovernancePage />} />
        </Route>

        {/* Agreements */}
        <Route path="/agreements" element={<Outlet />}>
          <Route index element={<AgreementsHubPage />} />
          <Route path="list" element={<AgreementListPage />} />
          <Route path="new" element={<AgreementCreatePage />} />
          <Route path=":id" element={<AgreementDetailPage />} />
          <Route path=":id/edit" element={<AgreementEditPage />} />
          <Route path="td-frameworks" element={<TdFrameworkListPage />} />
          <Route path="td-frameworks/:number" element={<TdFrameworkDetailPage />} />
          <Route path="td-summary" element={<TdSummaryDashboardPage />} />
          <Route path="commissions" element={<CommissionAgreementsPage />} />
          <Route path="commissions/:code" element={<CommissionDetailPage />} />
          <Route path="pricing" element={<PricingDashboardPage />} />
        </Route>

        {/* Communications */}
        <Route path="/communications" element={<Outlet />}>
          <Route index element={<CommunicationCenterPage />} />
          <Route path="templates" element={<TemplateManagementPage />} />
          <Route path="templates/:id" element={<TemplateDetailPage />} />
          <Route path="contact-center" element={<ContactCenterPage />} />
          <Route path="contact-center/agent" element={<AgentDashboardPage />} />
          <Route path="contact-center/agent/:agentId" element={<AgentDetailPage />} />
          <Route path="contact-center/agent-console" element={<AgentWorkbenchPage />} />
          <Route path="routing" element={<RoutingRulesPage />} />
          <Route path="channels" element={<ChannelConfigPage />} />
          <Route path="preferences" element={<CommsPreferencesPage />} />
        </Route>

        {/* Cases */}
        <Route path="/cases" element={<Outlet />}>
          <Route index element={<CaseListPage />} />
          <Route path="new" element={<NewCasePage />} />
          <Route path=":id" element={<CaseDetailPage />} />
        </Route>

        {/* Wealth & Trust */}
        <Route path="/wealth" element={<Outlet />}>
          <Route index element={<WealthManagementPage />} />
          <Route path=":code" element={<WealthPlanDetailPage />} />
        </Route>

        {/* Trade Finance */}
        <Route path="/trade-finance" element={<Outlet />}>
          <Route index element={<TradeFinanceHubPage />} />
          <Route path="legacy" element={<TradeFinancePage />} />
        </Route>

        {/* Syndication */}
        <Route path="/lending/syndication" element={<SyndicationPage />} />

        {/* Contact Center (top-level) */}
        <Route path="/contact-center" element={<Outlet />}>
          <Route index element={<ContactCenterPage />} />
          <Route path="agent" element={<AgentDashboardPage />} />
          <Route path="agent/:id" element={<AgentWorkbenchPage />} />
          <Route path="queues" element={<QueueDashboardPage />} />
          <Route path="callbacks" element={<CallbackPage />} />
          <Route path="ivr" element={<IvrManagerPage />} />
          <Route path="help" element={<KnowledgeBasePage />} />
          <Route path="chat" element={<ChatSessionsPage />} />
        </Route>

        {/* Contact Center legacy alias */}
        <Route path="/operations/contact-center" element={<ContactCenterPage />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationCenterPage />} />

        {/* Error pages */}
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/error" element={<ServerErrorPage />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPageFull />} />
      </Route>
        {/* Customer Self-Service Portal — separate layout, no sidebar */}
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="dashboard" element={<PortalDashboard />} />
          <Route path="profile" element={<PortalProfilePage />} />
          <Route path="accounts" element={<PortalAccountsPage />} />
          <Route path="transfer" element={<PortalTransferPage />} />
          <Route path="beneficiaries" element={<PortalBeneficiariesPage />} />
          <Route path="cards" element={<PortalCardControlsPage />} />
          <Route path="requests" element={<PortalServiceRequestsPage />} />
          <Route path="notifications" element={<PortalNotificationsPage />} />
        </Route>
    </Routes>
    </>
  );
}
