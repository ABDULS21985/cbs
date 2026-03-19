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
import { NotificationCenterPage } from '@/features/notifications/pages/NotificationCenterPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage as NotFoundPageFull } from '@/pages/NotFoundPage';
import { ServerErrorPage } from '@/pages/ServerErrorPage';

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
          <Route index element={<PlaceholderPage title="Customer Search" subtitle="Find and manage customers" />} />
          <Route path="onboarding" element={<PlaceholderPage title="Customer Onboarding" subtitle="New customer registration wizard" />} />
          <Route path="kyc" element={<PlaceholderPage title="KYC Management" subtitle="Know Your Customer verification dashboard" />} />
          <Route path="segments" element={<PlaceholderPage title="Customer Segments" subtitle="Segmentation rules and analysis" />} />
          <Route path=":id" element={<PlaceholderPage title="Customer 360°" subtitle="Complete customer profile view" />} />
        </Route>

        {/* Accounts */}
        <Route path="/accounts" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="All Accounts" subtitle="Account listing and management" />} />
          <Route path="open" element={<PlaceholderPage title="Open Account" subtitle="New account opening" />} />
          <Route path="fixed-deposits" element={<PlaceholderPage title="Fixed Deposits" subtitle="Term deposit management" />} />
          <Route path="goals" element={<PlaceholderPage title="Savings Goals" subtitle="Goal-based savings tracking" />} />
          <Route path=":id" element={<PlaceholderPage title="Account Details" />} />
        </Route>

        {/* Lending */}
        <Route path="/lending" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Lending Dashboard" />} />
          <Route path="applications" element={<PlaceholderPage title="Loan Applications" subtitle="Application pipeline and processing" />} />
          <Route path="active" element={<PlaceholderPage title="Active Loans" subtitle="Active loan portfolio" />} />
          <Route path="facilities" element={<PlaceholderPage title="Credit Facilities" subtitle="Credit lines and overdrafts" />} />
          <Route path="collections" element={<PlaceholderPage title="Collections" subtitle="Delinquency management and recovery" />} />
          <Route path="ecl" element={<PlaceholderPage title="ECL Dashboard" subtitle="Expected credit loss monitoring" />} />
        </Route>

        {/* Payments */}
        <Route path="/payments" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Payments" />} />
          <Route path="new" element={<PlaceholderPage title="New Transfer" subtitle="Initiate a payment or transfer" />} />
          <Route path="history" element={<PlaceholderPage title="Transaction History" />} />
          <Route path="standing-orders" element={<PlaceholderPage title="Standing Orders" />} />
          <Route path="bills" element={<PlaceholderPage title="Bill Payments" />} />
          <Route path="bulk" element={<PlaceholderPage title="Bulk Payments" subtitle="Payroll and batch processing" />} />
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
        </Route>

        {/* Risk */}
        <Route path="/risk" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Risk Overview" />} />
          <Route path="aml" element={<PlaceholderPage title="AML Alerts" />} />
          <Route path="fraud" element={<PlaceholderPage title="Fraud Alerts" />} />
          <Route path="sanctions" element={<PlaceholderPage title="Sanctions Screening" />} />
          <Route path="credit" element={<PlaceholderPage title="Credit Risk" />} />
        </Route>

        {/* Compliance */}
        <Route path="/compliance" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Compliance" />} />
          <Route path="returns" element={<PlaceholderPage title="Regulatory Returns" />} />
          <Route path="assessments" element={<PlaceholderPage title="Assessments" />} />
          <Route path="audit" element={<PlaceholderPage title="Audit Trail" />} />
        </Route>

        {/* Operations */}
        <Route path="/operations" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Operations" />} />
          <Route path="eod" element={<PlaceholderPage title="End of Day" />} />
          <Route path="gl" element={<PlaceholderPage title="General Ledger" />} />
          <Route path="branches" element={<PlaceholderPage title="Branch Operations" />} />
          <Route path="approvals" element={<PlaceholderPage title="Approvals Queue" />} />
        </Route>

        {/* Reports */}
        <Route path="/reports" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Reports" />} />
          <Route path="executive" element={<PlaceholderPage title="Executive Dashboard" />} />
          <Route path="financial" element={<PlaceholderPage title="Financial Reports" />} />
          <Route path="loans" element={<PlaceholderPage title="Loan Portfolio Report" />} />
          <Route path="custom" element={<PlaceholderPage title="Custom Reports" />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<Outlet />}>
          <Route index element={<PlaceholderPage title="Administration" />} />
          <Route path="users" element={<PlaceholderPage title="Users & Roles" />} />
          <Route path="parameters" element={<PlaceholderPage title="System Parameters" />} />
          <Route path="products" element={<PlaceholderPage title="Product Catalog" />} />
          <Route path="fees" element={<PlaceholderPage title="Fees & Charges" />} />
        </Route>

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationCenterPage />} />

        {/* Error pages */}
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/error" element={<ServerErrorPage />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPageFull />} />
      </Route>
    </Routes>
    </>
  );
}
