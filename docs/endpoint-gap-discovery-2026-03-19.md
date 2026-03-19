# CBS Endpoint Gap Discovery

Generated from static source extraction plus limited live runtime probing on 2026-03-19.

## Summary

- Frontend HTTP call sites: 831
- Backend handler mappings parsed from source: 988
- Frontend calls with no backend match (static 404 candidates): 529
- Backend handlers with no frontend caller (static category D): 680

## Missing By Wave

- Wave 1: 81
- Wave 2: 56
- Wave 3: 37
- Wave 4: 355

## Missing By Module

- admin: 34
- payments: 30
- risk: 25
- accounts: 24
- approvals: 19
- notifications: 18
- compliance: 17
- loans: 15
- trade: 15
- parameters: 13
- customers: 12
- portal: 12
- treasury: 12
- eod: 11
- gateway: 11
- reports: 11
- ach: 10
- branches: 10
- collections: 10
- documents: 10
- products: 10
- statements: 10
- cheques: 9
- deposits: 9
- audit: 8

## Runtime Blockers

- Live backend on port 8081 disappeared during discovery crawl. Evidence: No listener on 8081 after crawl attempts; original bootRun/java processes exited.
- OpenAPI document endpoint was unstable. Evidence: GET /api/v3/api-docs returned HTTP 500 unauthenticated, then timed out when called with a valid bearer token.
- Actuator mappings endpoint is not available for discovery. Evidence: GET /api/actuator/mappings returned 401 without auth and 404 with a valid bearer token.
- Current source tree cannot compile cleanly. Evidence: bootRun compile phase failed on DepositController/CardController/StatementController symbol and signature mismatches.
- Starting from already-built classes also fails. Evidence: bootRun -x compileJava -x processResources failed with ConflictingBeanDefinitionException between com.cbs.merchant.controller.MerchantController and com.cbs.card.controller.MerchantController.
- Keycloak test users referenced by E2E are absent from the running cbs realm. Evidence: cbs realm contained only enabled user admin until a temporary diagnostic user was created for discovery.

## Artifacts

- docs/generated/endpoint-gap-discovery/summary.json
- docs/generated/endpoint-gap-discovery/frontend_calls.csv
- docs/generated/endpoint-gap-discovery/backend_endpoints.csv
- docs/generated/endpoint-gap-discovery/missing_frontend_endpoints.csv
- docs/generated/endpoint-gap-discovery/backend_unused_endpoints.json
- docs/generated/endpoint-gap-discovery/runtime_blockers.json
