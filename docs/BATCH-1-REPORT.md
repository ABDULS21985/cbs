# CBS Batch 1 — Completion Report
## Capabilities 1–5: Customer & Account Management Foundation

**Stack:** Java 21 · Spring Boot 3.3.5 · PostgreSQL · Flyway · MapStruct · Lombok · OAuth2/JWT  
**Type:** Greenfield  
**Date:** 2026-03-17

---

## Capabilities Delivered

### Capability 1 — 360° Customer View
**Objective:** Unified customer profile aggregating all products, interactions, KYC data, risk scores, and transaction history.

| Layer | Deliverable |
|-------|-------------|
| Entity | `Customer` (38 fields), `CustomerAddress`, `CustomerContact`, `CustomerIdentification`, `CustomerNote`, `CustomerRelationship` |
| DTOs | `CustomerResponse` (full 360 view), `CustomerSummaryResponse` (list view), `CustomerDashboardStats` |
| Repository | `CustomerRepository` with `findByIdWithDetails()`, `findByCifNumberWithDetails()`, `searchCustomers()` |
| Service | `CustomerService.getCustomer360()`, `getCustomerByCif()`, `searchCustomers()`, `quickSearch()`, `getDashboardStats()` |
| Controller | `GET /v1/customers/{id}`, `GET /v1/customers/cif/{cif}`, `GET /v1/customers/search`, `GET /v1/customers/quick-search`, `GET /v1/customers/dashboard/stats` |
| Specification | `CustomerSpecifications.fromCriteria()` — 12-field dynamic JPA Specification |
| Tests | 4 tests (get 360 view, get by CIF, not found, advanced search) |

### Capability 2 — Multi-Entity Customer Onboarding
**Objective:** Digital onboarding for individuals, sole proprietors, SMEs, corporates, trusts, and government entities.

| Layer | Deliverable |
|-------|-------------|
| Entity | Shared `Customer` entity with polymorphic individual/corporate fields |
| DTOs | `CreateCustomerRequest` (validated), `UpdateCustomerRequest` (partial update), `CustomerStatusChangeRequest` |
| Enums | `CustomerType` (7 types), `CustomerStatus` (6 states), `RiskRating` (6 levels) |
| Validation | `CustomerValidator` — business rules for individual vs corporate, status transition matrix |
| Service | `createCustomer()`, `updateCustomer()`, `changeStatus()` with CIF auto-generation, duplicate detection |
| Controller | `POST /v1/customers`, `PUT /v1/customers/{id}`, `PATCH /v1/customers/{id}/status` |
| DB | `cif_number_seq` sequence, `customer_type`/`gender`/`marital_status`/`id_type` lookup tables with Nigerian seed data |
| Tests | 5 tests (create individual, create corporate, duplicate email, status transition, validator tests ×8) |

### Capability 3 — eKYC & Digital Identity Verification
**Objective:** Integration with national identity systems (NIN, BVN, NIMC), verification workflow.

| Layer | Deliverable |
|-------|-------------|
| Entity | `CustomerIdentification` with `isExpired()` logic |
| DTOs | `KycVerificationRequest`, `KycVerificationResponse` (5 statuses: VERIFIED, FAILED, PENDING, EXPIRED_DOCUMENT, MISMATCH), `IdentificationDto` |
| Repository | `CustomerIdentificationRepository` with `findVerifiedByCustomerId()`, `clearPrimaryFlag()` |
| Service | `verifyIdentification()` with pluggable KYC provider seam, `addIdentification()`, `getIdentifications()` |
| Controller | `POST /v1/customers/kyc/verify`, `GET /v1/customers/{id}/identifications`, `POST /v1/customers/{id}/identifications` |
| DB | `id_type` lookup table seeded with NIN, BVN, Voter's Card, Driver's License, Intl Passport, TIN, CAC, RC Number, NIMC Slip |
| Integration | `resolveProvider()` maps ID types to NIBSS_BVN_SERVICE, NIMC_NIN_SERVICE, FIRS_TIN_SERVICE, CAC_VERIFICATION |
| Tests | 3 tests (BVN verification, expired document rejection, add identification) |

### Capability 4 — Flexible Account Structures
**Objective:** Sub-resource management for addresses, contacts, notes, relationships.

| Layer | Deliverable |
|-------|-------------|
| Entities | `CustomerAddress` (5 types), `CustomerContact` (4 types), `CustomerNote` (6 types), `CustomerRelationship` (10 types) |
| DTOs | `AddressDto`, `ContactDto`, `NoteDto`, `RelationshipDto` |
| Repositories | `CustomerAddressRepository`, `CustomerNoteRepository`, `CustomerRelationshipRepository` with primary-flag management |
| Service | Full CRUD for addresses (add/update/delete), contacts (add/list), notes (add/paginated list), relationships (add/list with self-referential validation) |
| Controller | 10 sub-resource endpoints under `/v1/customers/{id}/` |
| Tests | 2 tests (add address with primary flag, add relationship + self-relationship rejection) |

### Capability 5 — Customer Segmentation Engine
**Objective:** Rule-based and ML-driven segmentation by demographics, behaviour, risk tier, and product affinity.

| Layer | Deliverable |
|-------|-------------|
| Entities | `Segment`, `SegmentRule` (15 operators), `CustomerSegment` (join table with confidence scores) |
| Enums | `SegmentType` (4 types), `RuleOperator` (15 operators), `AssignmentType` (3 types) |
| DTOs | `SegmentDto`, `SegmentRuleDto` |
| Engine | `SegmentRuleEvaluator` — supports AND within groups, OR across groups, computed fields (age), 15 operators, reflection-based field resolution |
| Repository | `SegmentRepository`, `CustomerSegmentRepository` with count/paginated queries |
| Service | `SegmentationService` — full CRUD, manual/auto assignment, single-customer evaluation, bulk evaluation (paginated) |
| Controller | 11 endpoints under `/v1/segments/` including `POST /evaluate/customer/{id}` and `POST /evaluate/all` |
| DB | `segment`, `segment_rule`, `customer_segment` tables + 12 seed segments (Nigerian banking context) |
| Tests | 15 tests (EQUALS, NOT_EQUALS, IN, NOT_IN, CONTAINS, STARTS_WITH, IS_NULL, IS_NOT_NULL, age LESS_THAN, age BETWEEN, AND/OR logic, inactive rules, empty rules) |

---

## Full File Inventory

### Source Files (66 Java + 2 SQL + 2 YAML + 2 Gradle)

| Category | Count | Files |
|----------|-------|-------|
| Entities | 19 | Customer, CustomerAddress, CustomerContact, CustomerIdentification, CustomerNote, CustomerRelationship, Segment, SegmentRule, CustomerSegment + 10 enums |
| DTOs | 18 | CreateCustomerRequest, UpdateCustomerRequest, CustomerResponse, CustomerSummaryResponse, CustomerDashboardStats, CustomerSearchCriteria, CustomerStatusChangeRequest, KycVerificationRequest/Response, AddressDto, ContactDto, IdentificationDto, NoteDto, RelationshipDto, SegmentDto, SegmentRuleDto, ApiResponse, PageMeta |
| Repositories | 8 | CustomerRepository, CustomerAddressRepository, CustomerIdentificationRepository, CustomerNoteRepository, CustomerRelationshipRepository, SegmentRepository, CustomerSegmentRepository, CustomerSpecifications |
| Services | 2 | CustomerService (12 public methods), SegmentationService (11 public methods) |
| Controllers | 2 | CustomerController (21 endpoints), SegmentationController (11 endpoints) |
| Mappers | 2 | CustomerMapper, SegmentMapper |
| Engine | 1 | SegmentRuleEvaluator |
| Validation | 1 | CustomerValidator |
| Config | 5 | CbsApplication, SecurityConfig, AppConfig, CbsProperties, SecurityAuditorAware, AuditableEntity |
| Exception | 4 | BusinessException, ResourceNotFoundException, DuplicateResourceException, GlobalExceptionHandler |
| Migrations | 2 | V1 (10 tables, 17 indexes, 4 seed lookups, 1 sequence), V2 (3 tables, 3 indexes, 12 seed segments) |
| Tests | 3 | CustomerServiceTest (14), CustomerValidatorTest (8), SegmentRuleEvaluatorTest (15) = **37 total** |

### Database Objects Created

| Object Type | Count | Details |
|-------------|-------|---------|
| Schema | 1 | `cbs` |
| Tables | 13 | customer, customer_address, customer_contact, customer_identification, customer_note, customer_relationship, customer_type, gender, marital_status, id_type, segment, segment_rule, customer_segment |
| Indexes | 20 | Performance indexes on FK columns, search fields, composite indexes |
| Sequences | 1 | cif_number_seq (start 100000) |
| Seed Data | 4 lookups + 12 segments | 7 customer types, 3 genders, 5 marital statuses, 9 Nigerian ID types, 12 banking segments |

### API Endpoints (32 total)

| Method | Path | Capability |
|--------|------|------------|
| GET | `/v1/customers/{id}` | 360° View |
| GET | `/v1/customers/cif/{cif}` | 360° View |
| GET | `/v1/customers/search` | 360° View |
| GET | `/v1/customers/quick-search` | 360° View |
| GET | `/v1/customers/dashboard/stats` | 360° View |
| POST | `/v1/customers` | Onboarding |
| PUT | `/v1/customers/{id}` | Onboarding |
| PATCH | `/v1/customers/{id}/status` | Lifecycle |
| POST | `/v1/customers/kyc/verify` | eKYC |
| GET | `/v1/customers/{id}/identifications` | eKYC |
| POST | `/v1/customers/{id}/identifications` | eKYC |
| GET | `/v1/customers/{id}/addresses` | Account Structures |
| POST | `/v1/customers/{id}/addresses` | Account Structures |
| PUT | `/v1/customers/{id}/addresses/{aid}` | Account Structures |
| DELETE | `/v1/customers/{id}/addresses/{aid}` | Account Structures |
| GET | `/v1/customers/{id}/contacts` | Account Structures |
| POST | `/v1/customers/{id}/contacts` | Account Structures |
| GET | `/v1/customers/{id}/notes` | Account Structures |
| POST | `/v1/customers/{id}/notes` | Account Structures |
| GET | `/v1/customers/{id}/relationships` | Account Structures |
| POST | `/v1/customers/{id}/relationships` | Account Structures |
| GET | `/v1/segments` | Segmentation |
| GET | `/v1/segments/{id}` | Segmentation |
| GET | `/v1/segments/code/{code}` | Segmentation |
| POST | `/v1/segments` | Segmentation |
| PUT | `/v1/segments/{id}` | Segmentation |
| DELETE | `/v1/segments/{id}` | Segmentation |
| GET | `/v1/segments/customer/{id}` | Segmentation |
| POST | `/v1/segments/{sid}/customers/{cid}` | Segmentation |
| DELETE | `/v1/segments/{sid}/customers/{cid}` | Segmentation |
| GET | `/v1/segments/{sid}/customers` | Segmentation |
| POST | `/v1/segments/evaluate/customer/{id}` | Segmentation |
| POST | `/v1/segments/evaluate/all` | Segmentation |

### Security Controls

| Control | Implementation |
|---------|---------------|
| Authentication | OAuth2 JWT Resource Server (Keycloak-compatible) |
| Authorization | `@PreAuthorize` RBAC: CBS_ADMIN, CBS_OFFICER, CBS_VIEWER |
| CORS | Configurable allowed origins |
| CSRF | Disabled (stateless JWT) |
| Input Validation | Jakarta Bean Validation + custom `CustomerValidator` |
| Status Transitions | Explicit allow-list (`ALLOWED_STATUS_TRANSITIONS`) |
| Duplicate Detection | Email + phone uniqueness enforcement |
| Self-Referential Guard | Relationship cannot link customer to themselves |
| Error Handling | `GlobalExceptionHandler` — no stack traces leaked |
| Audit Trail | `AuditableEntity` base class + `SecurityAuditorAware` |
| Optimistic Locking | `@Version` on all entities |

---

## Build Instructions

```bash
# Prerequisites: Java 21, PostgreSQL 16, Redis
# 1. Clone and enter directory
cd cbs

# 2. Configure database
export CBS_DB_URL=jdbc:postgresql://localhost:5432/cbs
export CBS_DB_USERNAME=cbs_admin
export CBS_DB_PASSWORD=your_secure_password

# 3. Build
./gradlew build

# 4. Run (Flyway auto-migrates)
./gradlew bootRun

# 5. Access
# API: http://localhost:8080/api/v1/customers
# Swagger: http://localhost:8080/api/swagger-ui
```

---

## Next: Batch 2 (Capabilities 6–10)

| # | Capability | Dependencies |
|---|-----------|-------------|
| 6 | Relationship & Household Mapping | ✅ Foundation in Batch 1 `customer_relationship` |
| 7 | Automated Account Lifecycle Management | ✅ Foundation in Batch 1 `CustomerStatus` transitions |
| 8 | Self-Service Customer Portal | Batch 1 APIs |
| 9 | Current / Checking Accounts | New `account` module |
| 10 | Savings Accounts (Tiered Interest) | Account module + interest engine |
