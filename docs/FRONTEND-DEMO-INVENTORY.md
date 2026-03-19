# Frontend Demo Data Inventory

This inventory reflects the frontend state after removing the default mock-auth path and pointing shared API traffic at the live backend.

## Explicit Demo Fallbacks

These modules still contain demo/mock generators, but they are now opt-in and only activate when `VITE_DEMO_MODE=true`.

- `/Users/mac/codes/cba/cbs-frontend/src/features/accounts/api/accountDetailApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/accounts/api/accountMaintenanceApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/accounts/api/accountOpeningApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/deposits/api/fixedDepositApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/gateway/api/gatewayApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/operations/api/branchOpsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/operations/api/documentApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/operations/api/eodApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/operations/api/glApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/payments/api/achApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/payments/api/chequeApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/payments/api/qrApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/almReportApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/channelAnalyticsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/customerAnalyticsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/depositAnalyticsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/financialReportApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/loanAnalyticsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/marketingAnalyticsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/operationalReportApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/paymentAnalyticsApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/reportBuilderApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/transactions/api/transactionApi.ts`

## Hardcoded Mock Datasets Or In-Memory Fixtures

These modules still ship local data or in-memory state even without `VITE_DEMO_MODE`.

- `/Users/mac/codes/cba/cbs-frontend/src/features/admin/api/providerApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/admin/api/userAdminApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/cards/api/mockCardData.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/dashboard/config/defaultDashboard.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/statements/api/statementApi.ts`
- `/Users/mac/codes/cba/cbs-frontend/src/features/treasury/api/mockTreasuryData.ts`

## Placeholder Or Mock-Backed Screens

These screens still render placeholders, static mock content, or “coming soon” UX instead of a live backend workflow.

- `/Users/mac/codes/cba/cbs-frontend/src/app/router.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/accounts/pages/AccountDetailPage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/cards/pages/CardClearingPage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/operations/components/branch/StaffScheduleCalendar.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/operations/components/gl/ChartOfAccountsTree.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/payments/pages/ChequeManagementPage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/risk/components/fraud/ModelPerformancePanel.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/risk/pages/FraudManagementPage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/treasury/pages/CapitalMarketsPage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/treasury/pages/FixedIncomePage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/treasury/pages/MarketDataPage.tsx`
- `/Users/mac/codes/cba/cbs-frontend/src/features/treasury/pages/TradeOpsPage.tsx`

## Removed In This Pass

- Default mock authentication in `/Users/mac/codes/cba/cbs-frontend/src/features/auth/api/authApi.ts`
- Default mock-auth environment toggle in `/Users/mac/codes/cba/cbs-frontend/.env`
- Forced demo mode in `/Users/mac/codes/cba/cbs-frontend/src/features/reports/api/paymentAnalyticsApi.ts`
