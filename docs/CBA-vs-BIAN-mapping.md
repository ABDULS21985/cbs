# CBA vs BIAN Service Domain Mapping & Gap Analysis

## Legend

- **Covered** = Fully implemented
- **Partial** = Some functionality exists but incomplete
- **Gap** = Not implemented

---

## 1. SALES & SERVICE (~71 BIAN Service Domains)

### 1.1 Channel Specific (17 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Branch Location Management | Partial | Branch entity exists but no property/facility management |
| Branch Location Operations | Partial | BranchService — basic branch ops only |
| Branch Network Management | Gap | No network-level strategy/planning |
| Branch Currency Management | Covered | Cap 44 — Vault & Cash Management (teller vaults) |
| Branch Currency Distribution | Covered | Cap 44 — Inter-vault transfers, ATM loading |
| Contact Center Management | Gap | No contact center module |
| Contact Center Operations | Gap | No contact center module |
| eBranch Management | Partial | Cap 8 — Self-Service Portal (basic) |
| eBranch Operations | Partial | Cap 8 — Portal operations |
| Advanced Voice Services (IVR) | Gap | No IVR/voice channel |
| ATM Network Management | Gap | ATM vault type exists but no network management |
| ATM Network Operations | Gap | No ATM network operations |
| Product Inventory Item Management | Partial | Cheque book issuance, card issuance |
| Product Inventory Distribution | Gap | No inventory distribution tracking |
| Card Terminal Administration | Gap | No POS terminal management |
| Card Terminal Operation | Gap | No POS terminal operations |

**Score: 3 Covered, 4 Partial, 10 Gaps**

### 1.2 Cross Channel (11 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Party Authentication | Partial | OAuth2/JWT auth but no multi-factor/biometric |
| Transaction Authorization | Covered | Maker-checker workflow, card authorization |
| Point of Service | Gap | No unified service point management |
| Servicing Event History | Partial | Audit trail captures events |
| Contact Routing | Gap | No contact routing engine |
| Session Dialogue | Gap | No session management |
| Interactive Help | Gap | No guided help system |
| Contact Handler | Gap | No contact handling |
| Customer Workbench | Gap | No unified staff workspace |
| Servicing Activity Analysis | Gap | No servicing analytics |
| Service Directory | Gap | No service catalog |

**Score: 1 Covered, 2 Partial, 8 Gaps**

### 1.3 Marketing (9 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Business Development | Gap | — |
| Brand Management | Gap | — |
| Advertising | Gap | — |
| Promotional Events | Gap | — |
| Prospect Campaign Design | Gap | — |
| Prospect Campaign Management | Gap | — |
| Customer Campaign Design | Gap | — |
| Customer Campaign Management | Gap | — |
| Customer Surveys | Gap | — |

**Score: 0 Covered, 0 Partial, 9 Gaps (entire domain missing)**

### 1.4 Sales (13 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Party Lifecycle Management | Covered | Cap 7 — Account Lifecycle Management |
| Lead and Opportunity Management | Gap | No CRM/sales pipeline |
| Customer Offer | Partial | Loan origination has offer step |
| Underwriting | Covered | Cap 20 — Automated Credit Decisioning |
| Product Matching | Partial | Cap 5 — Segmentation enables targeting |
| All others (8 SDs) | Gap | No sales planning, commissions, etc. |

**Score: 2 Covered, 2 Partial, 9 Gaps**

### 1.5 Customer Management (12 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Customer Relationship Management | Covered | Cap 1 — 360° Customer View |
| Customer Product & Service Eligibility | Partial | Segmentation rules can drive eligibility |
| Customer Agreement | Gap | No master agreement management |
| Sales Product Agreement | Gap | No product agreement tracking |
| Customer Access Entitlement | Partial | Role-based access exists |
| Customer Behavior Insights | Covered | Cap 5 — Segmentation + Cap 61 Fraud behavioral analysis |
| Customer Credit Rating | Covered | Cap 62 — Credit Risk Rating & Scoring |
| Account Recovery | Covered | Cap 24 — Collections & Recovery |
| Customer Event History | Covered | Audit events + notification log |
| Customer Proposition | Gap | No value proposition management |
| Customer Product/Service Directory | Partial | Product entity exists, no directory |
| Customer Financial Insights | Gap | No PFM / financial health scoring |

**Score: 5 Covered, 3 Partial, 4 Gaps**

### 1.6 Servicing (9 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Customer Case Management | Partial | Cap 40 — Dispute management (cards only) |
| Card Case | Covered | Cap 40 — Card Dispute & Chargeback |
| Payment Initiation | Covered | Cap 27-29 — Payment services |
| Servicing Order | Gap | No servicing order management |
| Servicing Mandate | Partial | Cap 30 — Standing Orders |
| Loan Syndication | Gap | No syndication servicing |
| Others (3 SDs) | Gap | — |

**Score: 2 Covered, 2 Partial, 5 Gaps**

---

## 2. REFERENCE DATA (~30 BIAN Service Domains)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Legal Entity Directory | Partial | Customer entity with 7 types |
| Correspondent Bank Directory | Partial | Nostro/Vostro management |
| Financial Instrument Ref Data | Gap | No instrument master |
| Counterparty Administration | Gap | No counterparty master |
| Product Design | Partial | loan_product, product entities |
| Product Directory | Partial | Product entity exists |
| Location Data Management | Partial | Branch, customer address |
| All others (~23 SDs) | Gap | No market data, syndicate mgmt, pricing schemes, etc. |

**Score: 0 Covered, 6 Partial, ~24 Gaps**

---

## 3. OPERATIONS & EXECUTION (~106 BIAN Service Domains)

### 3.1 Loans & Deposits (15 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Current Account | Covered | Cap 9 |
| Corporate Current Account | Covered | Cap 9 (shared) |
| Savings Account | Covered | Cap 10 — Tiered Interest |
| Term Deposit | Covered | Cap 11 — Fixed Deposits |
| Term Deposit Framework Agreement | Gap | No framework agreement |
| Virtual Account | Gap | No virtual account structures |
| Consumer Loan | Covered | Cap 17 — Retail Loan Origination |
| Corporate Loan | Covered | Cap 18 — Corporate & SME Lending |
| Mortgage Loan | Gap | No mortgage-specific module |
| Merchandising Loan | Gap | No POS lending |
| Loan (Generic) | Covered | Cap 17-26 combined |
| Leasing | Gap | No leasing module |
| Corporate Lease | Gap | No corporate leasing |
| Fiduciary Agreement | Partial | Cap 16 — Escrow/Trust (partial) |
| Standing Order | Covered | Cap 30 |

**Score: 8 Covered, 1 Partial, 6 Gaps**

### 3.2 Investment Management (5 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Investment Portfolio Planning | Gap | — |
| Investment Portfolio Analysis | Gap | — |
| Investment Portfolio Management | Gap | — |
| eTrading Workbench | Gap | — |
| Investment Account | Gap | — |

**Score: 0 Covered, 0 Partial, 5 Gaps (entire domain missing)**

### 3.3 Trade Banking (15 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Letter of Credit | Covered | Cap 47 — 8 LC types, UCP 600 |
| Bank Guarantee | Covered | Cap 48 — 10 guarantee types |
| Credit Management | Covered | Cap 18 + Cap 25 |
| Credit Facility | Covered | Cap 25 — Overdraft & LOC |
| Direct Debit Mandate | Covered | Cap 30 — Standing Orders includes DD |
| Direct Debit | Covered | Cap 30 |
| Cash Management & Account Services | Partial | Multi-currency wallets, no pooling |
| Project Finance | Gap | No project finance module |
| Limit and Exposure Management | Partial | Transaction limits exist, no exposure aggregation |
| Syndicated Loan | Gap | No syndication |
| Cheque Lock Box | Gap | No lock box services |
| Factoring | Partial | Cap 50 — SCF has receivables discounting |
| Cash Concentration | Gap | No cash pooling/sweeping |
| Notional Pooling | Gap | No notional pooling |
| Corporate Payroll Services | Gap | No payroll services |

**Score: 6 Covered, 3 Partial, 6 Gaps**

### 3.4 Wholesale Trading (12 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Dealer Desk | Partial | Cap 42 — Treasury deals (no real-time trading desk) |
| All others (11 SDs) | Gap | No trading book, market making, algo trading, etc. |

**Score: 0 Covered, 1 Partial, 11 Gaps (mostly N/A for retail CBS)**

### 3.5 Cards (7 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Credit Card | Covered | Cap 36 — Card Issuance & Lifecycle |
| Card Authorization | Covered | Cap 39 — Real-Time Auth Engine |
| Card Transaction Capture | Covered | Card transaction tracking |
| Merchant Relations | Gap | No merchant management |
| Merchant Acquiring Facility | Gap | No acquiring capability |
| Card Network Participant Facility | Gap | No network participation management |
| Credit Card Position Keeping | Covered | Balance tracking on cards |

**Score: 4 Covered, 0 Partial, 3 Gaps**

### 3.6 Market Operations (12 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| All 12 SDs | Gap | No fund admin, custody, trade settlement, corporate actions |

**Score: 0 Covered, 0 Partial, 12 Gaps (entire domain missing — capital markets)**

### 3.7 Corporate Financing & Advisory (5 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| All 5 SDs | Gap | No IPO, M&A, advisory services |

**Score: 0 Covered, 0 Partial, 5 Gaps (entire domain missing — investment banking)**

### 3.8 Consumer Services (9 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Currency Exchange | Covered | Cap 41 — Multi-currency FX conversion |
| Customer Tax Handling | Covered | Cap 74 — Tax Engine |
| Trust Services | Partial | Cap 16 — Escrow & Trust |
| Bank Drafts | Gap | No draft issuance |
| All others (5 SDs) | Gap | No brokered products, advisory, investments |

**Score: 2 Covered, 1 Partial, 6 Gaps**

### 3.9 Payments (13 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Payment Order | Covered | Cap 27-29 |
| Payment Execution | Covered | Cap 27 — Real-time |
| Payment Instruction | Covered | Cap 28 — Bulk/Batch |
| Payment Rail Operations | Covered | Cap 34 — Orchestration Layer |
| Cheque Processing | Covered | Cap 43 — Cheque Management |
| Correspondent Bank Operations | Covered | Cap 15 + Cap 29 |
| ACH Operations | Partial | Batch payments, no full ACH |
| Card Financial Settlement | Partial | Card transactions, no full settlement |
| Card eCommerce Gateway | Partial | Cap 37 — Virtual/tokenized cards |
| Card Clearing | Gap | No card clearing |
| Financial Gateway | Gap | No SWIFT/messaging gateway |
| Central Cash Handling | Gap | No central clearing |
| Financial Message Analysis | Gap | No message analysis |

**Score: 6 Covered, 3 Partial, 4 Gaps**

### 3.10 Account Management (12 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Position Keeping | Covered | Real-time balance management |
| Fraud Evaluation | Covered | Cap 61 — Fraud Detection |
| Fraud Diagnosis | Covered | Cap 61 — Fraud alerts & investigation |
| Account Reconciliation | Covered | Cap 69 — Sub-Ledger Reconciliation |
| Transaction Engine | Covered | GL double-entry posting |
| Customer Position | Partial | Cap 1 — 360° view (no consolidated position) |
| Counterparty Risk | Partial | Credit facility tracking |
| Reward Points Account | Gap | No loyalty/rewards program |
| Product Combination | Gap | No bundled products |
| Position Management | Gap | No consolidated position mgmt |
| Accounts Receivable | Gap | No AR module |
| Securities Position Keeping | Gap | No securities |

**Score: 5 Covered, 2 Partial, 5 Gaps**

### 3.11 Operational Services (14 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Disbursement | Covered | Loan disbursement, payment execution |
| Delinquent Account Handling | Covered | Cap 24 — Collections |
| Internal Bank Account | Covered | Cap 15 — Nostro/Vostro |
| Customer Billing | Covered | Bill payment + fee charging |
| Issued Device Tracking | Partial | Card tracking, cheque book tracking |
| Issued Device Administration | Partial | Card lifecycle management |
| Card Collections | Partial | Collections module (not card-specific) |
| Processing Order | Partial | EOD step ordering |
| Reward Points Awards/Redemption | Gap | No rewards |
| Open Item Management | Gap | No suspense item management |
| Leasing Item Administration | Gap | No leasing |
| Channel Activity History | Gap | No channel analytics |
| Channel Activity Analysis | Gap | No channel analytics |
| Card Transaction Switch | Gap | No card switch |

**Score: 4 Covered, 4 Partial, 6 Gaps**

### 3.12 Collateral Administration (4 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Collateral Asset Administration | Covered | Cap 21 — Collateral Management |
| Collateral Allocation Management | Covered | Collateral-loan linking |
| Collections | Covered | Cap 24 |
| Party Asset Directory | Gap | No consolidated asset directory |

**Score: 3 Covered, 0 Partial, 1 Gap**

---

## 4. RISK & COMPLIANCE (~36 BIAN Service Domains)

### 4.1 Bank Portfolio & Treasury (7 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Corporate Treasury | Covered | Cap 42 — Treasury & Money Market |
| Stock Lending and Repos | Covered | Cap 42 — Repo/reverse repo deals |
| Asset And Liability Management | Partial | FTP + multi-currency, no full ALM |
| Corporate Treasury Analysis | Gap | No treasury analytics/dashboard |
| Bank Portfolio Analysis | Gap | No portfolio-level analysis |
| Bank Portfolio Administration | Gap | No portfolio administration |
| Asset Securitization | Gap | No securitization |

**Score: 2 Covered, 1 Partial, 4 Gaps**

### 4.2 Business Analysis (9 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Segment Direction | Partial | Cap 5 — Segmentation engine |
| All others (8 SDs) | Gap | No market analysis, competitor analysis, product portfolio analytics |

**Score: 0 Covered, 1 Partial, 8 Gaps (mostly BI/analytics gap)**

### 4.3 Regulations & Compliance (7 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Regulatory Reporting | Covered | Cap 65 — CBN, NDIC, Basel III |
| Regulatory Compliance | Covered | Cap 67 — Compliance Workflow |
| Financial Accounting | Covered | Cap 68 — Real-Time GL |
| Fraud Resolution | Covered | Cap 61 + Cap 40 — Fraud + Disputes |
| Compliance Reporting | Partial | Regulatory reports, no separate compliance reporting |
| Guideline Compliance | Partial | Policy engine, no guideline-specific monitoring |
| Financial Statement Assessment | Gap | No financial statement analysis |

**Score: 4 Covered, 2 Partial, 1 Gap**

### 4.4 Models (13 SDs)

| BIAN Service Domain | Status | CBA Capability |
|---|---|---|
| Credit Risk Models | Covered | Cap 62 + Cap 63 — Scoring + ECL |
| Fraud Model | Covered | Cap 61 — ML-based fraud detection |
| Operational Risk Models | Covered | Cap 64 — OpRisk KRIs & RCSA |
| Customer Behavior Models | Partial | Segmentation rules + fraud behavioral |
| Market Risk Models | Gap | No market risk |
| Liquidity Risk Models | Gap | No liquidity risk |
| Economic Capital | Gap | No economic capital calculation |
| All others (6 SDs) | Gap | — |

**Score: 3 Covered, 1 Partial, 9 Gaps**

---

## 5. BUSINESS SUPPORT (~68 BIAN Service Domains)

| Area | Status | Notes |
|---|---|---|
| IT Management (13 SDs) | Gap | Out of scope for CBS application |
| Enterprise Services (9 SDs) | Gap | Out of scope |
| Facilities (7 SDs) | Gap | Out of scope |
| Command & Control (6 SDs) | Gap | Out of scope |
| Finance (4 SDs) | Partial | GL + Tax covers 2 of 4 |
| HR Management (12 SDs) | Gap | Out of scope |
| Knowledge Management (3 SDs) | Gap | Out of scope |
| Corporate Relations (5 SDs) | Gap | Out of scope |
| Business Direction (5 SDs) | Gap | Out of scope |
| Document Management (4 SDs) | Partial | DocumentService covers basic doc mgmt |

> **Note:** Business Support SDs are generally out of scope for a core banking engine. These are typically covered by separate enterprise systems (ERP, HRMS, ITSM).

---

## Summary Scorecard

| BIAN Business Area | Total SDs | Covered | Partial | Gap | Coverage % |
|---|---|---|---|---|---|
| Sales & Service | 71 | 13 | 13 | 45 | 18% |
| Reference Data | 30 | 0 | 6 | 24 | 0% |
| Operations & Execution | 106 | 38 | 15 | 53 | 36% |
| Risk & Compliance | 36 | 9 | 5 | 22 | 25% |
| Business Support | 68 | 0 | 2 | 66 | 0% |
| **TOTAL** | **311** | **60** | **41** | **210** | **19%** |

### Adjusted Score (Excluding Out-of-Scope Business Support)

| | Total SDs | Covered | Partial | Gap | Coverage % |
|---|---|---|---|---|---|
| Core Banking Relevant | ~243 | 60 | 41 | 142 | 25% (41% incl. partial) |

---

## Top 10 Critical Gaps (Prioritized for a CBS)

| # | Gap Area | BIAN SDs Missing | Business Impact |
|---|---|---|---|
| 1 | Mortgage Lending | Mortgage Loan | Major revenue product line missing |
| 2 | Virtual Accounts | Virtual Account | Critical for corporate cash management |
| 3 | Cash Pooling & Sweeping | Cash Concentration, Notional Pooling | Corporate treasury clients expect this |
| 4 | Loyalty & Rewards | Reward Points Account, Awards & Redemption | Customer retention differentiator |
| 5 | Leasing | Leasing, Corporate Lease, Leasing Item Admin | Growing product segment |
| 6 | Asset & Liability Management | ALM (full), Liquidity Risk Models | Regulatory requirement (Basel III) |
| 7 | Customer Case Management | Generic case management (non-card) | Only card disputes covered; need cross-product |
| 8 | Financial Gateway / SWIFT Integration | Financial Gateway, Financial Message Analysis | Real SWIFT MT/MX gateway needed |
| 9 | Merchant Acquiring | Merchant Relations, Acquiring, Card Network | Revenue opportunity if bank is an acquirer |
| 10 | Investment / Wealth Management | 5 Investment SDs | High-value customer segment unserved |

---

## Strengths (Where CBA Exceeds Typical CBS)

| Area | Strength |
|---|---|
| Microfinance & Group Lending | Cap 26 — Not in BIAN at all |
| Islamic Finance | Cap 19 — Sharia-compliant products |
| Goal-Based Savings | Cap 13 — Modern digital banking feature |
| QR Code Payments | Cap 33 — Not a BIAN SD |
| Mobile Money Interop | Cap 32 — Africa/emerging market focused |
| Cross-Border Remittances | Cap 35 — Corridor-specific pricing |
| Trade Document Digitisation | Cap 51 — AI/OCR beyond BIAN scope |
| EOD Orchestration | Cap 45 — Sophisticated batch engine |
