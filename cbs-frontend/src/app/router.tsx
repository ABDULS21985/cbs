import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { MfaChallengePage } from '@/features/auth/pages/MfaChallengePage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { SessionTimeoutModal } from '@/features/auth/components/SessionTimeoutModal';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { FixedDepositListPage } from '@/features/deposits/pages/FixedDepositListPage';
import { NewFixedDepositPage } from '@/features/deposits/pages/NewFixedDepositPage';
import { FixedDepositDetailPage } from '@/features/deposits/pages/FixedDepositDetailPage';
import { ReconciliationWorkbenchPage } from '@/features/reconciliation/pages/ReconciliationWorkbenchPage';
import { VirtualAccountListPage } from '@/features/accounts/pages/VirtualAccountListPage';
import { VirtualAccountDetailPage } from '@/features/accounts/pages/VirtualAccountDetailPage';
import { CashPoolPage } from '@/features/accounts/pages/CashPoolPage';
import { FeeScheduleListPage } from '@/features/fees/pages/FeeScheduleListPage';
import { FeeDefinitionDetailPage } from '@/features/fees/pages/FeeDefinitionDetailPage';
import { NewFeeDefinitionPage } from '@/features/fees/pages/NewFeeDefinitionPage';
import { StatementGeneratorPage } from '@/features/statements/pages/StatementGeneratorPage';
import { NotificationCenterPage } from '@/features/notifications/pages/NotificationCenterPage';
import { TransactionSearchPage } from '@/features/transactions/pages/TransactionSearchPage';
import { AccountMaintenancePage } from '@/features/accounts/pages/AccountMaintenancePage';
import { AccountOpeningPage } from '@/features/accounts/pages/AccountOpeningPage';
import { GoalListPage } from '@/features/goals/pages/GoalListPage';
import { GoalDetailPage } from '@/features/goals/pages/GoalDetailPage';
import { NewGoalPage } from '@/features/goals/pages/NewGoalPage';
import { RecurringDepositListPage } from '@/features/goals/pages/RecurringDepositListPage';
import { RecurringDepositDetailPage } from '@/features/goals/pages/RecurringDepositDetailPage';
import { AgreementListPage } from '@/features/agreements/pages/AgreementListPage';
import { AgreementDetailPage } from '@/features/agreements/pages/AgreementDetailPage';
import { CommunicationCenterPage } from '@/features/communications/pages/CommunicationCenterPage';
import { TemplateManagementPage } from '@/features/communications/pages/TemplateManagementPage';
import { CaseListPage } from '@/features/cases/pages/CaseListPage';
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage';
import { NewCasePage } from '@/features/cases/pages/NewCasePage';
import { PortalLayout } from '@/features/portal/layout/PortalLayout';
import { PortalDashboard } from '@/features/portal/pages/PortalDashboard';
import { PortalProfilePage } from '@/features/portal/pages/PortalProfilePage';
import { PortalAccountsPage } from '@/features/portal/pages/PortalAccountsPage';
import { PortalTransferPage } from '@/features/portal/pages/PortalTransferPage';
import { PortalBeneficiariesPage } from '@/features/portal/pages/PortalBeneficiariesPage';
import { PortalCardControlsPage } from '@/features/portal/pages/PortalCardControlsPage';
import { PortalServiceRequestsPage } from '@/features/portal/pages/PortalServiceRequestsPage';
import CustomerListPage from '@/features/customers/pages/CustomerListPage';
import Customer360Page from '@/features/customers/pages/Customer360Page';
import OnboardingWizardPage from '@/features/customers/pages/OnboardingWizardPage';
import KycDashboardPage from '@/features/customers/pages/KycDashboardPage';
import SegmentationPage from '@/features/customers/pages/SegmentationPage';
import { NewTransferPage } from '@/features/payments/pages/NewTransferPage';
import { BulkPaymentPage } from '@/features/payments/pages/BulkPaymentPage';
import { StandingOrderListPage } from '@/features/payments/pages/StandingOrderListPage';
import { StandingOrderDetailPage } from '@/features/payments/pages/StandingOrderDetailPage';
import { BillPaymentPage } from '@/features/payments/pages/BillPaymentPage';
import { InternationalTransferPage } from '@/features/payments/pages/InternationalTransferPage';
import { MarketLiquidityRiskPage } from '@/features/risk/pages/MarketLiquidityRiskPage';
import { OperationalRiskPage } from '@/features/risk/pages/OperationalRiskPage';
import { RegulatoryReturnsPage } from '@/features/compliance/pages/RegulatoryReturnsPage';
import { ReturnDetailPage } from '@/features/compliance/pages/ReturnDetailPage';
import { ComplianceDashboardPage } from '@/features/compliance/pages/ComplianceDashboardPage';
import { AuditTrailPage } from '@/features/compliance/pages/AuditTrailPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage as NotFoundPageFull } from '@/pages/NotFoundPage';
import { ServerErrorPage } from '@/pages/ServerErrorPage';
import { LoanDashboardPage } from '@/features/lending/pages/LoanDashboardPage';
import { LoanApplicationListPage } from '@/features/lending/pages/LoanApplicationListPage';
import { LoanApplicationPage } from '@/features/lending/pages/LoanApplicationPage';
import { ActiveLoansPage } from '@/features/lending/pages/ActiveLoansPage';
import { LoanDetailPage } from '@/features/lending/pages/LoanDetailPage';
import { FixedIncomePage } from '@/features/treasury/pages/FixedIncomePage';
import { MarketDataPage } from '@/features/treasury/pages/MarketDataPage';
import { OrderManagementPage } from '@/features/treasury/pages/OrderManagementPage';
import { TradeOpsPage } from '@/features/treasury/pages/TradeOpsPage';
import { CapitalMarketsPage } from '@/features/treasury/pages/CapitalMarketsPage';
import { LoanRepaymentPage } from '@/features/lending/pages/LoanRepaymentPage';
import { LoanRestructurePage } from '@/features/lending/pages/LoanRestructurePage';
import { FacilityListPage } from '@/features/lending/pages/FacilityListPage';
import { FacilityDetailPage } from '@/features/lending/pages/FacilityDetailPage';
import { CollateralRegisterPage } from '@/features/lending/pages/CollateralRegisterPage';
import { CollateralDetailPage } from '@/features/lending/pages/CollateralDetailPage';
import CollectionsPage from '@/features/lending/pages/CollectionsPage';
import EclDashboardPage from '@/features/lending/pages/EclDashboardPage';
import MortgageListPage from '@/features/lending/pages/MortgageListPage';
import MortgageDetailPage from '@/features/lending/pages/MortgageDetailPage';
import LeaseListPage from '@/features/lending/pages/LeaseListPage';
import LeaseDetailPage from '@/features/lending/pages/LeaseDetailPage';
import { GatewayConsolePage } from '@/features/gateway/pages/GatewayConsolePage';
import { ChequeManagementPage } from '@/features/payments/pages/ChequeManagementPage';
import { QrPaymentPage } from '@/features/payments/pages/QrPaymentPage';
import { MobileMoneyPage } from '@/features/payments/pages/MobileMoneyPage';
import AchOperationsPage from '@/features/payments/pages/AchOperationsPage';
import { PaymentAnalyticsPage } from '@/features/reports/pages/PaymentAnalyticsPage';

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
          <Route path="segments" element={<SegmentationPage />} />
          <Route path=":id" element={<Customer360Page />} />
        </Route>

        {/* Accounts */}
        <Route path="/accounts" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="All Accounts" subtitle="Account listing and management" />} />
          <Route path="open" element={<AccountOpeningPage />} />
          <Route path="fixed-deposits" element={<FixedDepositListPage />} />
          <Route path="fixed-deposits/new" element={<NewFixedDepositPage />} />
          <Route path="fixed-deposits/:id" element={<FixedDepositDetailPage />} />
          <Route path="goals" element={<GoalListPage />} />
          <Route path="goals/new" element={<NewGoalPage />} />
          <Route path="goals/:id" element={<GoalDetailPage />} />
          <Route path="recurring-deposits" element={<RecurringDepositListPage />} />
          <Route path="recurring-deposits/:id" element={<RecurringDepositDetailPage />} />
          <Route path=":id" element={<PlaceholderPage title="Account Details" />} />
          <Route path=":id/maintenance" element={<AccountMaintenancePage />} />
          <Route path="reconciliation" element={<ReconciliationWorkbenchPage />} />
          <Route path="virtual-accounts" element={<VirtualAccountListPage />} />
          <Route path="virtual-accounts/:id" element={<VirtualAccountDetailPage />} />
          <Route path="cash-pooling" element={<CashPoolPage />} />
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
          <Route index element={<PlaceholderPage title="Payments Dashboard" />} />
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
          <Route index element={<PlaceholderPage title="Card Management" />} />
          <Route path="transactions" element={<PlaceholderPage title="Card Transactions" />} />
          <Route path="disputes" element={<PlaceholderPage title="Disputes & Chargebacks" />} />
        </Route>

        {/* Treasury */}
        <Route path="/treasury" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Treasury Dashboard" />} />
          <Route path="deals" element={<PlaceholderPage title="Treasury Deals" />} />
          <Route path="positions" element={<PlaceholderPage title="Positions" />} />
          <Route path="fx" element={<PlaceholderPage title="FX Rates" />} />
          <Route path="investments" element={<PlaceholderPage title="Investments" />} />
          <Route path="fixed-income" element={<FixedIncomePage />} />
          <Route path="market-data" element={<MarketDataPage />} />
          <Route path="orders" element={<OrderManagementPage />} />
          <Route path="trade-ops" element={<TradeOpsPage />} />
          <Route path="capital-markets" element={<CapitalMarketsPage />} />
        </Route>

        {/* Risk */}
        <Route path="/risk" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Risk Overview" />} />
          <Route path="aml" element={<PlaceholderPage title="AML Alerts" />} />
          <Route path="fraud" element={<PlaceholderPage title="Fraud Alerts" />} />
          <Route path="sanctions" element={<PlaceholderPage title="Sanctions Screening" />} />
          <Route path="credit" element={<PlaceholderPage title="Credit Risk" />} />
          <Route path="market-liquidity" element={<MarketLiquidityRiskPage />} />
          <Route path="operational" element={<OperationalRiskPage />} />
        </Route>

        {/* Compliance */}
        <Route path="/compliance" element={<Outlet />}>
          <Route index element={<ComplianceDashboardPage />} />
          <Route path="returns" element={<RegulatoryReturnsPage />} />
          <Route path="returns/:id" element={<ReturnDetailPage />} />
          <Route path="assessments" element={<PlaceholderPage title="Assessments" />} />
          <Route path="audit" element={<AuditTrailPage />} />
        </Route>

        {/* Operations */}
        <Route path="/operations" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Operations" />} />
          <Route path="eod" element={<PlaceholderPage title="End of Day" />} />
          <Route path="gl" element={<PlaceholderPage title="General Ledger" />} />
          <Route path="branches" element={<PlaceholderPage title="Branch Operations" />} />
          <Route path="approvals" element={<PlaceholderPage title="Approvals Queue" />} />
          <Route path="gateway" element={<GatewayConsolePage />} />
          <Route path="ach" element={<AchOperationsPage />} />
        </Route>

        {/* Reports */}
        <Route path="/reports" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Reports" />} />
          <Route path="executive" element={<PlaceholderPage title="Executive Dashboard" />} />
          <Route path="financial" element={<PlaceholderPage title="Financial Reports" />} />
          <Route path="loans" element={<PlaceholderPage title="Loan Portfolio Report" />} />
          <Route path="custom" element={<PlaceholderPage title="Custom Reports" />} />
          <Route path="payments" element={<PaymentAnalyticsPage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Administration" />} />
          <Route path="users" element={<PlaceholderPage title="Users & Roles" />} />
          <Route path="parameters" element={<PlaceholderPage title="System Parameters" />} />
          <Route path="products" element={<PlaceholderPage title="Product Catalog" />} />
          <Route path="fees" element={<FeeScheduleListPage />} />
          <Route path="fees/new" element={<NewFeeDefinitionPage />} />
          <Route path="fees/:id" element={<FeeDefinitionDetailPage />} />
        </Route>

        {/* Agreements */}
        <Route path="/agreements" element={<Outlet />}>
          <Route index element={<AgreementListPage />} />
          <Route path=":id" element={<AgreementDetailPage />} />
        </Route>

        {/* Communications */}
        <Route path="/communications" element={<Outlet />}>
          <Route index element={<CommunicationCenterPage />} />
          <Route path="templates" element={<TemplateManagementPage />} />
        </Route>

        {/* Cases */}
        <Route path="/cases" element={<Outlet />}>
          <Route index element={<CaseListPage />} />
          <Route path="new" element={<NewCasePage />} />
          <Route path=":id" element={<CaseDetailPage />} />
        </Route>

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
        </Route>
    </Routes>
    </>
  );
}
