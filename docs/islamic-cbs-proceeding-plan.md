# Islamic CBS Proceeding Plan

## Purpose

This plan turns `/Users/mac/codes/cba/docs/Islamic_CBS_Module_Inventory.xlsx` into an executable programme for extending DigiCore CBS into a GCC-grade Islamic core banking platform.

The workbook is useful, but it is not yet a reliable delivery baseline on its own. It contains enough structure to drive planning, architecture, and backlog formation, but it needs reconciliation and decomposition before engineering work should begin.

## What The Workbook Already Gives Us

- 8 domains across workflow, core banking, treasury, trade finance, digital, risk/compliance, analytics, and administration.
- 41 unique modules and 100 detailed inventory rows in `Module Inventory`.
- 22 explicit Shariah control points in `Shariah Touchpoints`.
- 14 GCC regulatory areas across KSA, UAE, Bahrain, Qatar, Kuwait, and Oman.
- 20 key integration relationships in `Integration Matrix`.
- A phased rollout model:
  - `Phase 0`: foundation and platform
  - `Phase 1`: go-live core banking
  - `Phase 2`: advanced Islamic products, treasury, trade finance, analytics
  - `Phase 3`: optimisation and scale

## Immediate Finding

The workbook is internally inconsistent and should not be treated as a final source of truth yet.

- The `Dashboard` sheet shows `39` modules, `166` sub-modules, and `67` touchpoints.
- The detailed sheets reconcile to `41` unique modules, `100` module-inventory rows, and `22` Shariah touchpoints.
- The dashboard domain counts are also out of sync with the `Module Inventory` sheet.

Recommendation: use `Module Inventory`, `Shariah Touchpoints`, `Implementation Phases`, and `Integration Matrix` as the working source of truth until the dashboard is rebuilt from formulas or regenerated from normalized data.

## Strategic Read Of The Repo

The current repo already has strong conventional-core coverage and broad platform documentation, but the Islamic scope is still high-level.

- `docs/digicore-cbs-platform-overview.md` describes a broad modern CBS, not an Islamic operating model.
- `docs/modern-core-banking-capabilities.md` includes Islamic Finance as a single capability, but not at the level of contracts, SSB workflow, profit distribution, purification, AAOIFI accounting, or GCC jurisdictional variants.
- The workbook is therefore not a minor feature list. It is a domain expansion that affects product design, workflow orchestration, accounting, compliance, reporting, channels, and integration contracts.

## Recommended Approach

Proceed in seven workstreams, in this order.

### 1. Normalize The Workbook Into A Delivery Baseline

Target: 1 to 2 weeks

Actions:

- Reconcile dashboard totals against the detailed sheets.
- Define one canonical row model for every deliverable item.
- Add missing execution columns:
  - `Current Platform Status` (`exists`, `partial`, `missing`)
  - `Disposition` (`reuse`, `extend`, `new build`, `configure`)
  - `Target Jurisdiction`
  - `Owner`
  - `API / Event Contracts`
  - `Data Model Impact`
  - `UI Impact`
  - `Test Pack Required`
  - `Regulatory Evidence Required`
- Split mixed rows where one line item actually hides multiple engineering deliverables.
- Assign stable backlog IDs independent of spreadsheet row order.
- Export a normalized CSV/JSON snapshot for engineering and documentation use.

Outputs:

- Reconciled inventory baseline
- Workbook discrepancy log
- Canonical backlog seed

### 2. Run A Fit-Gap Against DigiCore CBS

Target: 2 to 3 weeks

Actions:

- Map each of the 41 modules to current platform capabilities, docs, backend services, and frontend modules.
- Classify every item as:
  - available as-is
  - available but conventional and needs Islamic adaptation
  - partially available
  - missing entirely
- Pay special attention to conventional assumptions that are not Shariah-safe:
  - interest accrual logic
  - delinquency fee recognition
  - generic loan contracts
  - credit card behaviour
  - GL account classification
  - statement and report wording
- Identify where existing modules can be reused:
  - CIF
  - workflow/orchestration
  - user/role management
  - document management
  - notifications
  - digital channels
  - AML/CFT base services
  - integration gateway patterns
- Identify likely greenfield or deep-extension areas:
  - product factory for Islamic contracts
  - SSB review gateway
  - profit distribution engine
  - Shariah compliance engine
  - AAOIFI financial statements
  - Zakat computation
  - Islamic treasury instruments
  - Islamic trade finance flows

Outputs:

- Module-by-module fit-gap matrix
- Reuse vs greenfield decision register
- Initial effort estimate by module and phase

### 3. Fix The Scope Boundary Before Architecture Starts

Target: 1 week

Actions:

- Choose the launch jurisdiction first. Do not design for all six GCC regulators in the first release.
- Choose the release product set for go-live:
  - minimum recommended go-live set:
    - CIF
    - GL
    - Wadiah current accounts
    - Mudarabah investment deposits
    - Murabaha financing
    - Ijarah financing
    - payment hub
    - profit distribution
    - Shariah compliance
    - AML/CFT
    - regulatory reporting
    - internet/mobile banking
- Decide whether `Zakat` is in scope for launch. If the anchor market is KSA, it should be treated as Phase 1, not optional.
- Freeze the go-live countries, products, channels, and mandatory external integrations.

Outputs:

- Launch scope memo
- Jurisdiction selection decision
- Phase 1 product catalogue

### 4. Produce The Islamic Target Architecture

Target: 3 to 4 weeks

Actions:

- Define a contract-centric domain model for:
  - Wadiah
  - Mudarabah
  - Murabaha
  - Ijarah
  - Musharakah
  - Salam
  - Istisna'a
  - Sukuk
  - Kafalah
  - Wakalah where applicable
- Design mandatory workflow checkpoints for every Shariah-sensitive lifecycle.
- Make SSB approval part of the core platform workflow, not an offline process.
- Define accounting and ledger treatment under AAOIFI, including chart-of-accounts segregation.
- Model non-compliant income identification, quarantine, and charity purification flows.
- Define pool management and profit allocation logic for Mudarabah deposits.
- Design product configuration so Fatwa approval, template versioning, and rule versioning are traceable and auditable.
- Produce integration contracts for the 20 identified links, especially:
  - GL posting
  - AML/CFT
  - payment rails
  - national identity
  - credit bureau
  - regulatory reporting
  - ZATCA if KSA is selected

Outputs:

- Islamic domain model
- target service/module architecture
- BPMN workflow pack
- accounting and reporting design
- integration contract list

### 5. Deliver In Execution Waves

Use the workbook phases, but add a mobilisation wave before Phase 0.

#### Wave A: Mobilisation

Target: 4 to 6 weeks

- Reconcile inventory
- Complete fit-gap
- finalize scope
- establish Shariah governance operating model
- create architecture pack
- define test strategy
- stand up programme governance

Exit criteria:

- Approved backlog baseline
- agreed launch jurisdiction
- signed-off architecture direction
- named SSB/compliance stakeholders

#### Wave B: Phase 0 Foundation

Target: 4 to 6 months

Primary modules:

- BPMN workflow engine
- business rules engine
- maker-checker-approver framework
- SSB review gateway
- user and role management
- product factory
- integration bus / ESB
- document management

Why this phase matters:

- It creates the control plane for every later Islamic workflow.
- More than half of all inventory rows are high complexity, so weak foundations will cascade into rework.
- SSB routing, approval evidence, and product governance must exist before product buildout.

Exit criteria:

- SSB can review and approve products inside the platform
- workflow and rule engines can enforce Shariah checkpoints
- product templates and document templates are versioned and auditable

#### Wave C: Phase 1 Go-Live Core Banking

Target: 8 to 12 months

Primary modules:

- CIF
- general ledger
- Wadiah deposits
- Mudarabah deposits
- Murabaha financing
- Ijarah financing
- diminishing Musharakah
- payment hub
- fee and charges engine
- profit distribution engine
- Shariah compliance engine
- AML/CFT and sanctions
- credit risk
- regulatory reporting
- digital channels
- debit card management
- open banking API
- Zakat if KSA

Execution principles:

- Build product, accounting, and compliance together.
- Do not ship financing products before their profit recognition and purification paths exist.
- Treat go-live dry runs as mandatory:
  - end-to-end transaction lifecycle
  - month-end / profit distribution
  - Shariah audit evidence generation
  - regulator reporting

Exit criteria:

- SSB certification for all launch products
- first dry-run profit distribution accepted
- first regulator return generated
- full audit trail proven
- digital channels expose Islamic product language and behaviours correctly

#### Wave D: Phase 2 Expansion

Target: 6 to 8 months

Primary modules:

- full Musharakah
- Salam
- Istisna'a
- treasury instruments and liquidity
- Sukuk
- interbank placements
- FX and Islamic hedging structures
- trade finance
- prepaid / credit cards
- operational risk
- AAOIFI financial statements
- data warehouse and BI

Exit criteria:

- advanced products audited and approved
- treasury and trade finance flows work end to end
- AAOIFI statements generated from live books

#### Wave E: Phase 3 Optimisation

Target: ongoing

- performance tuning
- analytics maturity
- regulatory change management
- multi-entity and multi-jurisdiction support
- AI/ML extensions after enough live data exists

### 6. Build A Formal Shariah And Regulatory Assurance Track

Target: runs across all waves

Actions:

- Convert the 22 listed touchpoints into executable control requirements.
- For each touchpoint, define:
  - trigger
  - control owner
  - workflow checkpoint
  - evidence artifact
  - automated test case
  - breach remediation path
- Create a jurisdiction matrix that marks what is:
  - common across GCC
  - KSA-specific
  - UAE-specific
  - Bahrain/Qatar/Kuwait/Oman specific
- Separate `platform-wide controls` from `product-specific controls`.
- Create mandatory annual Shariah audit and certification routines inside the operating model.

Outputs:

- Shariah control library
- regulatory obligations matrix
- audit evidence catalogue

### 7. Turn The Plan Into An Engineering Backlog

Target: 2 weeks after architecture approval

Actions:

- Break every phase into epics, stories, API tasks, UI tasks, data tasks, and test tasks.
- Sequence dependencies using the `Integration Matrix`.
- Create sprintable slices by vertical capability, not by document section alone.
- Maintain one backlog view for:
  - module delivery
  - integration delivery
  - regulatory evidence
  - test coverage

Recommended backlog themes:

- product governance and SSB workflows
- Islamic contract engines
- deposit and profit distribution
- Islamic accounting and reporting
- screening, purification, and audit
- external connectivity
- channel enablement

## Suggested Deliverables To Produce From This Workbook

The workbook should lead to a documentation set, not remain the only planning asset.

Recommended new artifacts:

- `Islamic CBS fit-gap matrix`
- `Islamic product catalogue and contract definitions`
- `Shariah control library`
- `AAOIFI accounting design`
- `Islamic CBS target architecture`
- `Phase 0 delivery plan`
- `Phase 1 go-live readiness checklist`
- `GCC jurisdiction decision memo`
- `integration specification pack`
- `test and certification strategy`

## Recommended Operating Model

Run the programme with five parallel streams:

- Product and Shariah governance
- Core banking and accounting
- Compliance and regulatory
- Channels and experience
- Integration, data, and reporting

Minimum standing stakeholders:

- product owner
- enterprise architect
- lead engineer
- finance/GL lead
- compliance lead
- Shariah governance lead
- test lead
- implementation manager

## Near-Term Next Steps

These are the next concrete actions I would take in this repo.

1. Reconcile the spreadsheet and regenerate the dashboard from detailed data.
2. Convert the `Module Inventory` sheet into a normalized CSV/JSON backlog source.
3. Create a module-by-module fit-gap document against the current DigiCore CBS platform.
4. Pick the anchor jurisdiction and freeze the Phase 1 product list.
5. Draft the Islamic target architecture and workflow pack for Phase 0 and Phase 1.
6. Decompose Phase 0 and Phase 1 into engineering epics, dependencies, and test packs.

## Recommended First Decision

Before any build planning starts, decide this:

`Are we creating a single-jurisdiction Islamic CBS for initial launch, or a multi-jurisdiction GCC platform from day one?`

If the answer is `multi-jurisdiction from day one`, cost, scope, and regulatory complexity increase sharply. The better path is to launch with one anchor market, prove compliance and operations there, and then expand jurisdictionally in Phase 2 and Phase 3.
