# Frontend Integration Audit

Date: 2026-03-20

This audit is based on source inspection of the current `cbs-frontend` tree. It is enough to conclude that the frontend is not uniformly "real backend only", but it is not a full click-through of every route.

## Confirmed Route Status

### Real backend-backed

- `/notifications`
  - Uses `src/features/notifications/hooks/useNotifications.ts` and `src/features/notifications/api/notificationApi.ts`.
  - Reads notifications and unread counts from backend endpoints without demo data or silent empty-array fallbacks in this path.

### Partial backend-backed

- `/customers/:id`
  - Customer core data, accounts, loans, cards, and cases are backend-backed.
  - Portfolio trend, revenue, and profitability views were synthetic in-page calculations; those are now hidden until backend analytics endpoints exist.
  - Recommendations are now backend-only for this page. No client-side fallback recommendations are shown.

- `/operations`
  - Pending approval count is backend-backed through workflow tasks.
  - The fake "Recent Activity" feed has been removed. The page now states plainly that no backend activity feed is wired.

- `/operations/gateway/integration`
  - ESB routes are backend-backed.
  - ESB messages are now read from `GET /api/v1/integration/esb/messages`.
  - DLQ count and retry are backend-backed, but detailed DLQ item listing is not exposed by the backend, so the page now shows that limitation instead of a fake empty table.

### Masked by silent fallback

- `/communications`
  - `src/features/communications/pages/CommunicationCenterPage.tsx` uses hooks from `src/features/communications/hooks/useCommunications.ts`.
  - Those hooks call `src/features/communications/api/communicationApi.ts`, where notification and communications reads often fall back to `[]` on error.
  - Result: backend failures can look like a valid empty state.

- `/admin/products/:id`
  - `src/features/admin/pages/ProductDetailPage.tsx` falls back to `[]` for product accounts when `/api/v1/products/{id}/accounts` fails.

- `/accounts/reconciliation`
  - `src/features/reconciliation/api/reconciliationApi.ts` falls back to `[]` for nostro accounts and reconciliation history.

- `/customers/:id` timeline and recommendation side APIs
  - `src/features/customers/api/customerApi.ts` still has silent fallbacks on some Customer 360 sidecar endpoints such as timeline.
  - Recommendations were fixed for the portfolio tab, but this pattern still exists elsewhere in the customer module.

## Systemic Scope

Count of `catch(() => [])` occurrences in production `src/features` code by feature:

- `reports`: 17
- `communications`: 17
- `compliance`: 16
- `capitalmarkets`: 16
- `advisory`: 14
- `operations`: 13
- `payments`: 11
- `investments`: 11
- `alm`: 10
- `lending`: 9
- `admin`: 9
- `treasury`: 8
- `contactcenter`: 8
- `cards`: 8
- `customers`: 7

This is the main anti-pattern in the frontend today. Even where pages do call the backend, many of them suppress failures into empty collections, which makes integration problems hard to detect.

## Highest-Risk Remaining Cleanup Targets

- Remove silent fallback reads from `src/features/communications/api/communicationApi.ts` and surface query errors in the Communication Center UI.
- Remove silent fallback reads from `src/features/reconciliation/api/reconciliationApi.ts`.
- Remove silent fallback reads from `src/features/admin/pages/ProductDetailPage.tsx` and related admin APIs.
- Continue auditing route groups with the highest fallback counts first: `reports`, `communications`, `compliance`, `capitalmarkets`, and `operations`.
