# Production Readiness Audit

Date: 2026-03-20
Workspace: `/Users/mac/codes/cba`
Overall status: Not production-ready

## Findings

### Critical

1. Remaining money-movement paths still bypass the shared posting engine
- Why it matters: subledger and GL integrity is still not guaranteed across the whole backend.
- Evidence:
  - `src/main/java/com/cbs/card/service/CardService.java:195`
  - `src/main/java/com/cbs/fees/service/FeeService.java:51`
  - `src/main/java/com/cbs/overdraft/service/OverdraftService.java:108`
  - `src/main/java/com/cbs/trade/service/TradeFinanceService.java:82`
  - `src/main/java/com/cbs/treasury/service/TreasuryService.java:87`
  - `src/main/java/com/cbs/billing/service/BillPaymentService.java:106`
- Count: 32 direct `.debit()` / `.credit()` mutation sites outside `AccountPostingService`.
- Status: Open.
- Recommended next step: move these modules onto `AccountPostingService` or an equivalent single posting boundary before go-live.

2. The frontend still widely masks backend failures as empty or null data
- Why it matters: pages can look healthy but silently drop data when integrations fail.
- Evidence:
  - `cbs-frontend/src/features/investments/pages/SecuritiesPositionPage.tsx:57`
  - `cbs-frontend/src/features/deposits/api/fixedDepositApi.ts:83`
  - `cbs-frontend/src/features/payments/api/paymentApi.ts:152`
  - `cbs-frontend/src/features/alm/api/almApi.ts:220`
  - `cbs-frontend/src/features/advisory/api/advisoryApi.ts:298`
- Count: 123 `catch(() => [])` and 17 `catch(() => null)` occurrences in `cbs-frontend/src`.
- Status: Open, partially reduced in this pass.
- Recommended next step: remove silent fallbacks feature-by-feature, starting with payments, lending, deposits, and investments.

### High

3. Audit provenance is still caller-driven in multiple backend service flows
- Why it matters: approval and operational audit trails remain forgeable in several modules.
- Evidence:
  - `src/main/java/com/cbs/productfactory/service/ProductFactoryService.java:40`
  - `src/main/java/com/cbs/payroll/service/PayrollService.java:76`
  - `src/main/java/com/cbs/alm/service/AlmService.java:87`
  - `src/main/java/com/cbs/vault/service/VaultService.java:41`
  - `src/main/java/com/cbs/lifecycle/service/AccountLifecycleService.java:74`
- Count: raw identifier occurrences in backend production code: `performedBy` 64, `createdBy` 60, `approvedBy` 57, `reversedBy` 2.
- Status: Open; escrow and several ledger paths were hardened earlier, but this problem still exists repo-wide.
- Recommended next step: inject authenticated actor context in these services and remove actor arguments from controller/service APIs.

4. Explicit stub and coming-soon UI still ships in production code
- Why it matters: users can still reach screens or actions that imply capabilities the backend does not provide.
- Evidence:
  - `cbs-frontend/src/app/router.tsx:327`
  - `cbs-frontend/src/features/reports/pages/MarketingAnalyticsPage.tsx:139`
  - `cbs-frontend/src/features/customers/pages/SegmentationPage.tsx:219`
  - `cbs-frontend/src/features/risk/pages/FraudManagementPage.tsx:94`
  - `cbs-frontend/src/features/lending/pages/LeasedAssetPage.tsx:98`
  - `cbs-frontend/src/features/operations/components/branch/StaffScheduleCalendar.tsx:179`
- Count: 12 `coming soon` matches in production code.
- Status: Open, partially reduced in this pass.
- Recommended next step: either wire real endpoints or remove/gate the actions.

5. The load-test profile is still dangerous if deployed
- Why it matters: it disables OAuth resource-server protection and permits all requests with synthetic admin authorities.
- Evidence:
  - `src/main/java/com/cbs/security/config/LoadTestSecurityConfig.java:29`
  - `src/main/resources/application-loadtest.yml:75`
- Status: Open.
- Recommended next step: prevent `loadtest` from being deployable outside isolated performance environments and add deployment guardrails.

6. Frontend auth configuration still has unsafe localhost defaults
- Why it matters: a bad deploy can point production login at a local IdP or an incorrect redirect URI.
- Evidence:
  - `cbs-frontend/src/features/auth/api/authApi.ts:14`
  - `cbs-frontend/src/features/auth/api/authApi.ts:47`
- Status: Open.
- Recommended next step: require `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`, and a production redirect URI at deploy time.

### Medium

7. Notification preferences used a hardcoded demo customer context
- Why it matters: customer-scoped settings were being loaded and mutated for customer `1`, not the authenticated user.
- Evidence:
  - Fixed in `cbs-frontend/src/features/notifications/pages/NotificationPreferencesPage.tsx:20`
- Status: Fixed in this pass.
- Change: the page now derives a numeric customer ID from auth context when available and otherwise fails honestly with a warning instead of using demo customer data.
- Recommended next step: expose an explicit customer identifier in the auth/session model instead of numeric inference.

8. ALCO executive summary generation wrote demo narrative on backend failure
- Why it matters: a failed backend generation request could silently produce fabricated board-report text.
- Evidence:
  - Fixed in `cbs-frontend/src/features/alm/pages/AlcoReportPage.tsx:149`
- Status: Fixed in this pass.
- Change: failed generation now surfaces an error and leaves the summary for manual entry or retry.

9. Fee history had a silent empty-data alias
- Why it matters: missing identifiers were treated as empty history instead of an error.
- Evidence:
  - Fixed in `cbs-frontend/src/features/fees/api/feeApi.ts:223`
- Status: Fixed in this pass.
- Change: missing fee/account identifier now rejects with an explicit error.

10. Escrow release execution previously bypassed real transfer posting and actor capture
- Why it matters: release execution could unlock funds without a real posting trail and with caller-supplied approval identity.
- Evidence:
  - Fixed in `src/main/java/com/cbs/escrow/service/EscrowService.java:133`
  - Fixed in `src/main/java/com/cbs/escrow/controller/EscrowController.java:68`
- Status: Fixed in this pass.
- Change: release approval now uses the authenticated actor and routes cross-account releases through `AccountPostingService`.

### Low

11. Raw `placeholder` string count is high but noisy
- Why it matters: many matches are harmless input placeholders, not production-readiness gaps.
- Count: 709 matches in production code.
- Status: Informational only.

## Change Summary

### Frontend honesty and real-integration fixes
- `cbs-frontend/src/features/treasury/pages/MarketDataPage.tsx`
- `cbs-frontend/src/features/treasury/pages/TradeOpsPage.tsx`
- `cbs-frontend/src/features/treasury/pages/CapitalMarketsPage.tsx`
- `cbs-frontend/src/features/cards/pages/CardListPage.tsx`
- `cbs-frontend/src/features/tradefinance/api/tradeFinanceExtApi.ts`
- `cbs-frontend/src/features/tradefinance/hooks/useTradeFinanceExt.ts`
- `cbs-frontend/src/features/auth/api/authApi.ts`
- `cbs-frontend/src/features/auth/pages/ForgotPasswordPage.tsx`
- `cbs-frontend/src/features/auth/pages/ResetPasswordPage.tsx`
- `cbs-frontend/src/features/auth/pages/MfaChallengePage.tsx`
- `cbs-frontend/src/features/contactcenter/pages/AgentWorkbenchPage.tsx`
- `cbs-frontend/src/features/contactcenter/pages/AgentDashboardPage.tsx`
- `cbs-frontend/src/features/notifications/pages/NotificationPreferencesPage.tsx`
- `cbs-frontend/src/features/alm/pages/AlcoReportPage.tsx`
- `cbs-frontend/src/features/fees/api/feeApi.ts`

### Backend hardening
- `src/main/java/com/cbs/escrow/service/EscrowService.java`
- `src/main/java/com/cbs/escrow/controller/EscrowController.java`
- `src/test/java/com/cbs/escrow/EscrowServiceTest.java`

## Verification

- Passed: `git diff --check` on all touched files in this pass.
- Passed: `CI=1 npx vitest run src/features/cards/pages/CardListPage.test.tsx --reporter=verbose`
- Failed before test execution: `./gradlew -q test --tests 'com.cbs.escrow.EscrowServiceTest'`
  - Blocker: local Gradle/JDK toolchain issue reports `25.0.2`
- Environment note:
  - `build.gradle.kts:10` declares Java 21 toolchain.
  - local environment is not successfully executing Gradle with the installed JDK.

## Classification Tables

### Frontend routes / pages

| Classification | Examples |
| --- | --- |
| Real backend-backed | `MarketDataPage`, `TradeOpsPage`, `CapitalMarketsPage`, `CardListPage`, PKCE auth callback flow |
| Partially real / partially synthetic | Wealth, dashboard, investments, notifications pages that still depend on incomplete auth-to-customer mapping or mixed derived values |
| Stubbed / fake / incomplete | `MarketingAnalyticsPage`, `SegmentationPage`, `FraudManagementPage`, `LeasedAssetPage`, router-level module placeholder |
| Masked by silent fallback | Investments, deposits, payments, ALM, cards clearing, statements, advisory, lending, gateway, wealth, contact-center pages with `catch(() => [])` or `catch(() => null)` |

### Backend modules

| Classification | Examples |
| --- | --- |
| Production-safe / hardened in repo | JWT audience validation, posting engine core paths, wallet/remittance earlier rewiring, escrow release hardening |
| Needs hardening | Cards, fees, cheque, agent banking, overdraft, trade finance, goals, loan origination, treasury, vault, payroll, ALM, product factory |
| Stubbed / incomplete / dangerous profile | `loadtest` profile security override and synthetic/internal test behavior |

### Deployment / config surfaces

| Classification | Examples |
| --- | --- |
| Properly wired | Java 21 toolchain declaration, backend env example for ledger settlement GLs, explicit backend ledger/security properties added in earlier passes |
| Missing required config | `CBS_OAUTH2_ISSUER_URI`, `CBS_CORS_ORIGINS`, `CBS_LEDGER_WALLET_SETTLEMENT_GL`, `CBS_LEDGER_REMITTANCE_SETTLEMENT_GL` or clearing fallback, frontend `VITE_KEYCLOAK_*` |
| Unsafe defaults | frontend localhost Keycloak defaults, `application-loadtest.yml` synthetic/internal settings |

## Pattern Inventory Counts

- `catch(() => [])`: 123
- `catch(() => null)`: 17
- `Promise.resolve([])`: 0
- `coming soon`: 12
- `demo`: 6
- `placeholder`: 709
- `synthetic`: 13
- direct balance mutation patterns outside posting engine: 32
- actor identifier occurrences in backend production code:
  - `performedBy`: 64
  - `createdBy`: 60
  - `approvedBy`: 57
  - `reversedBy`: 2

## Top 10 Remaining Blockers To Production

1. Remaining money-movement services still bypass the posting engine.
2. Frontend still masks backend failures with 140 silent fallbacks (`[]` + `null`).
3. Multiple approval and operational services still take actor identity as method input.
4. Stubbed / coming-soon UI remains reachable in production routing.
5. `loadtest` profile still disables auth and enables synthetic behavior.
6. Frontend auth still has localhost IdP defaults.
7. Full backend test execution is blocked by the local Gradle/JDK toolchain issue.
8. Feature-level notification/customer context still lacks a canonical customer ID in auth state.
9. Repo-wide frontend feature areas such as investments, payments, lending, and advisory still need honest error handling instead of empty fallbacks.
10. The backend still contains several operational modules that directly mutate balances without GL posting.

## What Was Fixed In This Pass

- Removed fake ALCO executive-summary fallback text.
- Removed hardcoded demo notification customer context.
- Removed the last live `Promise.resolve([])` production-code path.
- Hardened escrow release execution to use authenticated actor context and real transfer posting.
- Strengthened treasury/contact-center/cards/trade-finance/auth frontend honesty from earlier in this pass by keeping only real backend-backed behavior or explicit failure states.

## Fastest Next Remediation Order

1. Move remaining debit/credit sites onto `AccountPostingService`.
2. Remove silent frontend fallbacks in payments, lending, deposits, and investments.
3. Eliminate caller-supplied actor parameters from approval and operational services.
4. Remove or gate the remaining stub UI surfaces.
5. Lock out `loadtest` from non-performance deployments.
6. Enforce required frontend and backend auth/config variables at build/deploy time.
7. Fix the Gradle/JDK toolchain so backend compile and tests can actually run.

## What Must Still Be Fixed Before Go-Live

- All remaining balance mutation paths must reconcile through the shared posting engine.
- Silent empty/null frontend fallbacks must be replaced with explicit error handling.
- Approval and audit actor provenance must come from authenticated context, not request/service parameters.
- Dangerous profiles and localhost auth defaults must be blocked in deployment.
- The backend must compile and pass targeted tests under the supported Java toolchain.
