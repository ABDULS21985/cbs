# Frontend Integration Audit

Date: 2026-03-20

Status: The previously flagged audit scope has now been implemented. The routes and feature groups called out in the earlier version of this document no longer rely on the audited fake-data paths or silent `[]` fallbacks.

This is still not a full application certification. It is a source-based audit of the route groups that were explicitly identified for cleanup.

## Audited Route Status

### Backend-backed with honest failure states

- `/communications`
  - Silent empty-list fallbacks were removed from the communications API layer.
  - The Communication Center, delivery dashboard, failed-message panel, and scheduled queue now surface backend failures instead of looking empty.

- `/admin/products/:id`
  - Product account reads no longer collapse to `[]` on backend failure.
  - The page now shows explicit backend error states for related data instead of implying there are no linked accounts.

- `/accounts/reconciliation`
  - Nostro account and reconciliation history reads no longer fall back to `[]`.
  - The workbench now shows explicit error messaging when those backend calls fail.

- `/customers/:id`
  - Synthetic portfolio trend, revenue, and profitability displays were removed.
  - Customer timeline and related sidecar reads no longer silently mask backend failures.
  - Backend-unavailable sections now say so directly instead of rendering invented data.

- `/operations`
  - The fake "Recent Activity" feed was removed.
  - Approval delegation, reconciliation drill-downs, and document-management tabs now show explicit load failures where the backend is unavailable.

- `/operations/gateway/integration`
  - ESB messages are read from the backend.
  - DLQ detail limitations are stated honestly instead of being represented as an empty result set.

- `reports` route group
  - Executive dashboard, deposit analytics, report builder, and saved reports no longer suppress backend failures into empty states.
  - The synthetic deposit segment chart was removed from the page until a real backend endpoint exists.

- `compliance` route group
  - Fraud, AML, compliance reports, and sanctions screens now show explicit backend error panels and honest summary-card fallbacks.

- `capitalmarkets` route group
  - Securities positions, settlement, custody, trade operations, and related dashboards now surface backend failures instead of silently rendering empty sections.

## Silent Fallback Pattern Status

Count of `catch(() => [])` or `Promise.resolve([])` occurrences in the audited feature groups:

- `reports`: 0
- `communications`: 0
- `compliance`: 0
- `capitalmarkets`: 0
- `operations`: 0
- `admin`: 0
- `reconciliation`: 0
- `customers`: 0

The specific anti-pattern targeted by this audit has been removed from the audited scope.

## Remaining Repo-Wide Risk Outside This Audit

Current count of the same pattern in other production feature groups:

- `lending`: 16
- `advisory`: 14
- `investments`: 11
- `alm`: 10
- `payments`: 8
- `cards`: 8
- `contactcenter`: 8
- `treasury`: 8
- `deposits`: 6
- `custody`: 6
- `goals`: 5
- `tradefinance`: 3
- `accounts`: 3
- `fees`: 2
- `agreements`: 2
- `statements`: 2
- `gateway`: 2
- `wealth`: 1
- `dashboard`: 1

This remains the main frontend integration risk outside the implemented audit scope: backend failures can still be hidden behind empty collections in other feature areas.

## Completed Audit Items

- Remove silent fallback reads from `src/features/communications/api/communicationApi.ts` and surface query errors in the Communication Center UI.
- Remove silent fallback reads from `src/features/reconciliation/api/reconciliationApi.ts`.
- Remove silent fallback reads from `src/features/admin/pages/ProductDetailPage.tsx` and related admin APIs.
- Continue auditing the highest-risk route groups first: `reports`, `communications`, `compliance`, `capitalmarkets`, and `operations`.

All items above are now implemented.
