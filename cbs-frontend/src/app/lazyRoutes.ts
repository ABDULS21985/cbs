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

export const SegmentDetailPage = lazyNamed(
  () => import('@/features/customers/pages/SegmentDetailPage'),
  'SegmentDetailPage',
);

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
export const DepositOperationsPage = lazyNamed(
  () => import('@/features/deposits/pages/DepositOperationsPage'),
  'DepositOperationsPage',
);
export const DepositDashboardPage = lazyNamed(
  () => import('@/features/deposits/pages/DepositDashboardPage'),
  'DepositDashboardPage',
);
export const EscrowListPage = lazyNamed(
  () => import('@/features/deposits/pages/escrow/EscrowListPage'),
  'EscrowListPage',
);
export const EscrowDetailPage = lazyNamed(
  () => import('@/features/deposits/pages/escrow/EscrowDetailPage'),
  'EscrowDetailPage',
);
export const NewEscrowPage = lazyNamed(
  () => import('@/features/deposits/pages/escrow/NewEscrowPage'),
  'NewEscrowPage',
);

export const TransactionPostingPage = lazyNamed(
  () => import('@/features/accounts/pages/TransactionPostingPage'),
  'TransactionPostingPage',
);
export const ProductCatalogPage = lazyNamed(
  () => import('@/features/accounts/pages/ProductCatalogPage'),
  'ProductCatalogPage',
);
export const InterestOperationsPage = lazyNamed(
  () => import('@/features/accounts/pages/InterestOperationsPage'),
  'InterestOperationsPage',
);

export const ReconciliationWorkbenchPage = lazyNamed(
  () => import('@/features/reconciliation/pages/ReconciliationWorkbenchPage'),
  'ReconciliationWorkbenchPage',
);
export const ReconciliationDashboardPage = lazyNamed(
  () => import('@/features/reconciliation/pages/ReconciliationDashboardPage'),
  'ReconciliationDashboardPage',
);
export const NostroPositionsPage = lazyNamed(
  () => import('@/features/reconciliation/pages/NostroPositionsPage'),
  'NostroPositionsPage',
);
export const CorrespondentBankPage = lazyNamed(
  () => import('@/features/reconciliation/pages/CorrespondentBankPage'),
  'CorrespondentBankPage',
);
export const StatementImportPage = lazyNamed(
  () => import('@/features/reconciliation/pages/StatementImportPage'),
  'StatementImportPage',
);
export const BreakManagementPage = lazyNamed(
  () => import('@/features/reconciliation/pages/BreakManagementPage'),
  'BreakManagementPage',
);
export const ReconciliationReportsPage = lazyNamed(
  () => import('@/features/reconciliation/pages/ReconciliationReportsPage'),
  'ReconciliationReportsPage',
);
export const NostroPositionDetailPage = lazyNamed(
  () => import('@/features/reconciliation/pages/NostroPositionDetailPage'),
  'NostroPositionDetailPage',
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
export const NotionalPoolPage = lazyNamed(
  () => import('@/features/accounts/pages/NotionalPoolPage'),
  'NotionalPoolPage',
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
export const FeeWaiverDashboardPage = lazyNamed(
  () => import('@/features/fees/pages/FeeWaiverDashboardPage'),
  'FeeWaiverDashboardPage',
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
export const ComposeNotificationPage = lazyNamed(
  () => import('@/features/notifications/pages/ComposeNotificationPage'),
  'ComposeNotificationPage',
);
export const NotificationPreferencesPage = lazyNamed(
  () => import('@/features/notifications/pages/NotificationPreferencesPage'),
  'NotificationPreferencesPage',
);
export const TransactionSearchPage = lazyNamed(
  () => import('@/features/transactions/pages/TransactionSearchPage'),
  'TransactionSearchPage',
);
export const TransactionAnalyticsPage = lazyNamed(
  () => import('@/features/transactions/pages/TransactionAnalyticsPage'),
  'TransactionAnalyticsPage',
);
export const TransactionDisputePage = lazyNamed(
  () => import('@/features/transactions/pages/TransactionDisputePage'),
  'TransactionDisputePage',
);
export const TransactionCompliancePage = lazyNamed(
  () => import('@/features/transactions/pages/TransactionCompliancePage'),
  'TransactionCompliancePage',
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
export const PfmDashboardPage = lazyNamed(
  () => import('@/features/goals/pages/PfmDashboardPage'),
  'PfmDashboardPage',
);
export const RecurringDepositListPage = lazyNamed(
  () => import('@/features/goals/pages/RecurringDepositListPage'),
  'RecurringDepositListPage',
);
export const RecurringDepositDetailPage = lazyNamed(
  () => import('@/features/goals/pages/RecurringDepositDetailPage'),
  'RecurringDepositDetailPage',
);
export const NewRecurringDepositPage = lazyNamed(
  () => import('@/features/goals/pages/NewRecurringDepositPage'),
  'NewRecurringDepositPage',
);
export const GoalAnalyticsPage = lazyNamed(
  () => import('@/features/goals/pages/GoalAnalyticsPage'),
  'GoalAnalyticsPage',
);

export const AgreementListPage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementListPage'),
  'AgreementListPage',
);
export const AgreementDetailPage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementDetailPage'),
  'AgreementDetailPage',
);
export const TdFrameworkListPage = lazyNamed(
  () => import('@/features/agreements/pages/TdFrameworkListPage'),
  'TdFrameworkListPage',
);
export const TdFrameworkDetailPage = lazyNamed(
  () => import('@/features/agreements/pages/TdFrameworkDetailPage'),
  'TdFrameworkDetailPage',
);
export const TdSummaryDashboardPage = lazyNamed(
  () => import('@/features/agreements/pages/TdSummaryDashboardPage'),
  'TdSummaryDashboardPage',
);
export const CommissionAgreementsPage = lazyNamed(
  () => import('@/features/agreements/pages/CommissionAgreementsPage'),
  'CommissionAgreementsPage',
);
export const CommissionDetailPage = lazyNamed(
  () => import('@/features/agreements/pages/CommissionDetailPage'),
  'CommissionDetailPage',
);
export const AgreementCreatePage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementCreatePage'),
  'AgreementCreatePage',
);
export const AgreementEditPage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementEditPage'),
  'AgreementEditPage',
);
export const AgreementsHubPage = lazyNamed(
  () => import('@/features/agreements/pages/AgreementsHubPage'),
  'AgreementsHubPage',
);
export const PricingDashboardPage = lazyNamed(
  () => import('@/features/agreements/pages/PricingDashboardPage'),
  'PricingDashboardPage',
);

export const CommunicationCenterPage = lazyNamed(
  () => import('@/features/communications/pages/CommunicationCenterPage'),
  'CommunicationCenterPage',
);
export const TemplateManagementPage = lazyNamed(
  () => import('@/features/communications/pages/TemplateManagementPage'),
  'TemplateManagementPage',
);
export const TemplateDetailPage = lazyNamed(
  () => import('@/features/communications/pages/TemplateDetailPage'),
  'TemplateDetailPage',
);
export const AgentDashboardPage = lazyNamed(
  () => import('@/features/contactcenter/pages/AgentDashboardPage'),
  'AgentDashboardPage',
);
export const RoutingRulesPage = lazyNamed(
  () => import('@/features/communications/pages/RoutingRulesPage'),
  'RoutingRulesPage',
);
export const ChannelConfigPage = lazyNamed(
  () => import('@/features/communications/pages/ChannelConfigPage'),
  'ChannelConfigPage',
);
export const CommsPreferencesPage = lazyNamed(
  () => import('@/features/communications/pages/PreferencesPage'),
  'PreferencesPage',
);
export const PortalNotificationsPage = lazyNamed(
  () => import('@/features/communications/pages/PortalNotificationsPage'),
  'PortalNotificationsPage',
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
export const RcaPage = lazyNamed(
  () => import('@/features/cases/pages/RcaPage'),
  'RcaPage',
);
export const RcaDashboardPage = lazyNamed(
  () => import('@/features/cases/pages/RcaDashboardPage'),
  'RcaDashboardPage',
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
export const PortalSelfServiceNotificationsPage = lazyNamed(
  () => import('@/features/portal/pages/PortalNotificationsPage'),
  'PortalNotificationsPage',
);
export const PortalHelpPage = lazyNamed(
  () => import('@/features/portal/pages/PortalHelpPage'),
  'PortalHelpPage',
);
export const PortalBillPaymentPage = lazyNamed(
  () => import('@/features/portal/pages/PortalBillPaymentPage'),
  'PortalBillPaymentPage',
);
export const PortalAirtimePage = lazyNamed(
  () => import('@/features/portal/pages/PortalAirtimePage'),
  'PortalAirtimePage',
);
export const PortalTransferHistoryPage = lazyNamed(
  () => import('@/features/portal/pages/PortalTransferHistoryPage'),
  'PortalTransferHistoryPage',
);
export const PortalAdminProfileUpdatesPage = lazyNamed(
  () => import('@/features/portal/pages/PortalAdminProfileUpdatesPage'),
  'PortalAdminProfileUpdatesPage',
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
export const MortgageOriginationPage = lazyNamed(
  () => import('@/features/lending/pages/MortgageOriginationPage'),
  'MortgageOriginationPage',
);
export const LeaseListPage = lazy(() => import('@/features/lending/pages/LeaseListPage'));
export const LeaseDetailPage = lazy(() => import('@/features/lending/pages/LeaseDetailPage'));
export const LeasedAssetPage = lazyNamed(
  () => import('@/features/lending/pages/LeasedAssetPage'),
  'LeasedAssetPage',
);
export const CorporateLeasePage = lazyNamed(
  () => import('@/features/lending/pages/CorporateLeasePage'),
  'CorporateLeasePage',
);
export const SyndicationPage = lazyNamed(
  () => import('@/features/lending/pages/SyndicationPage'),
  'SyndicationPage',
);
export const SyndicationDetailPage = lazyNamed(
  () => import('@/features/lending/pages/SyndicationDetailPage'),
  'SyndicationDetailPage',
);
export const PosLendingPage = lazyNamed(
  () => import('@/features/lending/pages/PosLendingPage'),
  'PosLendingPage',
);
export const CreditMarginPage = lazyNamed(
  () => import('@/features/lending/pages/CreditMarginPage'),
  'CreditMarginPage',
);
export const CollectionCaseDetailPage = lazyNamed(
  () => import('@/features/lending/pages/CollectionCaseDetailPage'),
  'CollectionCaseDetailPage',
);
export const EclParameterPage = lazyNamed(
  () => import('@/features/lending/pages/EclParameterPage'),
  'EclParameterPage',
);
export const CreditRiskDashboardPage = lazy(() => import('@/features/lending/pages/CreditRiskDashboardPage'));

export const FixedIncomePage = lazyNamed(
  () => import('@/features/treasury/pages/FixedIncomePage'),
  'FixedIncomePage',
);
export const FtpPage = lazyNamed(
  () => import('@/features/treasury/pages/FtpPage'),
  'FtpPage',
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
export const FraudDashboardPage = lazyNamed(
  () => import('@/features/compliance/pages/FraudDashboardPage'),
  'FraudDashboardPage',
);
export const FraudAlertDetailPage = lazyNamed(
  () => import('@/features/compliance/pages/FraudAlertDetailPage'),
  'FraudAlertDetailPage',
);

export const GatewayConsolePage = lazyNamed(
  () => import('@/features/gateway/pages/GatewayConsolePage'),
  'GatewayConsolePage',
);
export const GatewayDetailPage = lazyNamed(
  () => import('@/features/gateway/pages/GatewayDetailPage'),
  'GatewayDetailPage',
);
export const MessageDetailPage = lazyNamed(
  () => import('@/features/gateway/pages/MessageDetailPage'),
  'MessageDetailPage',
);
export const GatewayOpenBankingPage = lazyNamed(
  () => import('@/features/gateway/pages/OpenBankingPage'),
  'OpenBankingPage',
);
export const GatewayPsd2Page = lazyNamed(
  () => import('@/features/gateway/pages/Psd2CompliancePage'),
  'Psd2CompliancePage',
);
export const IntegrationHubPage = lazyNamed(
  () => import('@/features/gateway/pages/IntegrationHubPage'),
  'IntegrationHubPage',
);
export const Iso20022Page = lazyNamed(
  () => import('@/features/gateway/pages/Iso20022Page'),
  'Iso20022Page',
);
export const ApiMarketplacePage = lazyNamed(
  () => import('@/features/gateway/pages/ApiMarketplacePage'),
  'ApiMarketplacePage',
);
export const GatewayHubPage = lazyNamed(
  () => import('@/features/gateway/pages/GatewayHubPage'),
  'GatewayHubPage',
);
export const DomainEventsPage = lazyNamed(
  () => import('@/features/gateway/pages/DomainEventsPage'),
  'DomainEventsPage',
);
export const DataLakePage = lazyNamed(
  () => import('@/features/gateway/pages/DataLakePage'),
  'DataLakePage',
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
export const TrustManagementPage = lazyNamed(
  () => import('@/features/wealth/pages/TrustManagementPage'),
  'TrustManagementPage',
);
export const TrustDetailPage = lazyNamed(
  () => import('@/features/wealth/pages/TrustDetailPage'),
  'TrustDetailPage',
);
export const AdvisorListPage = lazyNamed(
  () => import('@/features/wealth/pages/AdvisorListPage'),
  'AdvisorListPage',
);
export const AdvisorDetailPage = lazyNamed(
  () => import('@/features/wealth/pages/AdvisorDetailPage'),
  'AdvisorDetailPage',
);
export const WealthAnalyticsPage = lazyNamed(
  () => import('@/features/wealth/pages/WealthAnalyticsPage'),
  'WealthAnalyticsPage',
);
export const TradeFinancePage = lazyNamed(
  () => import('@/features/tradefinance/pages/TradeFinancePage'),
  'TradeFinancePage',
);
export const ContactCenterPage = lazyNamed(
  () => import('@/features/contactcenter/pages/ContactCenterPage'),
  'ContactCenterPage',
);
export const AgentWorkbenchPage = lazyNamed(
  () => import('@/features/contactcenter/pages/AgentWorkbenchPage'),
  'AgentWorkbenchPage',
);
export const AgentDetailPage = lazyNamed(
  () => import('@/features/contactcenter/pages/AgentDetailPage'),
  'AgentDetailPage',
);
export const QueueDashboardPage = lazyNamed(
  () => import('@/features/contactcenter/pages/QueueDashboardPage'),
  'QueueDashboardPage',
);
export const CallbackPage = lazyNamed(
  () => import('@/features/contactcenter/pages/CallbackPage'),
  'CallbackPage',
);
export const IvrManagerPage = lazyNamed(
  () => import('@/features/contactcenter/pages/IvrManagerPage'),
  'IvrManagerPage',
);
export const KnowledgeBasePage = lazyNamed(
  () => import('@/features/contactcenter/pages/KnowledgeBasePage'),
  'KnowledgeBasePage',
);
export const ChatSessionsPage = lazyNamed(
  () => import('@/features/contactcenter/pages/ChatSessionsPage'),
  'ChatSessionsPage',
);
export const ContactCenterAdminPage = lazyNamed(
  () => import('@/features/contactcenter/pages/ContactCenterAdminPage'),
  'ContactCenterAdminPage',
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

export const ApprovalWorkbenchPage = lazyNamed(
  () => import('@/features/operations/pages/ApprovalWorkbenchPage'),
  'ApprovalWorkbenchPage',
);
export const AtmManagementPage = lazyNamed(
  () => import('@/features/operations/pages/AtmManagementPage'),
  'AtmManagementPage',
);
export const VaultOperationsPage = lazyNamed(
  () => import('@/features/operations/pages/VaultOperationsPage'),
  'VaultOperationsPage',
);
export const BranchNetworkPage = lazyNamed(
  () => import('@/features/operations/pages/BranchNetworkPage'),
  'BranchNetworkPage',
);
export const BranchPerformancePage = lazyNamed(
  () => import('@/features/operations/pages/BranchPerformancePage'),
  'BranchPerformancePage',
);
export const AgentBankingPage = lazyNamed(
  () => import('@/features/operations/pages/AgentBankingPage'),
  'AgentBankingPage',
);
export const BankDraftPage = lazyNamed(
  () => import('@/features/operations/pages/BankDraftPage'),
  'BankDraftPage',
);
export const LockboxPage = lazyNamed(
  () => import('@/features/operations/pages/LockboxPage'),
  'LockboxPage',
);
export const ReconciliationPage = lazyNamed(
  () => import('@/features/operations/pages/ReconciliationPage'),
  'ReconciliationPage',
);
export const OpenItemsPage = lazyNamed(
  () => import('@/features/operations/pages/OpenItemsPage'),
  'OpenItemsPage',
);
export const IssuedDevicesPage = lazyNamed(
  () => import('@/features/operations/pages/IssuedDevicesPage'),
  'IssuedDevicesPage',
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
export const DealDetailPage = lazyNamed(
  () => import('@/features/treasury/pages/DealDetailPage'),
  'DealDetailPage',
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
export const PlacementDetailPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/PlacementDetailPage'),
  'PlacementDetailPage',
);
export const CmTradeOpsPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/TradeOpsPage'),
  'TradeOpsPage',
);
export const CmSettlementPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/SettlementPage'),
  'SettlementPage',
);
export const CmCustodyPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/CustodyPage'),
  'CustodyPage',
);
export const SecuritiesPositionPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/SecuritiesPositionPage'),
  'SecuritiesPositionPage',
);
export const QuantModelPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/QuantModelPage'),
  'QuantModelPage',
);
export const CmSuitabilityPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/SuitabilityPage'),
  'SuitabilityPage',
);
export const SecuritizationPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/SecuritizationPage'),
  'SecuritizationPage',
);
export const ProgramTradingPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/ProgramTradingPage'),
  'ProgramTradingPage',
);
export const EconomicCapitalPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/EconomicCapitalPage'),
  'EconomicCapitalPage',
);
export const QuoteManagementPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/QuoteManagementPage'),
  'QuoteManagementPage',
);
export const ValuationPage = lazyNamed(
  () => import('@/features/capitalmarkets/pages/ValuationPage'),
  'ValuationPage',
);

export const InvestmentPortfolioPage = lazyNamed(
  () => import('@/features/investments/pages/InvestmentPortfolioPage'),
  'InvestmentPortfolioPage',
);
export const PortfolioDetailPage = lazyNamed(
  () => import('@/features/investments/pages/PortfolioDetailPage'),
  'PortfolioDetailPage',
);
export const FundManagementPage = lazyNamed(
  () => import('@/features/investments/pages/FundManagementPage'),
  'FundManagementPage',
);
export const FundDetailPage = lazyNamed(
  () => import('@/features/investments/pages/FundDetailPage'),
  'FundDetailPage',
);
export const InvestFixedIncomePage = lazyNamed(
  () => import('@/features/investments/pages/FixedIncomePage'),
  'FixedIncomePage',
);
export const InvestBankPortfolioPage = lazyNamed(
  () => import('@/features/investments/pages/BankPortfolioPage'),
  'BankPortfolioPage',
);
export const InvWealthPage = lazyNamed(
  () => import('@/features/investments/pages/WealthManagementPage'),
  'WealthManagementPage',
);
export const InvWealthDetailPage = lazyNamed(
  () => import('@/features/investments/pages/WealthClientDetailPage'),
  'WealthClientDetailPage',
);
export const InvPositionsPage = lazyNamed(
  () => import('@/features/investments/pages/SecuritiesPositionPage'),
  'SecuritiesPositionPage',
);
export const InvValuationPage = lazyNamed(
  () => import('@/features/investments/pages/ValuationPage'),
  'ValuationPage',
);
export const InterbankPage = lazyNamed(
  () => import('@/features/investments/pages/InterbankPage'),
  'InterbankPage',
);
export const InvestmentAnalyticsPage = lazyNamed(
  () => import('@/features/investments/pages/InvestmentAnalyticsPage'),
  'InvestmentAnalyticsPage',
);
export const InvSettlementPage = lazyNamed(
  () => import('@/features/investments/pages/SettlementPage'),
  'SettlementPage',
);
export const InvAdvisorDetailPage = lazyNamed(
  () => import('@/features/investments/pages/AdvisorDetailPage'),
  'AdvisorDetailPage',
);

export const AdvisoryDashboardPage = lazyNamed(
  () => import('@/features/advisory/pages/AdvisoryDashboardPage'),
  'AdvisoryDashboardPage',
);
export const MaAdvisoryPage = lazyNamed(
  () => import('@/features/advisory/pages/MaAdvisoryPage'),
  'MaAdvisoryPage',
);
export const TaxAdvisoryPage = lazyNamed(
  () => import('@/features/advisory/pages/TaxAdvisoryPage'),
  'TaxAdvisoryPage',
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
export const BehaviourAnalyticsPage = lazyNamed(
  () => import('@/features/intelligence/pages/BehaviourAnalyticsPage'),
  'BehaviourAnalyticsPage',
);
export const DocumentIntelligencePage = lazyNamed(
  () => import('@/features/intelligence/pages/DocumentIntelligencePage'),
  'DocumentIntelligencePage',
);
export const CashFlowForecastPage = lazyNamed(
  () => import('@/features/intelligence/pages/CashFlowForecastPage'),
  'CashFlowForecastPage',
);
export const DashboardManagementPage = lazyNamed(
  () => import('@/features/intelligence/pages/DashboardManagementPage'),
  'DashboardManagementPage',
);
export const DashboardViewerPage = lazyNamed(
  () => import('@/features/intelligence/pages/DashboardViewerPage'),
  'DashboardViewerPage',
);

export const AlmDashboardPage = lazyNamed(
  () => import('@/features/alm/pages/AlmDashboardPage'),
  'AlmDashboardPage',
);
export const DurationAnalyticsPage = lazyNamed(
  () => import('@/features/alm/pages/DurationAnalyticsPage'),
  'DurationAnalyticsPage',
);
export const LiquidityGapPage = lazyNamed(
  () => import('@/features/alm/pages/LiquidityGapPage'),
  'LiquidityGapPage',
);
export const StressTestingPage = lazyNamed(
  () => import('@/features/alm/pages/StressTestingPage'),
  'StressTestingPage',
);
export const AlcoReportPage = lazyNamed(
  () => import('@/features/alm/pages/AlcoReportPage'),
  'AlcoReportPage',
);
export const RegulatorySubmissionPage = lazyNamed(
  () => import('@/features/alm/pages/RegulatorySubmissionPage'),
  'RegulatorySubmissionPage',
);
export const NiiSensitivityPage = lazyNamed(
  () => import('@/features/alm/pages/NiiSensitivityPage'),
  'NiiSensitivityPage',
);
export const IrrAnalysisPage = lazyNamed(
  () => import('@/features/alm/pages/IrrAnalysisPage'),
  'IrrAnalysisPage',
);

export const CustodySettlementPage = lazyNamed(
  () => import('@/features/custody/pages/CustodySettlementPage'),
  'CustodySettlementPage',
);
export const CustodyHubPage = lazyNamed(
  () => import('@/features/custody/pages/CustodyHubPage'),
  'CustodyHubPage',
);
export const SecuritiesFailsPage = lazyNamed(
  () => import('@/features/custody/pages/SecuritiesFailsPage'),
  'SecuritiesFailsPage',
);
export const FailDetailPage = lazyNamed(
  () => import('@/features/custody/pages/FailDetailPage'),
  'FailDetailPage',
);
export const CustodyPositionsPage = lazyNamed(
  () => import('@/features/custody/pages/SecuritiesPositionPage'),
  'SecuritiesPositionPage',
);
export const CustodyPositionDetailPage = lazyNamed(
  () => import('@/features/custody/pages/PositionDetailPage'),
  'PositionDetailPage',
);

export const CounterpartyPage = lazyNamed(
  () => import('@/features/custody/pages/CounterpartyPage'),
  'CounterpartyPage',
);
export const CounterpartyDetailPage = lazyNamed(
  () => import('@/features/custody/pages/CounterpartyDetailPage'),
  'CounterpartyDetailPage',
);
export const CustodyValuationPage = lazyNamed(
  () => import('@/features/custody/pages/ValuationPage'),
  'ValuationPage',
);
export const CustodyValuationRunPage = lazyNamed(
  () => import('@/features/custody/pages/ValuationRunPage'),
  'ValuationRunPage',
);

export const ChannelManagementPage = lazyNamed(
  () => import('@/features/channels/pages/ChannelManagementPage'),
  'ChannelManagementPage',
);
export const ChannelSessionConfigPage = lazyNamed(
  () => import('@/features/channels/pages/ChannelConfigPage'),
  'ChannelConfigPage',
);
export const DigitalBankingPage = lazyNamed(
  () => import('@/features/channels/pages/DigitalBankingPage'),
  'DigitalBankingPage',
);

export const OpenBankingPage = lazyNamed(
  () => import('@/features/openbanking/pages/OpenBankingPage'),
  'OpenBankingPage',
);
export const OBTppDetailPage = lazyNamed(
  () => import('@/features/openbanking/pages/TppClientDetailPage'),
  'TppClientDetailPage',
);
export const OBConsentMgmtPage = lazyNamed(
  () => import('@/features/openbanking/pages/ConsentManagementPage'),
  'ConsentManagementPage',
);
export const OBConsentDetailPage = lazyNamed(
  () => import('@/features/openbanking/pages/ConsentDetailPage'),
  'ConsentDetailPage',
);
export const OBPsd2Page = lazyNamed(
  () => import('@/features/openbanking/pages/Psd2CompliancePage'),
  'Psd2CompliancePage',
);
export const OBScaPage = lazyNamed(
  () => import('@/features/openbanking/pages/ScaSessionsPage'),
  'ScaSessionsPage',
);
export const OBMarketplacePage = lazyNamed(
  () => import('@/features/openbanking/pages/ApiMarketplacePage'),
  'ApiMarketplacePage',
);
export const OBProductDetailPage = lazyNamed(
  () => import('@/features/openbanking/pages/ApiProductDetailPage'),
  'ApiProductDetailPage',
);
export const OBDeveloperPage = lazyNamed(
  () => import('@/features/openbanking/pages/DeveloperPortalPage'),
  'DeveloperPortalPage',
);
export const OBMonitoringPage = lazyNamed(
  () => import('@/features/openbanking/pages/ApiMonitoringPage'),
  'ApiMonitoringPage',
);
export const OBWebhooksPage = lazyNamed(
  () => import('@/features/openbanking/pages/WebhookManagementPage'),
  'WebhookManagementPage',
);
export const OBAnalyticsPage = lazyNamed(
  () => import('@/features/openbanking/pages/OpenBankingAnalyticsPage'),
  'OpenBankingAnalyticsPage',
);

export const MerchantAcquiringPage = lazyNamed(
  () => import('@/features/acquiring/pages/MerchantAcquiringPage'),
  'MerchantAcquiringPage',
);

export const MarketDataManagementPage = lazyNamed(
  () => import('@/features/marketdata/pages/MarketDataManagementPage'),
  'MarketDataManagementPage',
);
export const PricesPage = lazyNamed(
  () => import('@/features/marketdata/pages/PricesPage'),
  'PricesPage',
);
export const ResearchPage = lazyNamed(
  () => import('@/features/marketdata/pages/ResearchPage'),
  'ResearchPage',
);
export const AnalysisPage = lazyNamed(
  () => import('@/features/marketdata/pages/AnalysisPage'),
  'AnalysisPage',
);
export const MarketMakingMgmtPage = lazyNamed(
  () => import('@/features/marketdata/pages/MarketMakingPage'),
  'MarketMakingPage',
);
export const SwitchDashboardPage = lazyNamed(
  () => import('@/features/marketdata/pages/SwitchDashboardPage'),
  'SwitchDashboardPage',
);
export const MarketRiskPage = lazyNamed(
  () => import('@/features/marketdata/pages/MarketRiskPage'),
  'MarketRiskPage',
);
export const MarketOrdersPage = lazyNamed(
  () => import('@/features/marketdata/pages/MarketOrdersPage'),
  'MarketOrdersPage',
);
export const FinancialInstrumentsPage = lazyNamed(
  () => import('@/features/marketdata/pages/FinancialInstrumentsPage'),
  'FinancialInstrumentsPage',
);
export const CompetitorAnalysisPage = lazyNamed(
  () => import('@/features/marketdata/pages/CompetitorAnalysisPage'),
  'CompetitorAnalysisPage',
);

export const TradeFinanceHubPage = lazyNamed(
  () => import('@/features/tradefinance/pages/TradeFinanceHubPage'),
  'TradeFinanceHubPage',
);

export const AccountListPage = lazyNamed(
  () => import('@/features/accounts/pages/AccountListPage'),
  'AccountListPage',
);
export const WalletPage = lazyNamed(
  () => import('@/features/accounts/pages/WalletPage'),
  'WalletPage',
);
export const PaymentsDashboardPage = lazyNamed(
  () => import('@/features/payments/pages/PaymentsDashboardPage'),
  'PaymentsDashboardPage',
);
export const RemittancePage = lazyNamed(
  () => import('@/features/payments/pages/RemittancePage'),
  'RemittancePage',
);
export const PayrollPage = lazyNamed(
  () => import('@/features/payments/pages/PayrollPage'),
  'PayrollPage',
);
export const PaymentOrchestrationPage = lazyNamed(
  () => import('@/features/payments/pages/PaymentOrchestrationPage'),
  'PaymentOrchestrationPage',
);
export const CardDisputePage = lazyNamed(
  () => import('@/features/cards/pages/CardDisputePage'),
  'CardDisputePage',
);
export const CardDisputeDetailPage = lazyNamed(
  () => import('@/features/cards/pages/CardDisputeDetailPage'),
  'CardDisputeDetailPage',
);
export const MerchantDetailPage = lazyNamed(
  () => import('@/features/cards/pages/MerchantDetailPage'),
  'MerchantDetailPage',
);
export const MerchantOnboardPage = lazyNamed(
  () => import('@/features/cards/pages/MerchantOnboardPage'),
  'MerchantOnboardPage',
);
export const TerminalDetailPage = lazyNamed(
  () => import('@/features/cards/pages/TerminalDetailPage'),
  'TerminalDetailPage',
);
export const CardRequestPage = lazyNamed(
  () => import('@/features/cards/pages/CardRequestPage'),
  'CardRequestPage',
);
export const CardIssuancePage = lazyNamed(
  () => import('@/features/cards/pages/CardIssuancePage'),
  'CardIssuancePage',
);
export const CardNetworkPage = lazyNamed(
  () => import('@/features/cards/pages/CardNetworkPage'),
  'CardNetworkPage',
);
export const CardTokenPage = lazyNamed(
  () => import('@/features/cards/pages/CardTokenPage'),
  'CardTokenPage',
);
export const TreasuryPositionsPage = lazyNamed(
  () => import('@/features/treasury/pages/TreasuryPositionsPage'),
  'TreasuryPositionsPage',
);
export const FxRatesPage = lazyNamed(
  () => import('@/features/treasury/pages/FxRatesPage'),
  'FxRatesPage',
);
export const ComplianceAssessmentsPage = lazyNamed(
  () => import('@/features/compliance/pages/ComplianceAssessmentsPage'),
  'ComplianceAssessmentsPage',
);
export const ComplianceSanctionsPage = lazyNamed(
  () => import('@/features/compliance/pages/SanctionsScreeningPage'),
  'SanctionsScreeningPage',
);
export const AmlDashboardPage = lazyNamed(
  () => import('@/features/compliance/pages/AmlDashboardPage'),
  'AmlDashboardPage',
);
export const AmlAlertDetailPage = lazyNamed(
  () => import('@/features/compliance/pages/AmlAlertDetailPage'),
  'AmlAlertDetailPage',
);
export const ScreeningDetailPage = lazyNamed(
  () => import('@/features/compliance/pages/ScreeningDetailPage'),
  'ScreeningDetailPage',
);
export const ComplianceHubPage = lazyNamed(
  () => import('@/features/compliance/pages/ComplianceHubPage'),
  'ComplianceHubPage',
);
export const GapAnalysisPage = lazyNamed(
  () => import('@/features/compliance/pages/GapAnalysisPage'),
  'GapAnalysisPage',
);
export const RegulatoryDefinitionsPage = lazyNamed(
  () => import('@/features/compliance/pages/RegulatoryDefinitionsPage'),
  'RegulatoryDefinitionsPage',
);
export const ReportsHomePage = lazyNamed(
  () => import('@/features/reports/pages/ReportsHomePage'),
  'ReportsHomePage',
);
export const AdminHomePage = lazyNamed(
  () => import('@/features/admin/pages/AdminHomePage'),
  'AdminHomePage',
);
export const CampaignManagementPage = lazyNamed(
  () => import('@/features/admin/pages/CampaignManagementPage'),
  'CampaignManagementPage',
);
export const CommissionManagementPage = lazyNamed(
  () => import('@/features/admin/pages/CommissionManagementPage'),
  'CommissionManagementPage',
);
export const LoyaltyProgramPage = lazyNamed(
  () => import('@/features/admin/pages/LoyaltyProgramPage'),
  'LoyaltyProgramPage',
);
export const PricingManagementPage = lazyNamed(
  () => import('@/features/admin/pages/PricingManagementPage'),
  'PricingManagementPage',
);
export const SalesManagementPage = lazyNamed(
  () => import('@/features/admin/pages/SalesManagementPage'),
  'SalesManagementPage',
);
export const SurveyManagementPage = lazyNamed(
  () => import('@/features/admin/pages/SurveyManagementPage'),
  'SurveyManagementPage',
);
export const GovernancePage = lazyNamed(
  () => import('@/features/admin/pages/GovernancePage'),
  'GovernancePage',
);
export const BillerAdminPage = lazyNamed(
  () => import('@/features/admin/pages/BillerAdminPage'),
  'BillerAdminPage',
);
export const NotificationManagementPage = lazyNamed(
  () => import('@/features/admin/pages/NotificationManagementPage'),
  'NotificationManagementPage',
);

export const NotificationHistoryPage = lazyNamed(
  () => import('@/features/notifications/pages/NotificationHistoryPage'),
  'NotificationHistoryPage',
);

export const BiDashboardPage = lazyNamed(
  () => import('@/features/dashboard/pages/BiDashboardPage'),
  'BiDashboardPage',
);
