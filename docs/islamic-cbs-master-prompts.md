# Islamic CBS Implementation -- 50 Master Prompts

**Platform**: DigiCore CBS (Java 21 / Spring Boot 3.x / PostgreSQL 16 / React 18 / TypeScript)
**Source**: `Islamic_CBS_Module_Inventory.xlsx` and `islamic-cbs-proceeding-plan.md`
**Architecture**: BIAN-aligned, multi-domain core banking with Keycloak OIDC, Flyway migrations, MapStruct, TanStack Query

Each prompt implements 5 capabilities in dependency order. All 50 prompts cover the complete 100-row module inventory across 8 domains and 4 phases.

---

## PROMPT 01 -- Shariah Governance Foundation: SSB Entity Model, Fatwa Registry, and Review Gateway Core

**Phase**: 0 (Foundation)
**Domain**: D1 Workflow & Platform + D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **SSB Board Member Entity & Management** (D1-05)
2. **Fatwa Registry -- Entity, Repository, Service, Controller** (D6-01 / ST-001)
3. **SSB Review Request Workflow -- Entity & State Machine** (D1-05)
4. **Fatwa Clearance Workflow -- Approval Chain with Quorum Logic** (D1-05 / ST-001)
5. **SSB Dashboard & Reporting Endpoint** (D1-05)

**Context & Why This Batch First**:
The Islamic CBS proceeding plan identifies the SSB Review Gateway as the single most critical Phase 0 dependency. Every Islamic product, contract, and transaction ultimately requires Shariah Supervisory Board (SSB) governance. No Islamic product can launch without an SSB-issued Fatwa (ST-001). No transaction can be audited without an SSB review queue (D1-05). The Integration Matrix shows that the Product Factory routes to the SSB Review Gateway for every new product or material change. Therefore, the SSB governance domain model must exist before any Islamic product entity, any Shariah compliance engine rule, or any profit distribution logic can be built.

This batch creates the foundational governance infrastructure:
- The SSB Board Member entity (who serves on the board, their qualifications, appointment dates, quorum eligibility)
- The Fatwa Registry (the canonical store of every Shariah ruling that governs product design, with versioning, AAOIFI standard references, effective dates, and approval status)
- The SSB Review Request entity and state machine (DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED / REVISION_REQUIRED), which is the workflow backbone for all Shariah-sensitive operations
- The Fatwa Clearance Workflow that enforces quorum-based approval (a Fatwa is only valid when the required number of SSB members have voted, per the bank's governance policy)
- The SSB Dashboard API that surfaces active reviews, pending Fatwas, approval statistics, and compliance posture

**What Exists Today**:
- The `approval` package (`com.cbs.approval`) has a maker-checker workflow with `ApprovalRequest`, `ApprovalStep`, and `ApprovalWorkflowService`. The SSB review gateway should integrate with this pattern but extend it for quorum-based multi-member voting (not simple maker-checker).
- The `governance` package (`com.cbs.governance`) has basic governance entities. The Fatwa Registry is a new domain concept that does not exist.
- No `islamic` or `shariah` package exists in the backend. This batch creates `com.cbs.shariah` as the root package for all Shariah governance code.

**Entities to Create**:
1. `SsbBoardMember` -- id, memberId (unique), fullName, title, qualifications (JSONB), specializations (JSONB), appointmentDate, expiryDate, isActive, isChairman, votingWeight, contactEmail, contactPhone, nationality, createdAt, updatedAt, version
2. `FatwaRecord` -- id, fatwaNumber (unique), fatwaTitle, fatwaCategory (enum: PRODUCT_APPROVAL, TRANSACTION_RULING, POLICY_DIRECTIVE, GENERAL_GUIDANCE), subject, fullText (TEXT), aaoifiReferences (JSONB, list of FAS/SS references), applicableContractTypes (JSONB), conditions (TEXT), effectiveDate, expiryDate, supersededByFatwaId, status (enum: DRAFT, ACTIVE, SUPERSEDED, REVOKED), issuedByBoardId, approvedAt, version, createdAt, updatedAt, createdBy, updatedBy
3. `SsbReviewRequest` -- id, requestCode (unique), requestType (enum: NEW_PRODUCT, PRODUCT_CHANGE, TRANSACTION_REVIEW, POLICY_REVIEW, PERIODIC_AUDIT, INCIDENT_REVIEW), title, description (TEXT), submittedBy, submittedAt, assignedToMemberIds (JSONB), requiredQuorum, currentApprovals, currentRejections, linkedFatwaId, linkedProductCode, linkedTransactionRef, reviewNotes (TEXT), resolutionNotes (TEXT), resolvedAt, resolvedBy, status (enum: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, REVISION_REQUIRED, WITHDRAWN), priority (enum: NORMAL, HIGH, URGENT), slaDeadline, createdAt, updatedAt, version
4. `SsbVote` -- id, reviewRequestId (FK), memberId (FK to SsbBoardMember), vote (enum: APPROVE, REJECT, ABSTAIN, REQUEST_REVISION), comments (TEXT), votedAt, createdAt
5. `SsbReviewAuditLog` -- id, reviewRequestId, action, performedBy, details (JSONB), createdAt

**DTOs**:
- `CreateSsbMemberRequest`, `SsbMemberResponse`
- `CreateFatwaRequest`, `UpdateFatwaRequest`, `FatwaResponse`
- `CreateReviewRequest`, `SubmitReviewRequest`, `CastVoteRequest`, `ReviewRequestResponse`
- `SsbDashboardResponse` (activeMembers, pendingReviews, approvedThisMonth, rejectedThisMonth, avgResolutionDays, reviewsByCategory, upcomingDeadlines)

**Endpoints** (under `/v1/shariah`):
- `POST /ssb/members` -- Register SSB member (CBS_ADMIN)
- `GET /ssb/members` -- List active members (CBS_ADMIN, CBS_OFFICER)
- `PUT /ssb/members/{id}` -- Update member (CBS_ADMIN)
- `POST /ssb/members/{id}/deactivate` -- Deactivate (CBS_ADMIN)
- `POST /fatwa` -- Create Fatwa draft (CBS_ADMIN, SHARIAH_OFFICER)
- `GET /fatwa` -- List Fatwas with filtering (CBS_ADMIN, CBS_OFFICER, SHARIAH_OFFICER)
- `GET /fatwa/{id}` -- Get Fatwa detail (CBS_ADMIN, CBS_OFFICER, SHARIAH_OFFICER)
- `PUT /fatwa/{id}` -- Update Fatwa (CBS_ADMIN, SHARIAH_OFFICER)
- `POST /fatwa/{id}/activate` -- Activate Fatwa (CBS_ADMIN)
- `POST /fatwa/{id}/revoke` -- Revoke Fatwa (CBS_ADMIN)
- `POST /reviews` -- Create review request (CBS_ADMIN, CBS_OFFICER, SHARIAH_OFFICER)
- `GET /reviews` -- List reviews with status filter (CBS_ADMIN, SHARIAH_OFFICER)
- `GET /reviews/{id}` -- Get review detail (CBS_ADMIN, SHARIAH_OFFICER)
- `POST /reviews/{id}/submit` -- Submit for review (CBS_ADMIN, SHARIAH_OFFICER)
- `POST /reviews/{id}/vote` -- Cast vote (SHARIAH_OFFICER -- must be assigned member)
- `POST /reviews/{id}/resolve` -- Resolve review after quorum met (CBS_ADMIN)
- `GET /dashboard` -- SSB dashboard metrics (CBS_ADMIN, SHARIAH_OFFICER)

**Database Migration**: `V80__shariah_governance.sql`
- Create tables: `ssb_board_member`, `fatwa_record`, `ssb_review_request`, `ssb_vote`, `ssb_review_audit_log`
- All in `cbs` schema
- Add indexes on `fatwa_record(fatwa_number)`, `fatwa_record(status)`, `ssb_review_request(request_code)`, `ssb_review_request(status)`, `ssb_vote(review_request_id)`

**Business Rules**:
- A Fatwa cannot transition to ACTIVE without at least one linked approved SsbReviewRequest
- An SsbReviewRequest cannot transition to APPROVED unless `currentApprovals >= requiredQuorum`
- An SsbReviewRequest cannot transition to REJECTED unless `currentRejections > (totalAssignedMembers - requiredQuorum)`
- Each SSB member can only vote once per review request (unique constraint on reviewRequestId + memberId)
- A deactivated SSB member's pending votes are NOT automatically counted -- they must be reassigned or the quorum recalculated
- Fatwa versioning: when a Fatwa is superseded, the old one transitions to SUPERSEDED and links to the new one via `supersededByFatwaId`

**Security**:
- New role: `SHARIAH_OFFICER` (add to Keycloak realm and Spring Security config)
- Vote casting restricted to members assigned to the review request
- All state transitions produce audit log entries

**Tests**:
- Unit tests for quorum calculation logic
- Unit tests for Fatwa state transitions
- Integration test for full review lifecycle (create -> submit -> vote x N -> resolve -> link Fatwa)
- Integration test for Fatwa activation requiring approved review
- Controller tests for all endpoints

**Validation**:
- `fatwaNumber` must be unique and follow pattern `FTW-YYYY-NNNN`
- `requestCode` must be unique and follow pattern `SSB-YYYY-NNNN`
- `requiredQuorum` must be >= 1 and <= number of assigned members
- `effectiveDate` must be today or future for new Fatwas
- Member `appointmentDate` must be before `expiryDate`

**Integration Points**:
- This batch is self-contained but creates the governance infrastructure that all subsequent Islamic batches depend on
- The Product Factory (Prompt 03) will require a linked Fatwa before any Islamic product can be activated
- The Shariah Compliance Engine (Prompt 09) will query the Fatwa Registry to validate transactions

---

## PROMPT 02 -- Hijri Calendar Engine, Islamic Business Rules Engine, and Shariah-Aware Notification Templates

**Phase**: 0 (Foundation)
**Domain**: D1 Workflow & Platform + D2 Core Banking
**Capabilities** (batch of 5):
1. **Hijri Calendar Engine -- Date Conversion, Islamic Month/Year, Hijri Holiday Calendar** (D2-01)
2. **Business Rules Engine -- Rule Repository Entity & CRUD** (D1-02)
3. **Business Rules Engine -- Decision Table Entity & Evaluation** (D1-02)
4. **Business Rules Engine -- Rule Versioning & Audit Trail** (D1-02)
5. **Notification Template Manager -- Arabic/Bilingual Template Support with Islamic Product Terminology** (D1-03)

**Context**:
The Hijri calendar is used across all Islamic banking operations: profit distribution cycles, Zakat calculation dates, Ramadan-specific product offers, and regulatory reporting periods. The Business Rules Engine stores Shariah-specific rules (e.g., "late payment charges must go to charity", "Murabaha markup cannot be changed after contract signing") as configurable, auditable, version-controlled rule sets. The notification engine needs Arabic/bilingual templates that use correct Islamic terminology (e.g., "profit" not "interest", "financing" not "loan").

**Entities**: `HijriCalendar` (date mappings), `HijriHoliday`, `BusinessRule`, `BusinessRuleVersion`, `DecisionTable`, `DecisionTableRow`, `NotificationTemplateIslamic` (extends existing template with locale/direction support)

**Migration**: `V81__hijri_calendar_rules_engine.sql`

---

## PROMPT 03 -- Islamic Product Factory: Contract-Centric Product Configuration with Fatwa Linkage

**Phase**: 0 (Foundation)
**Domain**: D8 Administration + D6 Shariah Governance
**Capabilities** (batch of 5):
1. **Islamic Product Template Entity -- Contract-Type-Aware Product Definition** (D8-02)
2. **Product Fatwa Linkage -- No Product Activation Without Active Fatwa** (D8-02 / ST-001)
3. **Product Version Control & Change Tracking with SSB Review Trigger** (D8-02)
4. **Islamic Contract Type Registry -- Murabaha, Ijarah, Wadiah, Mudarabah, Musharakah, Salam, Istisna'a, Sukuk, Kafalah, Wakalah** (D8-02)
5. **Product Catalogue API with Shariah Compliance Status** (D8-02)

**Context**:
The Product Factory is the second critical Phase 0 deliverable. Every Islamic banking product must be defined as a contract template with specific Shariah parameters (profit rate vs interest rate, ownership transfer rules, risk-sharing ratios). Each product template must link to an active Fatwa from the SSB (built in Prompt 01). Any material change to a product template triggers an SSB Review Request automatically.

**Dependencies**: Prompt 01 (Fatwa Registry, SSB Review Request)

**Migration**: `V82__islamic_product_factory.sql`

---

## PROMPT 04 -- AAOIFI Chart of Accounts, Islamic GL Extensions, and Profit Equalization/Investment Risk Reserves

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- General Ledger
**Capabilities** (batch of 5):
1. **AAOIFI Chart of Accounts Structure -- Islamic Account Categories per FAS 1** (D2-01 / ST-017)
2. **Islamic GL Account Extensions -- Contract Type Tagging, Pool Assignment, Shariah Classification** (D2-01)
3. **Profit Equalisation Reserve (PER) Account & Logic** (D2-01 / ST-008)
4. **Investment Risk Reserve (IRR) Account & Logic** (D2-01 / ST-008)
5. **Islamic GL Posting Rules -- Automated Journal Entry Templates for Islamic Contracts** (D2-01)

**Context**:
AAOIFI FAS 1 requires specific chart-of-accounts structures that differ from conventional IFRS. Islamic GL must segregate: unrestricted investment accounts, restricted investment accounts, current accounts (Wadiah/Qard), financing receivables by contract type, and PER/IRR reserves. The PER smooths profit distribution to depositors; the IRR protects against investment losses. Both require SSB-approved policies (ST-008).

**Dependencies**: Prompt 01 (Fatwa Registry for PER/IRR policy approval)

**Migration**: `V83__aaoifi_chart_of_accounts.sql`

---

## PROMPT 05 -- Wadiah Current Accounts: Yad Dhamanah Deposit, Qard Hasan, and Hibah (Gift) Distribution

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Deposits
**Capabilities** (batch of 5):
1. **Wadiah Yad Dhamanah Account Entity & Product Configuration** (D2-03 / ST-018)
2. **Wadiah Account Opening Workflow with KYC Integration** (D2-03)
3. **Qard Hasan (Interest-Free Loan) Account Entity & Lifecycle** (D2-03)
4. **Hibah (Gift) Distribution Engine -- Discretionary, Non-Contractual** (D2-03 / ST-018)
5. **Wadiah Account Statement Generation with Islamic Terminology** (D2-03)

**Context**:
Wadiah is the foundation deposit product. Unlike conventional current accounts, Wadiah accounts guarantee the principal (bank holds as trustee with guarantee) but cannot contractually promise returns. Any distribution is Hibah (gift) at the bank's sole discretion. If Hibah becomes systematic/expected, it violates Shariah (ST-018). Qard Hasan is a benevolent loan where the bank lends money interest-free.

**Dependencies**: Prompt 03 (Product Factory), Prompt 04 (AAOIFI GL)

**Migration**: `V84__wadiah_deposits.sql`

---

## PROMPT 06 -- Mudarabah Investment Deposits: Savings, Term Deposits, and Profit-Sharing Ratio Configuration

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Deposits
**Capabilities** (batch of 5):
1. **Mudarabah Savings Account Entity & Product** (D2-04 / ST-006)
2. **Mudarabah Term Deposit Entity with Tenor & Maturity Management** (D2-04)
3. **Profit-Sharing Ratio (PSR) Configuration -- Agreed at Inception, Immutable** (D2-04 / ST-006)
4. **Mudarabah Pool Assignment & Weightage Calculation** (D2-04 / ST-007)
5. **Wakala Bil Istithmar (Investment Agency) Deposit Entity** (D2-04)

**Context**:
Mudarabah is the core investment deposit. The depositor provides capital (Rab al-Mal), the bank manages it (Mudarib). Profit is shared per agreed ratio; losses borne by the depositor (capital provider). The profit-sharing ratio MUST be agreed at inception and cannot be a fixed amount (ST-006). Pools must be genuinely segregated (ST-007). Wakala deposits use an agency model where the bank acts as agent for a fee.

**Dependencies**: Prompt 04 (Islamic GL, PER/IRR), Prompt 03 (Product Factory)

**Migration**: `V85__mudarabah_deposits.sql`

---

## PROMPT 07 -- Profit Distribution Engine: Pool Management, Calculation, Allocation, and PER/IRR Integration

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Profit Distribution
**Capabilities** (batch of 5):
1. **Investment Pool Entity -- Pool Definition, Asset Assignment, Segregation Enforcement** (D2-09 / ST-007)
2. **Profit Calculation Engine -- Pool Income Aggregation, Expense Deduction, Net Distributable Profit** (D2-09)
3. **Profit Allocation Logic -- Weightage-Based Distribution per Depositor Tier and Tenure** (D2-09 / ST-006)
4. **PER/IRR Reserve Allocation & Utilization within Distribution Cycle** (D2-09 / ST-008)
5. **Profit Distribution Run Entity -- Batch Execution, Audit Trail, SSB Certification** (D2-09)

**Context**:
The Profit Distribution Engine is the heart of Islamic deposit banking. It replaces interest accrual with actual profit/loss sharing. Pools collect income from financing activities (Murabaha, Ijarah, etc.), deduct bank expenses and management fees (Mudarib share), and distribute net profit to depositors based on their average daily balances, pool weightage, and agreed PSR. PER smooths distributions; IRR absorbs losses. Each distribution run must be auditable and SSB-certifiable.

**Dependencies**: Prompt 04 (GL/PER/IRR), Prompt 05 (Wadiah -- excluded from pools), Prompt 06 (Mudarabah -- included in pools)

**Migration**: `V86__profit_distribution_engine.sql`

---

## PROMPT 08 -- Murabaha Financing: Commodity Murabaha (Tawarruq), Asset Murabaha, and Ownership Sequence Enforcement

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Financing
**Capabilities** (batch of 5):
1. **Murabaha Financing Contract Entity -- Cost-Plus-Markup Structure** (D2-05 / ST-002 / ST-003)
2. **Commodity Murabaha (Tawarruq) Workflow -- Purchase -> Ownership -> Sale Sequence** (D2-05 / ST-002)
3. **Asset Murabaha -- Constructive Possession Verification** (D2-05 / ST-003)
4. **Murabaha Repayment Schedule Generation & Early Settlement** (D2-05)
5. **Murabaha GL Posting -- Deferred Profit Recognition per AAOIFI FAS 2/28** (D2-05)

**Context**:
Murabaha is the most common Islamic financing contract. The bank purchases an asset/commodity, takes ownership, then sells to the customer at cost + disclosed markup. The ownership sequence is critical: the bank MUST own the asset before selling it (ST-002, ST-003). Commodity Murabaha (Tawarruq) uses London Metal Exchange commodities as intermediary. Profit recognition follows AAOIFI FAS 2/28 (proportional over financing tenor, not upfront).

**Dependencies**: Prompt 03 (Product Factory), Prompt 04 (Islamic GL)

**Migration**: `V87__murabaha_financing.sql`

---

## PROMPT 09 -- Shariah Compliance Engine: Transaction Screening, SNCI Purification, and Shariah Audit Module

**Phase**: 1 (Go-Live Core)
**Domain**: D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **Shariah Transaction Screening Engine -- Real-Time Rule Evaluation** (D6-01 / ST-015)
2. **Shariah Non-Compliance Income (SNCI) Detection & Quarantine** (D6-01 / ST-014)
3. **SNCI Purification Workflow -- Charity Fund Management & Disbursement** (D6-01 / ST-014)
4. **Shariah Audit Module -- Periodic Sampling, Evidence Collection, Findings** (D6-01 / ST-020)
5. **Shariah Compliance Dashboard -- Compliance Score, Active Violations, Purification Status** (D6-01)

**Context**:
The Shariah Compliance Engine is the enforcement layer. Transaction screening checks every financing/investment transaction against SSB-defined rules (Haram merchant categories, prohibited counterparties, structural violations). Any non-compliant income is identified, quarantined in an SNCI account, and purified by donating to charity. The annual Shariah audit (ST-020) is mandatory in all GCC jurisdictions. The dashboard provides the SSB with real-time compliance posture.

**Dependencies**: Prompt 01 (Fatwa Registry for rule sourcing), Prompt 04 (Islamic GL for SNCI accounts)

**Migration**: `V88__shariah_compliance_engine.sql`

---

## PROMPT 10 -- Ijarah Financing: Operating Lease, Ijarah Muntahia Bittamleek (IMB), and Ownership Transfer Mechanism

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Financing
**Capabilities** (batch of 5):
1. **Ijarah (Operating Lease) Contract Entity -- Asset Ownership by Bank, Usufruct to Customer** (D2-06)
2. **Ijarah Muntahia Bittamleek (IMB) -- Lease-to-Own with Separate Transfer Promise** (D2-06 / ST-004)
3. **Ijarah Asset Registry -- Bank-Owned Assets Under Lease** (D2-06)
4. **Ijarah Rental Schedule & Maintenance Obligation Tracking** (D2-06)
5. **Ijarah GL Posting -- Rental Income Recognition per AAOIFI FAS 8/32** (D2-06)

**Context**:
In Ijarah, the bank owns the asset and leases its usufruct (right of use) to the customer. The bank bears ownership risks (insurance, major maintenance). In IMB (lease-to-own), the ownership transfer mechanism MUST be a separate contract from the lease (ST-004) -- it cannot be a condition of the lease itself (typically a separate promise/Wa'ad or gift/Hibah at end of term).

**Dependencies**: Prompt 03 (Product Factory), Prompt 04 (Islamic GL)

**Migration**: `V89__ijarah_financing.sql`

---

## PROMPT 11 -- Diminishing Musharakah: Home Finance, Partnership Accounting, and Gradual Ownership Transfer

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Financing
**Capabilities** (batch of 5):
1. **Diminishing Musharakah Contract Entity -- Joint Ownership with Declining Bank Share** (D2-07 / ST-005)
2. **Musharakah Partnership Unit Tracking -- Bank vs Customer Ownership Percentage** (D2-07)
3. **Musharakah Rental Calculation -- On Bank's Remaining Share** (D2-07)
4. **Musharakah Buyout Schedule -- Customer Purchases Bank Units Over Time** (D2-07)
5. **Musharakah Loss Sharing -- Proportional to Capital Contribution** (D2-07 / ST-005)

**Context**:
Diminishing Musharakah is the primary Islamic home/property financing structure. Bank and customer jointly purchase a property. The customer pays rent on the bank's share and periodically buys the bank's units until full ownership transfers. Losses MUST be borne proportionally to capital contribution, NOT profit ratio (ST-005). This is a critical Shariah compliance point.

**Dependencies**: Prompt 03, Prompt 04

**Migration**: `V90__diminishing_musharakah.sql`

---

## PROMPT 12 -- Fee & Charges Engine: Islamic Fee Configuration, Late Payment Charity Routing, and Shariah-Safe Penalties

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking
**Capabilities** (batch of 5):
1. **Islamic Fee Configuration -- Service-Based Fees (Ujrah) vs Prohibited Charges** (D2-11)
2. **Late Payment Handling -- Charity Routing for Penalty Income** (D2-11 / ST-009)
3. **Charity Fund Entity & Disbursement Management** (ST-009 / ST-014)
4. **Fee Accrual & Recognition per AAOIFI Standards** (D2-11)
5. **Fee Waiver Workflow with Shariah Justification** (D2-11)

**Context**:
Late payment charges in Islamic banking CANNOT be recognized as bank revenue. They must be donated to charity (ST-009). The Charity Fund is the single entity that receives both late payment penalties and SNCI purification amounts (from Prompt 09). This prompt also covers Ujrah (service fee) configurations that are Shariah-permissible.

**Dependencies**: Prompt 09 (SNCI for shared Charity Fund entity)

**Migration**: `V91__islamic_fee_engine.sql`

---

## PROMPT 13 -- Islamic Payment Hub: Domestic (RTGS/ACH), Cross-Border (SWIFT), and Instant Payments with Shariah Screening

**Phase**: 1 (Go-Live Core)
**Domain**: D2 Core Banking -- Payments
**Capabilities** (batch of 5):
1. **Islamic Payment Hub Entity Extensions -- Shariah Compliance Flag on Every Payment** (D2-10)
2. **Domestic Payment Processing -- SARIE (KSA) / UAEFTS Integration Points** (D2-10)
3. **Cross-Border Payment Processing -- SWIFT MT/MX with Islamic Metadata** (D2-10)
4. **Instant Payment Support -- IPS Integration Hooks** (D2-10)
5. **Payment Shariah Screening Integration -- Pre-Execution Check Against Haram Categories** (D2-10 / ST-015)

**Context**:
Payments in Islamic banking must pass through Shariah screening before execution. The screening checks for Haram counterparties (alcohol, gambling, pork, conventional interest-based institutions where prohibited). Each payment carries a Shariah compliance flag. Integration points for GCC payment rails (SARIE, UAEFTS, EFTS, QPAY) are defined but actual external connectivity is environment-dependent.

**Dependencies**: Prompt 09 (Shariah screening engine)

**Migration**: `V92__islamic_payment_hub.sql`

---

## PROMPT 14 -- Islamic Credit Risk: Shariah-Adapted Credit Scoring, IFRS 9 ECL for Islamic Contracts, and Collateral Management

**Phase**: 1 (Go-Live Core)
**Domain**: D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **Islamic Credit Scoring Model Entity -- Contract-Type-Specific Risk Parameters** (D6-03)
2. **IFRS 9 ECL Adaptation for Islamic Financing -- PD/LGD/EAD per Contract Type** (D6-03)
3. **Islamic Collateral Management Extensions -- Shariah-Permissible Collateral Types** (D6-03)
4. **Financing Risk Classification -- AAOIFI-Compliant Staging** (D6-03)
5. **Credit Risk Dashboard Extensions -- Islamic Portfolio Segmentation** (D6-03)

**Context**:
Islamic credit risk differs from conventional: Murabaha has deferred receivable risk, Ijarah has asset depreciation risk, Musharakah has equity participation risk. ECL models must account for contract-specific cash flow structures. Collateral must be Shariah-permissible (no conventional insurance-backed collateral, no interest-bearing securities as pledge).

**Dependencies**: Prompt 08 (Murabaha), Prompt 10 (Ijarah), Prompt 11 (Musharakah)

**Migration**: `V93__islamic_credit_risk.sql`

---

## PROMPT 15 -- AML/CFT & Sanctions for Islamic Banking: Transaction Monitoring, Sanctions Screening, STR/SAR Filing

**Phase**: 1 (Go-Live Core)
**Domain**: D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **Islamic Transaction Monitoring Extensions -- Murabaha/Ijarah-Specific Typologies** (D6-02)
2. **Sanctions Screening -- Customer & Counterparty Against GCC Lists** (D6-02)
3. **STR/SAR Filing Workflow -- GCC Jurisdiction-Aware Templates** (D6-02)
4. **Shariah-Restricted Entity Screening** (Integration Matrix: CIF -> AML/CFT)
5. **AML/CFT Dashboard Extensions for Islamic Banking** (D6-02)

**Context**:
AML/CFT in Islamic banking adds specific typologies: Commodity Murabaha round-tripping, structured Tawarruq abuse, layering through investment pools. Sanctions screening must cover GCC-specific lists (SAFIU for KSA, goAML for UAE). STR/SAR templates vary by jurisdiction. Shariah-restricted entity screening overlaps with but is distinct from sanctions screening.

**Dependencies**: Existing AML module (`com.cbs.aml`), Prompt 09 (Shariah screening)

**Migration**: `V94__islamic_aml_cft.sql`

---

## PROMPT 16 -- Regulatory Reporting: SAMA Prudential Returns, CBUAE EPRS, and Multi-Jurisdiction Template Engine

**Phase**: 1 (Go-Live Core)
**Domain**: D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **SAMA Prudential Returns Entity & Template Structure** (D6-05)
2. **CBUAE EPRS Return Entity & Template Structure** (D6-05)
3. **Multi-Jurisdiction Regulatory Template Engine -- Configurable per Country** (D6-05)
4. **Regulatory Return Data Extraction from Islamic GL & Products** (D6-05)
5. **Regulatory Return Submission Tracking & Audit** (D6-05)

**Context**:
GCC regulators require specific prudential returns that account for Islamic banking structures (e.g., unrestricted/restricted investment accounts reported separately from conventional deposits). SAMA (KSA) and CBUAE (UAE) have proprietary return formats with plans to migrate to XBRL. The template engine must be configurable per jurisdiction without code changes.

**Dependencies**: Prompt 04 (Islamic GL)

**Migration**: `V95__regulatory_reporting_islamic.sql`

---

## PROMPT 17 -- Zakat Computation: Zakat Base Calculation, ZATCA Integration, and SSB Methodology Approval

**Phase**: 1 (Go-Live Core, KSA)
**Domain**: D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **Zakat Computation Entity -- Zakat Base (Net Assets Method)** (D6-06 / ST-016)
2. **Zakat Asset & Liability Classification Rules** (D6-06)
3. **Zakat Calculation Engine -- 2.5% of Zakatable Base** (D6-06)
4. **ZATCA Integration Hooks -- Return Filing for KSA** (D6-06)
5. **Zakat SSB Methodology Approval Linkage** (D6-06 / ST-016)

**Context**:
Zakat is mandatory in KSA via ZATCA (Zakat, Tax, and Customs Authority). The Zakat base is calculated from net assets using the balance sheet approach. Certain assets are excluded (fixed assets used in operations, work-in-progress for own use). The methodology must be SSB-approved (ST-016). ZATCA integration allows electronic filing of Zakat returns.

**Dependencies**: Prompt 04 (Islamic GL for asset/liability values), Prompt 01 (SSB for methodology approval)

**Migration**: `V96__zakat_computation.sql`

---

## PROMPT 18 -- Islamic Debit Card Management: Shariah-Compliant Card Issuance, Controls, and Transaction Routing

**Phase**: 1 (Go-Live Core)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Islamic Debit Card Product Entity -- Linked to Wadiah/Mudarabah Accounts** (D5-04)
2. **Card Issuance Workflow for Islamic Accounts** (D5-04)
3. **Transaction Routing with Shariah Merchant Category Blocking** (D5-04 / ST-015)
4. **Card Controls -- Islamic-Specific MCC Restrictions** (D5-04)
5. **Debit Card GL Integration with Islamic Account Types** (D5-04)

**Context**:
Islamic debit cards must block transactions at Haram merchant category codes (liquor stores, casinos, conventional interest-based services). Card issuance links to Wadiah or Mudarabah accounts. Transaction routing checks the Shariah compliance engine before authorization.

**Dependencies**: Prompt 05 (Wadiah), Prompt 06 (Mudarabah), Prompt 09 (Shariah screening)

**Migration**: `V97__islamic_debit_card.sql`

---

## PROMPT 19 -- Islamic Internet Banking: Retail & Corporate Portal with Islamic Product Presentation

**Phase**: 1 (Go-Live Core)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Islamic Retail Internet Banking -- Account Views with Islamic Terminology** (D5-01)
2. **Corporate Internet Banking -- Financing Facility Views** (D5-01)
3. **Islamic Product Marketplace -- Browse Available Shariah-Compliant Products** (D5-01)
4. **Profit Distribution Statement View -- Monthly/Quarterly Distribution History** (D5-01)
5. **Islamic Digital Onboarding -- Product Application with Shariah Disclosure** (D5-01)

**Context**:
Digital channels must present Islamic products correctly: "profit" not "interest", "financing" not "loan", "Murabaha installment" not "EMI". Account statements show profit distributions, not interest credits. The product marketplace shows Shariah-compliant products with their Fatwa references.

**Dependencies**: Prompt 05-08 (Islamic deposit and financing products)

**Migration**: `V98__islamic_internet_banking.sql` (minimal -- mostly frontend)

---

## PROMPT 20 -- Islamic Mobile Banking: Retail App Extensions, QR Payments, and Wallet with Shariah Controls

**Phase**: 1 (Go-Live Core)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Mobile Banking API Extensions for Islamic Accounts** (D5-02)
2. **QR Payment Shariah Screening on Mobile** (D5-02)
3. **Mobile Wallet -- Shariah-Compliant Stored Value** (D5-02)
4. **Push Notification Templates -- Arabic/Islamic Terminology** (D5-02)
5. **Mobile Profit Distribution Alerts** (D5-02)

**Context**:
Mobile banking mirrors internet banking with smaller-screen optimization. QR payments need real-time Shariah screening. The mobile wallet stores value in a Wadiah (trust) structure, not a conventional e-wallet. Push notifications in Arabic use Islamic banking terminology.

**Dependencies**: Prompt 19 (Internet banking APIs)

**Migration**: `V99__islamic_mobile_banking.sql` (minimal)

---

## PROMPT 21 -- Open Banking / API Gateway: Islamic API Products, Consent Management, and Third-Party Shariah Disclosure

**Phase**: 1 (Go-Live Core)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Open Banking API Product Extensions for Islamic Accounts** (D5-05)
2. **Consent Management -- Shariah-Sensitive Data Protection** (D5-05 / ST-019)
3. **API Gateway -- Islamic Product API Documentation** (D5-05)
4. **Third-Party Provider (TPP) Access Controls for Islamic Data** (D5-05)
5. **PSD2-Equivalent GCC Open Banking Compliance** (D5-05)

**Context**:
Open Banking APIs must not expose Islamic financing details inappropriately (ST-019). Consent management must account for Shariah-sensitive data (financing contract terms, profit-sharing ratios, Shariah compliance status). GCC Open Banking frameworks (SAMA for KSA, CBUAE for UAE) have specific requirements.

**Dependencies**: Existing Open Banking module

**Migration**: `V100__islamic_open_banking.sql`

---

## PROMPT 22 -- Islamic Frontend: Shariah Governance UI -- SSB Dashboard, Fatwa Registry, Review Workflow Pages

**Phase**: 1 (Go-Live Core)
**Domain**: Frontend -- D1/D6 Governance
**Capabilities** (batch of 5):
1. **SSB Dashboard Page -- Active Reviews, Fatwa Stats, Compliance Posture** (frontend)
2. **Fatwa Registry Page -- List, Detail, Create, Activate/Revoke** (frontend)
3. **SSB Review Workflow Page -- Submit, Vote, Track, Resolve** (frontend)
4. **SSB Board Member Management Page** (frontend)
5. **Shariah Compliance Dashboard Page -- Screening Stats, SNCI Status, Audit Findings** (frontend)

**Context**:
All backend APIs from Prompts 01 and 09 need corresponding frontend pages. The SSB Dashboard is the primary screen for Shariah board members. The Fatwa Registry allows browsing and managing all rulings. The Review Workflow page shows pending reviews with inline voting. The Compliance Dashboard shows real-time Shariah compliance metrics.

**Dependencies**: Prompt 01, Prompt 09 (backend APIs)

**Files**: All in `cbs-frontend/src/features/shariah/`

---

## PROMPT 23 -- Islamic Frontend: Wadiah & Mudarabah Account Pages, Profit Distribution Views

**Phase**: 1 (Go-Live Core)
**Domain**: Frontend -- D2 Deposits
**Capabilities** (batch of 5):
1. **Wadiah Account List & Detail Pages with Islamic Terminology** (frontend)
2. **Mudarabah Account List & Detail Pages with PSR Display** (frontend)
3. **Islamic Account Opening Wizard -- Contract Selection, PSR Agreement, Shariah Disclosure** (frontend)
4. **Profit Distribution History Page -- Pool-Level and Account-Level Views** (frontend)
5. **Islamic Deposit Dashboard -- Pool Performance, Distribution Calendar, Reserve Status** (frontend)

**Dependencies**: Prompt 05, 06, 07 (backend APIs)

---

## PROMPT 24 -- Islamic Frontend: Murabaha, Ijarah, and Musharakah Financing Pages

**Phase**: 1 (Go-Live Core)
**Domain**: Frontend -- D2 Financing
**Capabilities** (batch of 5):
1. **Murabaha Financing Application Page -- Commodity/Asset Selection, Ownership Verification** (frontend)
2. **Murabaha Contract Detail Page -- Repayment Schedule, Deferred Profit, Early Settlement** (frontend)
3. **Ijarah Financing Pages -- Lease Contract, Asset Registry, Rental Schedule** (frontend)
4. **Diminishing Musharakah Pages -- Ownership Tracker, Buyout Schedule, Rental on Bank Share** (frontend)
5. **Islamic Financing Dashboard -- Portfolio by Contract Type, Profit Recognition, Compliance Status** (frontend)

**Dependencies**: Prompt 08, 10, 11 (backend APIs)

---

## PROMPT 25 -- Islamic Frontend: Zakat, Regulatory Reporting, and AML/CFT Pages

**Phase**: 1 (Go-Live Core)
**Domain**: Frontend -- D6 Risk/Compliance
**Capabilities** (batch of 5):
1. **Zakat Computation Page -- Base Calculation, Asset Classification, Filing Status** (frontend)
2. **Islamic Regulatory Reporting Page -- SAMA/CBUAE Return Management** (frontend)
3. **AML/CFT Islamic Extensions Page -- Islamic Typology Alerts, STR Filing** (frontend)
4. **Islamic Credit Risk Dashboard -- Contract-Type Segmentation, ECL by Stage** (frontend)
5. **Charity Fund Management Page -- SNCI Purification, Late Payment Routing, Disbursement** (frontend)

**Dependencies**: Prompt 14-17 (backend APIs)

---

## PROMPT 26 -- Full Musharakah (Project Finance): Partnership Entity, Capital Contribution, and Profit/Loss Sharing

**Phase**: 2 (Expansion)
**Domain**: D2 Core Banking -- Financing
**Capabilities** (batch of 5):
1. **Full Musharakah Contract Entity -- Joint Venture/Project Finance Structure** (D2-07)
2. **Capital Contribution Tracking -- Multiple Partner Entities** (D2-07)
3. **Musharakah Profit Distribution -- Per Agreed Ratio, Loss Per Capital Ratio** (D2-07 / ST-005)
4. **Musharakah Project Lifecycle -- Active, Completed, Wound Down** (D2-07)
5. **Full Musharakah GL Posting -- Equity Method Accounting per AAOIFI FAS 4** (D2-07)

**Dependencies**: Prompt 11 (Diminishing Musharakah base), Prompt 04 (Islamic GL)

**Migration**: `V101__full_musharakah.sql`

---

## PROMPT 27 -- Istisna'a Financing: Construction/Manufacturing Finance with Progress Billing

**Phase**: 2 (Expansion)
**Domain**: D2 Core Banking -- Financing
**Capabilities** (batch of 5):
1. **Istisna'a Contract Entity -- Manufacturing/Construction Financing** (D2-08)
2. **Istisna'a Progress Billing -- Milestone-Based Payments** (D2-08)
3. **Parallel Istisna'a -- Bank Commissions Subcontractor** (D2-08)
4. **Istisna'a Completion & Delivery Workflow** (D2-08)
5. **Istisna'a GL Posting per AAOIFI FAS 10** (D2-08)

**Context**:
Istisna'a finances the manufacture or construction of an asset. The bank orders an asset to be built per specifications, then sells it to the customer. Parallel Istisna'a allows the bank to subcontract construction. Payments are typically milestone-based.

**Dependencies**: Prompt 03, Prompt 04

**Migration**: `V102__istisna_financing.sql`

---

## PROMPT 28 -- Salam Financing: Forward Sale with Full Upfront Payment and Delivery Tracking

**Phase**: 2 (Expansion)
**Domain**: D2 Core Banking -- Financing
**Capabilities** (batch of 5):
1. **Salam Contract Entity -- Forward Sale with Full Payment at Inception** (D2-08 / ST-022)
2. **Salam Payment Enforcement -- Full Price Must Be Paid at Contract Signing** (ST-022)
3. **Salam Delivery Tracking -- Commodity Specification, Delivery Date, Location** (D2-08)
4. **Parallel Salam -- Bank Sells Forward to Third Party** (D2-08)
5. **Salam GL Posting per AAOIFI FAS 7** (D2-08)

**Context**:
Salam is a forward sale where the buyer pays the FULL price at contract inception and the seller delivers the commodity at a future date. Deferred payment voids the Salam contract (ST-022). This is primarily used for agricultural/commodity financing.

**Dependencies**: Prompt 03, Prompt 04

**Migration**: `V103__salam_financing.sql`

---

## PROMPT 29 -- Sukuk Management: Portfolio Tracking, Coupon/Profit Processing, and Underlying Asset Verification

**Phase**: 2 (Expansion)
**Domain**: D3 Treasury & Capital Markets
**Capabilities** (batch of 5):
1. **Sukuk Entity -- Multiple Structures (Ijarah Sukuk, Murabaha Sukuk, Wakalah Sukuk, Musharakah Sukuk)** (D3-01 / ST-011)
2. **Sukuk Portfolio Tracker -- Holdings, Maturity, Yield, Rating** (D3-01)
3. **Sukuk Coupon/Profit Processing -- Periodic Distribution Calculation** (D3-01)
4. **Underlying Asset Verification -- Real Asset Must Be Identifiable** (ST-011)
5. **Sukuk GL Posting and Valuation per AAOIFI FAS 17/25** (D3-01)

**Context**:
Sukuk are Islamic bonds where the investor owns a share of an underlying real asset. Unlike conventional bonds (debt obligations), Sukuk must have identifiable underlying assets (ST-011). The bank must verify this for every Sukuk position.

**Dependencies**: Prompt 04 (Islamic GL), existing Treasury module

**Migration**: `V104__sukuk_management.sql`

---

## PROMPT 30 -- Islamic Interbank Placements: Commodity Murabaha and Wakalah Placements

**Phase**: 2 (Expansion)
**Domain**: D3 Treasury & Capital Markets
**Capabilities** (batch of 5):
1. **Commodity Murabaha Interbank Placement Entity** (D3-02)
2. **Wakalah Interbank Placement Entity** (D3-02)
3. **Interbank Counterparty Shariah Compliance Check** (D3-02)
4. **Interbank Placement Maturity & Rollover Management** (D3-02)
5. **Interbank Placement GL Posting** (D3-02)

**Dependencies**: Prompt 08 (Murabaha base), Prompt 04 (Islamic GL), existing Interbank module

**Migration**: `V105__islamic_interbank.sql`

---

## PROMPT 31 -- Islamic FX: Spot FX (Bay' al-Sarf) and Islamic Hedging (Wa'ad) with Unilateral Promise Enforcement

**Phase**: 2 (Expansion)
**Domain**: D3 Treasury & Capital Markets
**Capabilities** (batch of 5):
1. **Spot FX (Bay' al-Sarf) Entity -- Same-Day Settlement Requirement** (D3-03)
2. **Islamic Hedging (Wa'ad) Entity -- Unilateral Promise Structure** (D3-03 / ST-010)
3. **Wa'ad Bilateral Promise Detection & Block** (ST-010)
4. **FX Deal Shariah Compliance Validation** (D3-03)
5. **Islamic FX GL Posting** (D3-03)

**Context**:
Bay' al-Sarf requires same-session settlement for FX. Wa'ad-based hedging must be unilateral (one-way promise) -- bilateral binding promises constitute a forbidden derivative (ST-010). The system must detect and block bilateral Wa'ad structures.

**Dependencies**: Prompt 04 (Islamic GL), existing FX module

**Migration**: `V106__islamic_fx.sql`

---

## PROMPT 32 -- Islamic Liquidity Management: Position Monitor and Collateralized Murabaha Repo

**Phase**: 2 (Expansion)
**Domain**: D3 Treasury & Capital Markets
**Capabilities** (batch of 5):
1. **Islamic Liquidity Position Monitor -- Shariah-Compliant HQLA Classification** (D3-04)
2. **Collateralized Murabaha Repo Entity -- Commodity-Backed Liquidity** (D3-04)
3. **Islamic LCR/NSFR Calculation -- Sukuk as HQLA** (D3-04)
4. **Liquidity Contingency Planning -- Islamic Instruments** (D3-04)
5. **Islamic Liquidity Dashboard** (D3-04)

**Dependencies**: Prompt 29 (Sukuk as HQLA), Prompt 04 (Islamic GL)

**Migration**: `V107__islamic_liquidity.sql`

---

## PROMPT 33 -- Islamic Letters of Credit: Wakalah-Based, Murabaha-Based, and Musharakah LC

**Phase**: 2 (Expansion)
**Domain**: D4 Trade Finance
**Capabilities** (batch of 5):
1. **Wakalah-Based LC Entity -- Bank Acts as Agent for Importer** (D4-01)
2. **Murabaha-Based LC Entity -- Bank Purchases Goods, Sells to Importer at Markup** (D4-01 / ST-012)
3. **Musharakah LC Entity -- Joint Purchase Arrangement** (D4-01)
4. **LC Document Management -- Shariah-Compliant Document Checklist** (D4-01)
5. **Islamic LC GL Posting** (D4-01)

**Context**:
Islamic LCs replace conventional LC structures with Shariah-compliant alternatives. Murabaha LC requires the bank to take constructive possession of goods (ST-012). Wakalah LC uses an agency model. Musharakah LC involves joint ownership.

**Dependencies**: Prompt 04 (Islamic GL), existing Trade Finance module

**Migration**: `V108__islamic_lc.sql`

---

## PROMPT 34 -- Islamic Guarantees (Kafalah): Financial, Performance, and Bid Bond Guarantees

**Phase**: 2 (Expansion)
**Domain**: D4 Trade Finance
**Capabilities** (batch of 5):
1. **Kafalah Financial Guarantee Entity** (D4-02)
2. **Kafalah Performance Guarantee Entity** (D4-02)
3. **Kafalah Bid Bond Entity** (D4-02)
4. **Kafalah Fee Structure -- Ujrah (Service Fee) Not Riba** (D4-02)
5. **Kafalah GL Posting & Contingent Liability Tracking** (D4-02)

**Context**:
Kafalah (guarantee/surety) is Shariah-permissible when the fee is structured as Ujrah (service charge) rather than compensation for risk transfer (which would be insurance/gharar). The guarantor (bank) pledges to fulfill an obligation if the principal debtor defaults.

**Dependencies**: Prompt 04 (Islamic GL), existing Guarantee module

**Migration**: `V109__islamic_kafalah.sql`

---

## PROMPT 35 -- Islamic Documentary Collections: Import & Export Collection with Shariah Service Model

**Phase**: 2 (Expansion)
**Domain**: D4 Trade Finance
**Capabilities** (batch of 5):
1. **Islamic Import Collection Entity -- Service-Based (No Interest on Delays)** (D4-03)
2. **Islamic Export Collection Entity** (D4-03)
3. **Collection Fee Structure -- Ujrah Model** (D4-03)
4. **Collection Document Workflow with Shariah Checkpoints** (D4-03)
5. **Documentary Collection GL Posting** (D4-03)

**Dependencies**: Prompt 04, existing Trade Finance module

**Migration**: `V110__islamic_documentary_collections.sql`

---

## PROMPT 36 -- Shariah-Compliant Credit Card: Tawarruq/Ujrah Structure with SSB Fatwa Linkage

**Phase**: 2 (Expansion)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Islamic Credit Card Product Entity -- Tawarruq or Ujrah-Based** (D5-04 / ST-013)
2. **Credit Card Shariah Structure Configuration -- Cost-Plus or Fee-Based** (D5-04)
3. **Credit Card SSB Fatwa Requirement Enforcement** (ST-013)
4. **Haram Merchant Category Code Blocking on Credit Card** (D5-04 / ST-015)
5. **Islamic Credit Card GL Posting** (D5-04)

**Context**:
Islamic credit cards must have a dedicated SSB Fatwa (ST-013). Two structures: Tawarruq (commodity-based credit line) or Ujrah (annual membership fee covering costs). The card must block Haram MCCs. Annual SSB review is required.

**Dependencies**: Prompt 18 (Debit card base), Prompt 01 (Fatwa registry)

**Migration**: `V111__islamic_credit_card.sql`

---

## PROMPT 37 -- Islamic Prepaid Card: Shariah-Compliant Stored Value with Wadiah Underlying

**Phase**: 2 (Expansion)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Islamic Prepaid Card Product Entity -- Wadiah-Based Stored Value** (D5-04)
2. **Prepaid Card Load/Unload Workflow** (D5-04)
3. **Prepaid Card Shariah Controls -- MCC Blocking, Expiry Handling** (D5-04)
4. **Prepaid Card to Wadiah Account Reconciliation** (D5-04)
5. **Prepaid Card GL Integration** (D5-04)

**Dependencies**: Prompt 05 (Wadiah), Prompt 18 (Card base)

**Migration**: `V112__islamic_prepaid_card.sql`

---

## PROMPT 38 -- Agent Banking: Agent Onboarding with Wakalah Contract, Transaction Monitoring, Commission Tracking

**Phase**: 2 (Expansion)
**Domain**: D5 Digital & Channel Layer
**Capabilities** (batch of 5):
1. **Islamic Agent Entity -- Wakalah (Agency) Contract Structure** (D5-03)
2. **Agent Onboarding Workflow with Shariah Compliance Check** (D5-03)
3. **Agent Transaction Monitoring -- Shariah Screening on Agent-Initiated Transactions** (D5-03)
4. **Agent Commission Structure -- Ujrah (Service Fee) Model** (D5-03)
5. **Agent Performance & Compliance Dashboard** (D5-03)

**Dependencies**: Prompt 09 (Shariah screening), existing Agent Banking module

**Migration**: `V113__islamic_agent_banking.sql`

---

## PROMPT 39 -- Operational Risk: Incident & Loss Event Management, KRI Monitoring for Islamic Operations

**Phase**: 2 (Expansion)
**Domain**: D6 Risk, Compliance & Shariah Governance
**Capabilities** (batch of 5):
1. **Islamic Operational Risk Event Entity -- Shariah Non-Compliance as Risk Category** (D6-04)
2. **Loss Event Management -- SNCI Losses as Operational Risk Events** (D6-04)
3. **Key Risk Indicators (KRIs) for Islamic Banking -- Shariah Compliance KRIs** (D6-04)
4. **RCSA (Risk Control Self-Assessment) for Islamic Processes** (D6-04)
5. **Operational Risk Dashboard with Islamic Risk Categories** (D6-04)

**Dependencies**: Prompt 09 (SNCI), existing OpRisk module

**Migration**: `V114__islamic_operational_risk.sql`

---

## PROMPT 40 -- AAOIFI Financial Statements: Statement of Financial Position, Income Statement, Zakat Statement, Restricted Investments

**Phase**: 2 (Expansion)
**Domain**: D7 Analytics & Reporting
**Capabilities** (batch of 5):
1. **AAOIFI Statement of Financial Position -- Balance Sheet per FAS 1** (D7-02)
2. **AAOIFI Income Statement -- Revenue by Islamic Contract Type** (D7-02)
3. **Statement of Sources & Uses of Zakah** (D7-02)
4. **Statement of Restricted Investments -- Mudarabah/Wakalah Pools** (D7-02)
5. **AAOIFI Financial Statement Generation Engine & Export** (D7-02)

**Context**:
AAOIFI financial statements differ significantly from IFRS: separate presentation of unrestricted/restricted investment accounts, equity of investment account holders as a distinct liability class, profit distribution as an allocation (not expense), and dedicated Zakat statement.

**Dependencies**: Prompt 04 (AAOIFI GL), Prompt 07 (Profit Distribution), Prompt 17 (Zakat)

**Migration**: `V115__aaoifi_financial_statements.sql`

---

## PROMPT 41 -- Management Information System (MIS): Islamic Banking Executive Dashboard and Branch/Channel Performance

**Phase**: 2 (Expansion)
**Domain**: D7 Analytics & Reporting
**Capabilities** (batch of 5):
1. **Islamic Executive Dashboard -- Total Financing, Deposits by Pool, Profit Distribution Summary** (D7-01)
2. **Branch Performance Metrics -- Islamic Product Penetration** (D7-01)
3. **Channel Performance -- Digital Adoption for Islamic Products** (D7-01)
4. **Islamic Product Profitability Analysis** (D7-01)
5. **SSB Governance MIS -- Review Cycle Times, Compliance Trends** (D7-01)

**Dependencies**: Prompts 05-11 (Islamic products), Prompt 01 (SSB), Prompt 09 (Compliance)

**Migration**: `V116__islamic_mis.sql`

---

## PROMPT 42 -- Data Warehouse & BI: ETL Pipeline for Islamic Contract Attributes and Self-Service BI Portal

**Phase**: 2 (Expansion)
**Domain**: D7 Analytics & Reporting
**Capabilities** (batch of 5):
1. **ETL Pipeline Entity -- Islamic Contract Attribute Extraction** (D7-03)
2. **Islamic Data Mart Definitions -- Deposit Pools, Financing by Type, Compliance** (D7-03)
3. **Self-Service BI Portal Extensions for Islamic Reporting** (D7-03)
4. **Islamic Product Analytics -- Pool Returns, Murabaha Margin, Ijarah Yield** (D7-03)
5. **Shariah Compliance Analytics -- Screening Hit Rate, SNCI Trend, Audit Coverage** (D7-03)

**Dependencies**: All Islamic product prompts

**Migration**: `V117__islamic_data_warehouse.sql`

---

## PROMPT 43 -- Islamic Frontend: Sukuk Portfolio, Treasury, and Interbank Pages

**Phase**: 2 (Expansion)
**Domain**: Frontend -- D3 Treasury
**Capabilities** (batch of 5):
1. **Sukuk Portfolio Page -- Holdings, Maturity Profile, Coupon Calendar** (frontend)
2. **Islamic Interbank Placement Page -- Active Placements, Maturity Tracker** (frontend)
3. **Islamic FX Dealing Page -- Spot FX, Wa'ad Structures** (frontend)
4. **Islamic Liquidity Dashboard Page -- HQLA, LCR/NSFR, Position Monitor** (frontend)
5. **Islamic Treasury Dashboard -- Integrated View of All Islamic Treasury Products** (frontend)

**Dependencies**: Prompts 29-32 (backend APIs)

---

## PROMPT 44 -- Islamic Frontend: Trade Finance Pages -- LC, Kafalah, Documentary Collections

**Phase**: 2 (Expansion)
**Domain**: Frontend -- D4 Trade Finance
**Capabilities** (batch of 5):
1. **Islamic LC Pages -- Wakalah/Murabaha/Musharakah LC List and Detail** (frontend)
2. **Kafalah Guarantee Pages -- Financial/Performance/Bid Bond Management** (frontend)
3. **Islamic Documentary Collections Pages** (frontend)
4. **Islamic Trade Finance Dashboard -- Active LCs, Guarantees, Collections** (frontend)
5. **Islamic Trade Finance Application Wizard** (frontend)

**Dependencies**: Prompts 33-35 (backend APIs)

---

## PROMPT 45 -- Islamic Frontend: Credit Card, Prepaid Card, and Agent Banking Pages

**Phase**: 2 (Expansion)
**Domain**: Frontend -- D5 Channels
**Capabilities** (batch of 5):
1. **Islamic Credit Card Pages -- Application, Detail, Shariah Structure Display** (frontend)
2. **Islamic Prepaid Card Pages -- Load/Unload, Balance, Transactions** (frontend)
3. **Agent Banking Islamic Pages -- Agent List, Onboarding, Commission, Performance** (frontend)
4. **Islamic Card Dashboard -- All Islamic Card Products Unified View** (frontend)
5. **Shariah MCC Blocking Configuration Page** (frontend)

**Dependencies**: Prompts 36-38 (backend APIs)

---

## PROMPT 46 -- Islamic Frontend: AAOIFI Financial Statements, MIS, and BI Portal Pages

**Phase**: 2 (Expansion)
**Domain**: Frontend -- D7 Analytics
**Capabilities** (batch of 5):
1. **AAOIFI Financial Statement Viewer Page -- All 4 Statement Types** (frontend)
2. **Islamic Executive Dashboard Page** (frontend)
3. **Islamic Product Profitability Page** (frontend)
4. **Islamic BI Self-Service Portal Page** (frontend)
5. **Zakat Statement & History Page** (frontend)

**Dependencies**: Prompts 40-42 (backend APIs)

---

## PROMPT 47 -- Islamic Frontend: Operational Risk, Istisna'a, Salam, and Full Musharakah Pages

**Phase**: 2 (Expansion)
**Domain**: Frontend -- D2/D6
**Capabilities** (batch of 5):
1. **Istisna'a Financing Pages -- Application, Contract Detail, Progress Billing** (frontend)
2. **Salam Financing Pages -- Contract, Payment Verification, Delivery Tracking** (frontend)
3. **Full Musharakah Pages -- Partnership Detail, Capital Contributions, P&L Sharing** (frontend)
4. **Islamic Operational Risk Dashboard** (frontend)
5. **Islamic Financing Comparison Page -- Side-by-Side Contract Type Comparison** (frontend)

**Dependencies**: Prompts 26-28, 39 (backend APIs)

---

## PROMPT 48 -- Navigation, Routing, and Layout Integration: Islamic Module Sidebar, Routes, and Lazy Loading

**Phase**: Cross-cutting
**Domain**: Frontend Infrastructure
**Capabilities** (batch of 5):
1. **Islamic Banking Navigation Section in Sidebar** (frontend)
2. **Route Definitions for All Islamic Pages** (frontend)
3. **Lazy Route Registration for All Islamic Page Components** (frontend)
4. **Islamic Module API Client & Hook Index Files** (frontend)
5. **Islamic Module Type Definition Index** (frontend)

**Context**:
All Islamic frontend pages from Prompts 22-25 and 43-47 need to be registered in the router, added to navigation, and lazy-loaded. This prompt is the integration glue that makes all Islamic pages discoverable and navigable.

**Dependencies**: All frontend prompts (22-25, 43-47)

---

## PROMPT 49 -- Backend Integration Testing: End-to-End Islamic Transaction Lifecycle Tests

**Phase**: Cross-cutting
**Domain**: Testing
**Capabilities** (batch of 5):
1. **Integration Test: Murabaha Lifecycle -- Apply -> Approve -> Disburse -> Repay -> Close** (test)
2. **Integration Test: Mudarabah Deposit -> Pool Assignment -> Profit Distribution -> Statement** (test)
3. **Integration Test: SSB Review -> Fatwa -> Product Activation -> Customer Onboarding -> Account Opening** (test)
4. **Integration Test: Shariah Screening -> SNCI Detection -> Purification -> Charity Disbursement** (test)
5. **Integration Test: Ijarah Contract -> Rental Schedule -> Ownership Transfer (IMB)** (test)

**Context**:
These are full end-to-end integration tests using TestContainers (PostgreSQL) that validate the complete Islamic banking lifecycle across multiple modules. Each test exercises the real database, real services, and real controllers.

**Dependencies**: All backend prompts (01-21, 26-42)

---

## PROMPT 50 -- GCC Jurisdiction Configuration, Multi-Jurisdiction Support, and Islamic Platform Hardening

**Phase**: Cross-cutting / Phase 3
**Domain**: D8 Administration + Platform
**Capabilities** (batch of 5):
1. **GCC Jurisdiction Configuration Entity -- KSA, UAE, Bahrain, Qatar, Kuwait, Oman Profiles** (D8)
2. **Jurisdiction-Specific Regulatory Rule Loading** (D8)
3. **Multi-Currency Islamic Product Support -- GCC Currency Coverage** (D8)
4. **National ID Integration Hooks -- Absher/Nafath (KSA), UAE Pass, Bahrain eKey** (D8)
5. **Credit Bureau Integration Hooks -- SIMAH (KSA), AECB (UAE), BENEFIT (Bahrain)** (D8)

**Context**:
This final prompt establishes the jurisdiction configuration framework. Each GCC country has different regulatory requirements (GCC Regulatory Map sheet), payment systems, national ID providers, and credit bureaus. The jurisdiction entity controls which regulatory returns are required, which payment rails are available, which ID systems are integrated, and which benchmark rates are used for indicative pricing.

**Dependencies**: All previous prompts

**Migration**: `V118__gcc_jurisdiction_config.sql`

---

## Execution Summary

| Prompt Range | Phase | Domain | Capabilities |
|---|---|---|---|
| 01-03 | Phase 0 | Foundation | SSB Governance, Hijri Calendar, Rules Engine, Product Factory |
| 04-07 | Phase 1 | Core Banking | AAOIFI GL, Wadiah, Mudarabah, Profit Distribution |
| 08-13 | Phase 1 | Core Banking | Murabaha, Shariah Compliance, Ijarah, Musharakah, Fees, Payments |
| 14-17 | Phase 1 | Risk/Compliance | Credit Risk, AML/CFT, Regulatory, Zakat |
| 18-21 | Phase 1 | Channels | Debit Card, Internet/Mobile Banking, Open Banking |
| 22-25 | Phase 1 | Frontend | Governance UI, Deposit UI, Financing UI, Compliance UI |
| 26-28 | Phase 2 | Financing | Full Musharakah, Istisna'a, Salam |
| 29-32 | Phase 2 | Treasury | Sukuk, Interbank, FX, Liquidity |
| 33-35 | Phase 2 | Trade Finance | Islamic LC, Kafalah, Collections |
| 36-38 | Phase 2 | Channels | Credit Card, Prepaid, Agent Banking |
| 39-42 | Phase 2 | Risk/Analytics | OpRisk, AAOIFI Statements, MIS, BI |
| 43-47 | Phase 2 | Frontend | Treasury UI, Trade Finance UI, Card UI, Analytics UI |
| 48 | Cross-cutting | Frontend Infra | Navigation, Routing, Lazy Loading |
| 49 | Cross-cutting | Testing | End-to-End Integration Tests |
| 50 | Phase 3 | Platform | GCC Jurisdiction Config, Multi-Currency, External Integrations |

**Total**: 50 prompts x 5 capabilities = **250 capabilities** covering all 100 module inventory rows with full implementation depth (entities, DTOs, services, controllers, migrations, tests, frontend pages).
