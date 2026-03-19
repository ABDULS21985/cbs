import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

function lazyNamed<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
): LazyExoticComponent<ComponentType<any>> {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<any> };
  });
}

export const FixedDepositListPage = lazyNamed(
  () => import('@/features/deposits/pages/FixedDepositListPage'),
  'FixedDepositListPage',
);
export const NewFixedDepositPage = lazyNamed(
  () => import('@/features/deposits/pages/NewFixedDepositPage'),
  'NewFixedDepositPage',
);
export const FixedDepositDetailPage = lazyNamed(
  () => import('@/features/deposits/pages/FixedDepositDetailPage'),
  'FixedDepositDetailPage',
);

export const ReconciliationWorkbenchPage = lazyNamed(
  () => import('@/features/reconciliation/pages/ReconciliationWorkbenchPage'),
  'ReconciliationWorkbenchPage',
);
export const VirtualAccountListPage = lazyNamed(
  () => import('@/features/accounts/pages/VirtualAccountListPage'),
  'VirtualAccountListPage',
);
export const VirtualAccountDetailPage = lazyNamed(
  () => import('@/features/accounts/pages/VirtualAccountDetailPage'),
  'VirtualAccountDetailPage',
);
export const CashPoolPage = lazyNamed(
  () => import('@/features/accounts/pages/CashPoolPage'),
  'CashPoolPage',
);
export const StatementGeneratorPage = lazyNamed(
  () => import('@/features/statements/pages/StatementGeneratorPage'),
  'StatementGeneratorPage',
);

export const FeeScheduleListPage = lazyNamed(
  () => import('@/features/fees/pages/FeeScheduleListPage'),
  'FeeScheduleListPage',
);
export const FeeDefinitionDetailPage = lazyNamed(
  () => import('@/features/fees/pages/FeeDefinitionDetailPage'),
  'FeeDefinitionDetailPage',
);
export const NewFeeDefinitionPage = lazyNamed(
  () => import('@/features/fees/pages/NewFeeDefinitionPage'),
  'NewFeeDefinitionPage',
);

export const ProductFactoryPage = lazyNamed(
  () => import('@/features/admin/pages/ProductFactoryPage'),
  'ProductFactoryPage',
);
export const ProductCreatePage = lazyNamed(
  () => import('@/features/admin/pages/ProductCreatePage'),
  'ProductCreatePage',
);
export const ProductDetailPage = lazyNamed(
  () => import('@/features/admin/pages/ProductDetailPage'),
  'ProductDetailPage',
);
export const UserAdminPage = lazyNamed(
  () => import('@/features/admin/pages/UserAdminPage'),
  'UserAdminPage',
);
export const SystemParametersPage = lazyNamed(
  () => import('@/features/admin/pages/SystemParametersPage'),
  'SystemParametersPage',
);
export const ServiceProviderPage = lazyNamed(
  () => import('@/features/admin/pages/ServiceProviderPage'),
  'ServiceProviderPage',
);
export const ProviderDetailPage = lazyNamed(
  () => import('@/features/admin/pages/ProviderDetailPage'),
  'ProviderDetailPage',
);

export const NotificationCenterPage = lazyNamed(
  () => import('@/features/notifications/pages/NotificationCenterPage'),
  'NotificationCenterPage',
);
export const TransactionSearchPage = lazyNamed(
  () => import('@/features/transactions/pages/TransactionSearchPage'),
  'TransactionSearchPage',
);

export const GoalListPage = lazyNamed(
  () => import('@/features/goals/pages/GoalListPage'),
  'GoalListPage',
);
export const GoalDetailPage = lazyNamed(
  () => import('@/features/goals/pages/GoalDetailPage'),
  'GoalDetailPage',
);
export const NewGoalPage = lazyNamed(
  () => import('@/features/goals/pages/NewGoalPage'),
  'NewGoalPage',
);
export const RecurringDepositListPage = lazyNamed(
  () => import('@/features/goals/pages/RecurringDepositListPage'),
  'RecurringDepositListPage',
);
export const RecurringDepositDetailPage = lazyNamed(
  () => import('@/features/goals/pages/RecurringDepositDetailPage'),
  'RecurringDepositDetailPage',
);

export const AgreementListPage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementListPage'),
  'AgreementListPage',
);
export const AgreementDetailPage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementDetailPage'),
  'AgreementDetailPage',
);

export const CommunicationCenterPage = lazyNamed(
  () => import('@/features/communications/pages/CommunicationCenterPage'),
  'CommunicationCenterPage',
);
export const TemplateManagementPage = lazyNamed(
  () => import('@/features/communications/pages/TemplateManagementPage'),
  'TemplateManagementPage',
);

export const CaseListPage = lazyNamed(
  () => import('@/features/cases/pages/CaseListPage'),
  'CaseListPage',
);
export const CaseDetailPage = lazyNamed(
  () => import('@/features/cases/pages/CaseDetailPage'),
  'CaseDetailPage',
);
export const NewCasePage = lazyNamed(
  () => import('@/features/cases/pages/NewCasePage'),
  'NewCasePage',
);

export const PortalDashboard = lazyNamed(
  () => import('@/features/portal/pages/PortalDashboard'),
  'PortalDashboard',
);
export const PortalProfilePage = lazyNamed(
  () => import('@/features/portal/pages/PortalProfilePage'),
  'PortalProfilePage',
);
export const PortalAccountsPage = lazyNamed(
  () => import('@/features/portal/pages/PortalAccountsPage'),
  'PortalAccountsPage',
);
export const PortalTransferPage = lazyNamed(
  () => import('@/features/portal/pages/PortalTransferPage'),
  'PortalTransferPage',
);
export const PortalBeneficiariesPage = lazyNamed(
  () => import('@/features/portal/pages/PortalBeneficiariesPage'),
  'PortalBeneficiariesPage',
);
export const PortalCardControlsPage = lazyNamed(
  () => import('@/features/portal/pages/PortalCardControlsPage'),
  'PortalCardControlsPage',
);
export const PortalServiceRequestsPage = lazyNamed(
  () => import('@/features/portal/pages/PortalServiceRequestsPage'),
  'PortalServiceRequestsPage',
);

export const NewTransferPage = lazyNamed(
  () => import('@/features/payments/pages/NewTransferPage'),
  'NewTransferPage',
);
export const BulkPaymentPage = lazyNamed(
  () => import('@/features/payments/pages/BulkPaymentPage'),
  'BulkPaymentPage',
);
export const StandingOrderListPage = lazyNamed(
  () => import('@/features/payments/pages/StandingOrderListPage'),
  'StandingOrderListPage',
);
export const StandingOrderDetailPage = lazyNamed(
  () => import('@/features/payments/pages/StandingOrderDetailPage'),
  'StandingOrderDetailPage',
);
export const BillPaymentPage = lazyNamed(
  () => import('@/features/payments/pages/BillPaymentPage'),
  'BillPaymentPage',
);
export const InternationalTransferPage = lazyNamed(
  () => import('@/features/payments/pages/InternationalTransferPage'),
  'InternationalTransferPage',
);
export const ChequeManagementPage = lazyNamed(
  () => import('@/features/payments/pages/ChequeManagementPage'),
  'ChequeManagementPage',
);
export const QrPaymentPage = lazyNamed(
  () => import('@/features/payments/pages/QrPaymentPage'),
  'QrPaymentPage',
);
export const MobileMoneyPage = lazyNamed(
  () => import('@/features/payments/pages/MobileMoneyPage'),
  'MobileMoneyPage',
);
export const AchOperationsPage = lazy(() => import('@/features/payments/pages/AchOperationsPage'));

export const CardListPage = lazyNamed(
  () => import('@/features/cards/pages/CardListPage'),
  'CardListPage',
);
export const CardDetailPage = lazyNamed(
  () => import('@/features/cards/pages/CardDetailPage'),
  'CardDetailPage',
);
export const CardTransactionsPage = lazyNamed(
  () => import('@/features/cards/pages/CardTransactionsPage'),
  'CardTransactionsPage',
);
export const MerchantListPage = lazyNamed(
  () => import('@/features/cards/pages/MerchantListPage'),
  'MerchantListPage',
);
export const PosTerminalPage = lazyNamed(
  () => import('@/features/cards/pages/PosTerminalPage'),
  'PosTerminalPage',
);
export const CardClearingPage = lazyNamed(
  () => import('@/features/cards/pages/CardClearingPage'),
  'CardClearingPage',
);

export const LoanDashboardPage = lazyNamed(
  () => import('@/features/lending/pages/LoanDashboardPage'),
  'LoanDashboardPage',
);
export const LoanApplicationListPage = lazyNamed(
  () => import('@/features/lending/pages/LoanApplicationListPage'),
  'LoanApplicationListPage',
);
export const LoanApplicationPage = lazyNamed(
  () => import('@/features/lending/pages/LoanApplicationPage'),
  'LoanApplicationPage',
);
export const ActiveLoansPage = lazyNamed(
  () => import('@/features/lending/pages/ActiveLoansPage'),
  'ActiveLoansPage',
);
export const LoanDetailPage = lazyNamed(
  () => import('@/features/lending/pages/LoanDetailPage'),
  'LoanDetailPage',
);
export const LoanRepaymentPage = lazyNamed(
  () => import('@/features/lending/pages/LoanRepaymentPage'),
  'LoanRepaymentPage',
);
export const LoanRestructurePage = lazyNamed(
  () => import('@/features/lending/pages/LoanRestructurePage'),
  'LoanRestructurePage',
);
export const FacilityListPage = lazyNamed(
  () => import('@/features/lending/pages/FacilityListPage'),
  'FacilityListPage',
);
export const FacilityDetailPage = lazyNamed(
  () => import('@/features/lending/pages/FacilityDetailPage'),
  'FacilityDetailPage',
);
export const CollateralRegisterPage = lazyNamed(
  () => import('@/features/lending/pages/CollateralRegisterPage'),
  'CollateralRegisterPage',
);
export const CollateralDetailPage = lazyNamed(
  () => import('@/features/lending/pages/CollateralDetailPage'),
  'CollateralDetailPage',
);
export const CollectionsPage = lazy(() => import('@/features/lending/pages/CollectionsPage'));
export const EclDashboardPage = lazy(() => import('@/features/lending/pages/EclDashboardPage'));
export const MortgageListPage = lazy(() => import('@/features/lending/pages/MortgageListPage'));
export const MortgageDetailPage = lazy(() => import('@/features/lending/pages/MortgageDetailPage'));
export const LeaseListPage = lazy(() => import('@/features/lending/pages/LeaseListPage'));
export const LeaseDetailPage = lazy(() => import('@/features/lending/pages/LeaseDetailPage'));
export const SyndicationPage = lazyNamed(
  () => import('@/features/lending/pages/SyndicationPage'),
  'SyndicationPage',
);

export const FixedIncomePage = lazyNamed(
  () => import('@/features/treasury/pages/FixedIncomePage'),
  'FixedIncomePage',
);
export const MarketDataPage = lazyNamed(
  () => import('@/features/treasury/pages/MarketDataPage'),
  'MarketDataPage',
);
export const OrderManagementPage = lazyNamed(
  () => import('@/features/treasury/pages/OrderManagementPage'),
  'OrderManagementPage',
);
export const TradeOpsPage = lazyNamed(
  () => import('@/features/treasury/pages/TradeOpsPage'),
  'TradeOpsPage',
);
export const CapitalMarketsPage = lazyNamed(
  () => import('@/features/treasury/pages/CapitalMarketsPage'),
  'CapitalMarketsPage',
);

export const RiskDashboardPage = lazyNamed(
  () => import('@/features/risk/pages/RiskDashboardPage'),
  'RiskDashboardPage',
);
export const AmlMonitoringPage = lazyNamed(
  () => import('@/features/risk/pages/AmlMonitoringPage'),
  'AmlMonitoringPage',
);
export const FraudManagementPage = lazyNamed(
  () => import('@/features/risk/pages/FraudManagementPage'),
  'FraudManagementPage',
);
export const SanctionsScreeningPage = lazyNamed(
  () => import('@/features/risk/pages/SanctionsScreeningPage'),
  'SanctionsScreeningPage',
);
export const CreditRiskPage = lazyNamed(
  () => import('@/features/risk/pages/CreditRiskPage'),
  'CreditRiskPage',
);
export const MarketLiquidityRiskPage = lazyNamed(
  () => import('@/features/risk/pages/MarketLiquidityRiskPage'),
  'MarketLiquidityRiskPage',
);
export const OperationalRiskPage = lazyNamed(
  () => import('@/features/risk/pages/OperationalRiskPage'),
  'OperationalRiskPage',
);

export const RegulatoryReturnsPage = lazyNamed(
  () => import('@/features/compliance/pages/RegulatoryReturnsPage'),
  'RegulatoryReturnsPage',
);
export const ReturnDetailPage = lazyNamed(
  () => import('@/features/compliance/pages/ReturnDetailPage'),
  'ReturnDetailPage',
);
export const ComplianceDashboardPage = lazyNamed(
  () => import('@/features/compliance/pages/ComplianceDashboardPage'),
  'ComplianceDashboardPage',
);
export const AuditTrailPage = lazyNamed(
  () => import('@/features/compliance/pages/AuditTrailPage'),
  'AuditTrailPage',
);

export const GatewayConsolePage = lazyNamed(
  () => import('@/features/gateway/pages/GatewayConsolePage'),
  'GatewayConsolePage',
);
export const EodConsolePage = lazyNamed(
  () => import('@/features/operations/pages/EodConsolePage'),
  'EodConsolePage',
);
export const GeneralLedgerPage = lazyNamed(
  () => import('@/features/operations/pages/GeneralLedgerPage'),
  'GeneralLedgerPage',
);
export const BranchOpsPage = lazyNamed(
  () => import('@/features/operations/pages/BranchOpsPage'),
  'BranchOpsPage',
);
export const DocumentManagementPage = lazyNamed(
  () => import('@/features/operations/pages/DocumentManagementPage'),
  'DocumentManagementPage',
);

export const ExecutiveDashboardPage = lazyNamed(
  () => import('@/features/reports/pages/ExecutiveDashboardPage'),
  'ExecutiveDashboardPage',
);
export const FinancialReportsPage = lazyNamed(
  () => import('@/features/reports/pages/FinancialReportsPage'),
  'FinancialReportsPage',
);
export const LoanAnalyticsPage = lazyNamed(
  () => import('@/features/reports/pages/LoanAnalyticsPage'),
  'LoanAnalyticsPage',
);
export const SavedReportsPage = lazyNamed(
  () => import('@/features/reports/pages/SavedReportsPage'),
  'SavedReportsPage',
);
export const CustomReportBuilderPage = lazyNamed(
  () => import('@/features/reports/pages/CustomReportBuilderPage'),
  'CustomReportBuilderPage',
);
export const ReportViewerPage = lazyNamed(
  () => import('@/features/reports/pages/ReportViewerPage'),
  'ReportViewerPage',
);
export const PaymentAnalyticsPage = lazyNamed(
  () => import('@/features/reports/pages/PaymentAnalyticsPage'),
  'PaymentAnalyticsPage',
);
export const DepositAnalyticsPage = lazyNamed(
  () => import('@/features/reports/pages/DepositAnalyticsPage'),
  'DepositAnalyticsPage',
);
export const ChannelAnalyticsPage = lazyNamed(
  () => import('@/features/reports/pages/ChannelAnalyticsPage'),
  'ChannelAnalyticsPage',
);
export const CustomerAnalyticsPage = lazyNamed(
  () => import('@/features/reports/pages/CustomerAnalyticsPage'),
  'CustomerAnalyticsPage',
);
export const TreasuryAlmReportsPage = lazyNamed(
  () => import('@/features/reports/pages/TreasuryAlmReportsPage'),
  'TreasuryAlmReportsPage',
);
export const MarketingAnalyticsPage = lazyNamed(
  () => import('@/features/reports/pages/MarketingAnalyticsPage'),
  'MarketingAnalyticsPage',
);
export const OperationalReportsPage = lazyNamed(
  () => import('@/features/reports/pages/OperationalReportsPage'),
  'OperationalReportsPage',
);

export const WealthManagementPage = lazyNamed(
  () => import('@/features/wealth/pages/WealthManagementPage'),
  'WealthManagementPage',
);
export const WealthPlanDetailPage = lazyNamed(
  () => import('@/features/wealth/pages/WealthPlanDetailPage'),
  'WealthPlanDetailPage',
);
export const TradeFinancePage = lazyNamed(
  () => import('@/features/tradefinance/pages/TradeFinancePage'),
  'TradeFinancePage',
);
export const ContactCenterPage = lazyNamed(
  () => import('@/features/contactcenter/pages/ContactCenterPage'),
  'ContactCenterPage',
);

export const ComplianceReportsPage = lazyNamed(
  () => import('@/features/compliance/pages/ComplianceReportsPage'),
  'ComplianceReportsPage',
);

export const ApprovalQueuePage = lazyNamed(
  () => import('@/features/operations/pages/ApprovalQueuePage'),
  'ApprovalQueuePage',
);

export const OperationsHomePage = lazyNamed(
  () => import('@/features/operations/pages/OperationsHomePage'),
  'OperationsHomePage',
);

export const TreasuryHomePage = lazyNamed(
  () => import('@/features/treasury/pages/TreasuryHomePage'),
  'TreasuryHomePage',
);

export const TreasuryDashboardPage = lazyNamed(
  () => import('@/features/treasury/pages/TreasuryDashboardPage'),
  'TreasuryDashboardPage',
);
export const TreasuryDealsPage = lazyNamed(
  () => import('@/features/treasury/pages/TreasuryDealsPage'),
  'TreasuryDealsPage',
);
export const TradingDeskPage = lazyNamed(
  () => import('@/features/treasury/pages/TradingDeskPage'),
  'TradingDeskPage',
);
export const MarketMakingPage = lazyNamed(
  () => import('@/features/treasury/pages/MarketMakingPage'),
  'MarketMakingPage',
);

export const CapitalMarketsDashboardPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/CapitalMarketsDashboardPage'),
  'CapitalMarketsDashboardPage',
);
export const CapitalMarketsDealDetailPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/DealDetailPage'),
  'DealDetailPage',
);

export const InvestmentPortfolioPage = lazyNamed(
  () => import('@/features/investments/pages/InvestmentPortfolioPage'),
  'InvestmentPortfolioPage',
);
export const FundManagementPage = lazyNamed(
  () => import('@/features/investments/pages/FundManagementPage'),
  'FundManagementPage',
);

export const AdvisoryDashboardPage = lazyNamed(
  () => import('@/features/advisory/pages/AdvisoryDashboardPage'),
  'AdvisoryDashboardPage',
);
export const CorporateFinancePage = lazyNamed(
  () => import('@/features/advisory/pages/CorporateFinancePage'),
  'CorporateFinancePage',
);
export const ProjectFinancePage = lazyNamed(
  () => import('@/features/advisory/pages/ProjectFinancePage'),
  'ProjectFinancePage',
);
export const SuitabilityPage = lazyNamed(
  () => import('@/features/advisory/pages/SuitabilityPage'),
  'SuitabilityPage',
);

export const IntelligencePage = lazyNamed(
  () => import('@/features/intelligence/pages/IntelligencePage'),
  'IntelligencePage',
);

export const AlmDashboardPage = lazyNamed(
  () => import('@/features/alm/pages/AlmDashboardPage'),
  'AlmDashboardPage',
);

export const CustodySettlementPage = lazyNamed(
  () => import('@/features/custody/pages/CustodySettlementPage'),
  'CustodySettlementPage',
);

export const ChannelManagementPage = lazyNamed(
  () => import('@/features/channels/pages/ChannelManagementPage'),
  'ChannelManagementPage',
);

export const OpenBankingPage = lazyNamed(
  () => import('@/features/openbanking/pages/OpenBankingPage'),
  'OpenBankingPage',
);

export const MerchantAcquiringPage = lazyNamed(
  () => import('@/features/acquiring/pages/MerchantAcquiringPage'),
  'MerchantAcquiringPage',
);

export const MarketDataManagementPage = lazyNamed(
  () => import('@/features/marketdata/pages/MarketDataManagementPage'),
  'MarketDataManagementPage',
);

export const TradeFinanceHubPage = lazyNamed(
  () => import('@/features/tradefinance/pages/TradeFinanceHubPage'),
  'TradeFinanceHubPage',
);
