# DigiCore CBS Cost Analysis

Date: 2026-03-21
Workspace: `/Users/mac/codes/cba`
Subject: Estimated software build value, production-hardening cost, and end-to-end bank transformation cost for the DigiCore CBS repository

## Executive Summary

If the subject is this DigiCore CBS repository, my estimate is:

- **Current software build replacement value:** `US$12M-$18M`
- **Broader reasonable range for the software as it exists today:** `US$8M-$20M`
- **Total cost to finish and harden it into something a bank could seriously deploy:** `US$15M-$35M`
- **Full bank transformation cost around the platform** including migration, integrations, compliance rollout, cutover, operating model changes, and change management: `US$20M-$100M+`

These are not the same number.

- The first range values the **software asset in the repo** as a partially complete but already substantial core banking platform.
- The second range values the **incremental work needed to reach serious deployment readiness**.
- The third range reflects the **bank program around the software**, which is usually much more expensive than the code itself.

## What This Estimate Covers

This analysis is specifically about the DigiCore CBS codebase in this repository. It is **not** a quote for:

- a vendor license
- a support organization
- a regulated bank launch in a specific jurisdiction
- data migration from an existing core
- a multi-year managed service contract
- a Temenos-, Finastra-, or Finxact-style commercial product business

In other words, this is an estimate of the likely **economic effort to build or finish software of this scope**, not a pricing sheet for selling it as a product.

## Repository Evidence

The repo itself supports the conclusion that this is far beyond a small banking app.

### Scope stated by the repository

The README describes DigiCore CBS as a multi-jurisdiction, full-stack core banking system implementing the BIAN service-domain model across **150+ backend modules** and **38 frontend feature areas**. It also lists broad capability coverage including:

- customer lifecycle and KYC
- deposits
- lending
- payments and remittances
- cards
- trade finance and capital markets
- treasury and ALM
- risk and IFRS 9 / ECL
- compliance and regulatory reporting
- open banking / PSD2
- wealth and personal financial management

Primary local source:

- `README.md`, especially lines 29-42

### Measured repo size

Direct measurement in the workspace produced the following rough scale indicators:

| Metric | Measured value |
| --- | ---: |
| Backend source files under `src/main/java` | 1,456 |
| Frontend source files under `cbs-frontend/src` | 1,931 |
| Backend test files under `src/test/java` | 171 |
| Top-level backend functional domains | 176 |
| Backend + frontend app code (`.java`, `.ts`, `.tsx`, excluding tests) | 401,333 lines |
| SQL migration code under `src/main/resources/db/migration` | 12,203 lines |
| Backend + frontend + tests combined (`.java`, `.ts`, `.tsx`) | 420,611 lines |

This does not prove production maturity on its own, but it does establish that the codebase is large enough to justify a multi-million-dollar build estimate.

### Current readiness

The production-readiness audit in the repo explicitly says the system is **not production-ready** as of 2026-03-20. The highest-value blockers listed in that audit materially affect cost:

- `32` money-movement paths still bypass the shared posting engine
- `123` frontend `catch(() => [])` silent fallbacks remain
- `17` frontend `catch(() => null)` silent fallbacks remain
- caller-supplied actor identifiers still exist in multiple approval and operational flows
- `12` `coming soon` production UI remnants remain
- a dangerous `loadtest` security profile remains deployable
- frontend auth still contains unsafe localhost defaults

Primary local source:

- `PRODUCTION_READINESS_AUDIT_2026-03-20.md`, especially lines 1-77

This matters because the repo is not just large; it also still requires serious integrity, audit, security, and deployment hardening. That is the main reason the estimate is **not** "finished Tier-1 core vendor value."

## Why The Current Build Is Worth Multi-Millions

Even before production hardening, the repo already contains substantial economic value because it includes:

- a modern full-stack architecture
- a broad banking functional surface area
- domain modeling across many banking service areas
- database migrations and schema history
- authentication and authorization integration patterns
- testing infrastructure
- load-test harnesses
- a large number of frontend pages, flows, and APIs

Building a platform with this breadth from zero would require:

- product design across many regulated banking domains
- backend engineering
- frontend engineering
- QA and test automation
- architecture and security design
- data-model and migration work
- devops and deployment work
- documentation and environment configuration

Even if parts of the repo are thin, repetitive, scaffolded, or partially implemented, the amount of engineering effort already embodied in the code is too large to treat as a low-six-figure or even low-seven-figure asset.

## Cost Estimation Method

I am using a triangulated estimate, not a single formula.

### 1. Scope-based replacement thinking

The software spans many functions that banks usually buy from several systems or implement over multiple programs. The README coverage alone points to a platform that would normally require a sizable team over multiple years.

This is the strongest reason the estimate starts in the eight-figure range instead of at a few million dollars.

### 2. Team-cost thinking

A plausible build team for something of this scale would usually include some mix of:

- backend engineers
- frontend engineers
- QA and test automation
- architects and technical leads
- product analysts / business analysts
- devops / SRE
- security and compliance support
- project or program management

Using U.S. labor data as a floor, not a premium consultancy benchmark:

- U.S. Bureau of Labor Statistics reports **software developers** at a median annual wage of **$133,080** in May 2024
- **software QA analysts and testers** at **$102,610**
- **computer and information systems managers** at **$171,200**

Those are wage medians, not fully loaded employer costs. A real program budget must add benefits, taxes, tooling, management overhead, vendor spend, cloud/infrastructure, and program inefficiency. That usually pushes a blended fully loaded cost meaningfully above raw wage figures.

As a rough planning frame, a serious 18-30 month build program with a blended team of 15-30 people can move into the `US$8M-$20M+` band fairly quickly, depending on geography, staffing model, and quality bar.

### 3. Code-size sanity check

This repo contains about `401k` lines of app code plus about `12k` lines of SQL migration code, excluding tests. A classical COCOMO-style exercise on roughly this size produces a very large effort envelope:

| Model | Approx. person-months | Approx. schedule | Avg. staffing |
| --- | ---: | ---: | ---: |
| Organic | 1,365 | 38.8 months | 35 |
| Semi-detached | 2,605 | 49.7 months | 53 |
| Embedded | 5,069 | 63.9 months | 79 |

I do **not** use those numbers directly as the final price because:

- enterprise application code often contains repeated CRUD patterns
- similar banking modules can share structure
- some parts may be scaffold-heavy or thinly implemented
- code quantity is not equal to production quality

Still, this sanity check reinforces the key point: the repo is large enough that a multi-million-dollar build estimate is credible.

### 4. Market benchmark triangulation

Public examples and industry references support the same order of magnitude:

- The **Federal Reserve Bank of Kansas City** wrote on **February 28, 2024** that full core conversions can take several years and cost **millions, if not hundreds of millions, of dollars**, depending on the institution and scope.
- A **Deloitte** modernization paper describes an out-of-the-box bank modernization program completed in **eight months**, illustrating that narrower augmentation programs can be much faster than full-core replacement.
- **Metropolitan Commercial Bank** disclosed on **October 23, 2025** that its broader digital transformation program had **total estimated project costs of $18 million**, including contingency.
- **Commonwealth Bank of Australia** announced on **April 28, 2008** that its core banking modernization program was forecast to cost about **A$580 million over four years**.

These are not directly comparable one-to-one, but they help anchor the fact that core modernization programs can range from the tens of millions into the hundreds of millions once real bank transformation is involved.

## Detailed Interpretation Of The Three Cost Ranges

### 1. Current software build replacement value: `US$12M-$18M`

This is the number I would use if someone asked:

"What would it likely cost to reproduce something like the current DigiCore CBS repo, with similar breadth and similar current maturity?"

Why this range makes sense:

- the repo is much larger than a departmental app
- it spans a very broad banking capability set
- it includes both backend and frontend
- it has real schema/migration history
- it has testing and deployment structure
- it already embodies significant architecture and domain modeling work

Why I would not go much lower:

- a small team cannot build this breadth quickly
- regulated financial domain logic is expensive
- the repo surface area is too wide for a sub-`US$5M` estimate to be credible unless much of it is non-functional scaffolding

Why I would not go much higher for this specific number:

- the readiness audit still shows major unresolved production blockers
- not every implemented page or module should be assumed to be deep, complete, or battle-tested
- codebase size overstates commercial value when many modules are structurally similar

### 2. Broader reasonable range for the software as it exists today: `US$8M-$20M`

This is the uncertainty band around the current build value.

The low end assumes:

- substantial code reuse or scaffolding
- many modules are thin
- the repo has coverage breadth more than functional depth
- labor was sourced at relatively efficient rates

The high end assumes:

- significant hidden depth in modules and workflows
- more reusable production value than the audit suggests
- substantial embedded domain expertise
- stronger testability and architecture quality than headline blockers imply

This range is useful because codebase valuation is always noisy. A repo with 176 top-level domains can look huge, but the economic value depends heavily on how much of each domain is truly implemented versus merely represented.

### 3. Total cost to finish and harden it into something a bank could seriously deploy: `US$15M-$35M`

This is the most practical number if the question is:

"How much money would it take from here to reach a serious deployment candidate?"

This figure is larger than the current build-value estimate because the hardest and most expensive work in banking software is often late-stage:

- ledger integrity hardening
- audit provenance hardening
- honest error handling across the UI
- production configuration safety
- security hardening
- end-to-end test coverage
- operational runbooks
- performance testing
- disaster recovery validation
- compliance controls
- data migration tooling
- environment management
- rollout and support readiness

Given the audit findings, the incremental work from current state to serious deployability is likely several more millions on top of the value already embodied in the code.

Put differently:

- the repo likely already contains `US$12M-$18M` worth of build effort
- but reaching serious deployment readiness likely pushes the **total program spend** into the `US$15M-$35M` band

I would interpret that as an additional hardening and completion burden of roughly `US$3M-$17M`, depending on team quality, existing hidden maturity, and regulatory target environment.

### 4. Full bank transformation cost: `US$20M-$100M+`

This is the right range if the question is:

"What does it cost for a real bank to adopt this, integrate it, migrate customers and products, satisfy regulators, train operations, and cut over?"

This number is almost always much larger than the software build itself because it includes:

- legacy data migration
- channel and third-party integration
- payment rail connectivity
- reconciliation and finance controls
- regulatory and audit sign-off
- parallel run and cutover
- operational process redesign
- branch and back-office retraining
- customer servicing change
- PMO and governance overhead
- vendors, consultants, and specialist assurance

That is why public bank modernization programs can be in the tens or hundreds of millions even when the underlying software vendor product already exists.

## Why The Repo Is Not Yet Valued Like A Tier-1 Core Product

The repo has substantial breadth, but the audit shows unresolved issues in the most sensitive areas:

- posting integrity
- balance mutation control
- actor provenance
- honest failure handling
- auth configuration safety
- production profile safety

For a banking platform, these are not cosmetic issues. They directly affect:

- accounting correctness
- audit defensibility
- operational safety
- regulatory confidence
- go-live risk

That is why the current estimate treats DigiCore CBS as a high-effort software asset with meaningful unfinished hardening work, not as a fully bankable enterprise core product.

## Factors That Could Move The Estimate Up

- deeper-than-visible backend implementations
- strong automated regression coverage beyond what file counts suggest
- proven performance and resilience under realistic load
- real multi-tenant or multi-jurisdiction production deployments
- existing migration utilities and reconciliation tooling
- complete operational documentation and support procedures
- demonstrated regulatory acceptance in target markets

## Factors That Could Move The Estimate Down

- large portions of scaffolded or repetitive boilerplate code
- thin controllers and pages with little real business logic
- incomplete integration behavior behind apparently broad feature coverage
- missing end-to-end test coverage
- weak data migration and reconciliation support
- limited real-world deployment history
- unresolved domain correctness issues in ledger-sensitive modules

## Bottom Line

If this question is about the DigiCore CBS repo itself, the best concise answer is:

- **As-built software value today:** about `US$12M-$18M`
- **Reasonable uncertainty band:** `US$8M-$20M`
- **To finish into a serious deployment candidate:** about `US$15M-$35M` total
- **For an actual bank transformation using it:** about `US$20M-$100M+`

The reason these numbers differ is simple:

- software breadth creates **build value**
- unresolved production-risk gaps create **hardening cost**
- real bank adoption creates a much larger **transformation cost**

## Sources

### Local repository sources

- `README.md`
- `PRODUCTION_READINESS_AUDIT_2026-03-20.md`
- direct file-count and line-count measurements taken in the workspace on 2026-03-21

### External sources

- Federal Reserve Bank of Kansas City, "Core Banking Systems and Options for Modernization" (February 28, 2024): <https://www.kansascityfed.org/research/payments-system-research-briefings/core-banking-systems-and-options-for-modernization/>
- Deloitte, "Digital transformation hits core banking" (2024): <https://www.deloitte.com/content/dam/assets-zone3/us/en/docs/services/consulting/2024/us-digital-transformation-hits-core-banking.pdf>
- Metropolitan Commercial Bank earnings presentation / digital transformation disclosure (October 23, 2025): <https://www.sec.gov/Archives/edgar/data/1476034/000110465925101838/mcb-20251023xex99d2.htm>
- Commonwealth Bank of Australia modernization announcement reference (April 28, 2008): <https://www.commbank.com.au/content/dam/commbank/about-us/shareholders/pdfs/2008-asx/Core_banking_modernisation_media_release_28april2008.pdf>
- U.S. Bureau of Labor Statistics, Software Developers, Quality Assurance Analysts, and Testers: <https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm>
- U.S. Bureau of Labor Statistics, Computer and Information Systems Managers: <https://www.bls.gov/ooh/management/computer-and-information-systems-managers.htm>

## Notes

- This is an analytical estimate, not a formal valuation opinion.
- Commercial sale price, internal replacement cost, and total program cost are different concepts.
- If needed, this report can be extended into:
  - a **build-only estimate**
  - a **production-hardening roadmap with budget bands**
  - a **commercial pricing memo**
  - an **investor-facing software asset valuation summary**
