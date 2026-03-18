# BIAN Gap Items — Detailed Implementation Plan

> **Generated**: 2026-03-18
> **Codebase Version**: V1–V37 (150 packages, 37 migrations)
> **Scope**: All BIAN service domains with ZERO implementation (pure gaps)
> **Total Gap Items**: 16 service domains across 3 BIAN business areas
> **Companion Document**: [BIAN-PARTIAL-GAP-ANALYSIS.md](./BIAN-PARTIAL-GAP-ANALYSIS.md) — covers the 21 partial implementations

---

## Table of Contents

**A. Wholesale Trading (11 SDs)**
1. [Dealer Desk](#1-dealer-desk)
2. [Quote Management](#2-quote-management)
3. [Suitability Checking](#3-suitability-checking)
4. [Market Making](#4-market-making)
5. [ECM and DCM](#5-ecm-and-dcm)
6. [Program Trading](#6-program-trading)
7. [Trader Position Operations](#7-trader-position-operations)
8. [Market Order](#8-market-order)
9. [Market Order Execution](#9-market-order-execution)
10. [Trading Book Oversight](#10-trading-book-oversight)
11. [Trading Models](#11-trading-models)

**B. Corporate Financing & Advisory (5 SDs)**
12. [Public Offering (IPO)](#12-public-offering-ipo)
13. [Private Placement](#13-private-placement)
14. [Mergers and Acquisitions Advisory](#14-mergers-and-acquisitions-advisory)
15. [Corporate Tax Advisory](#15-corporate-tax-advisory)
16. [Corporate Finance](#16-corporate-finance)

**C. Appendices**
- [Scope Assessment: Build vs. Buy vs. Skip](#scope-assessment-build-vs-buy-vs-skip)
- [Implementation Summary](#implementation-summary)

---

# A. WHOLESALE TRADING (11 SDs)

> **Context**: Wholesale Trading service domains cover proprietary trading, market making, and securities
> dealing operations. These are typically found in **investment banks** and **universal banks** with a
> capital markets arm. For a **retail/commercial CBS**, these are usually out of scope and handled by
> dedicated trading platforms (e.g., Murex, Calypso, Finastra Fusion). However, many mid-size African
> and emerging-market banks run a treasury/dealing desk that trades FX, fixed income, and money
> market instruments — justifying a **lightweight implementation**.

---

## 1. Dealer Desk

**BIAN Service Domain**: Dealer Desk
**BIAN Definition**: Operate a dealer/trading desk for securities and FX trading
**Current Status**: GAP — No package or entity exists
**Existing Related Packages**: `treasury` (deals), `fixedincome` (bonds), `tradeops` (confirmations)

### What BIAN Expects

The Dealer Desk SD manages the day-to-day operations of a dealing room, covering desk configuration, dealer assignments, position limits, and real-time P&L monitoring.

### Implementation Specification

#### Package: `com.cbs.dealerdesk`

#### Entity: `DealingDesk`

```
Fields:
- deskId                    BIGSERIAL PRIMARY KEY
- deskCode                  VARCHAR(20) NOT NULL UNIQUE
- deskName                  VARCHAR(200) NOT NULL
- deskType                  VARCHAR(20) NOT NULL
    CHECK: FX_SPOT, FX_FORWARD, FIXED_INCOME, MONEY_MARKET, DERIVATIVES,
           EQUITY, COMMODITY, STRUCTURED_PRODUCTS, PROPRIETARY, ALM
- headDealerName            VARCHAR(200)
- headDealerEmployeeId      VARCHAR(80)
- location                  VARCHAR(100) — e.g., Lagos, London
- timezone                  VARCHAR(40) DEFAULT 'Africa/Lagos'
- tradingHoursStart         TIME
- tradingHoursEnd           TIME
- tradingDays               JSONB — e.g., ["MON","TUE","WED","THU","FRI"]
- supportedInstruments      JSONB — list of instrument types tradeable
- supportedCurrencies       JSONB — list of CCY pairs
- maxOpenPositionLimit      NUMERIC(20,4) — aggregate position cap
- maxSingleTradeLimit       NUMERIC(20,4)
- dailyVarLimit             NUMERIC(20,4) — daily VaR limit
- stopLossLimit             NUMERIC(20,4) — daily stop-loss trigger
- pnlCurrency               VARCHAR(3) DEFAULT 'USD'
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: ACTIVE, SUSPENDED, CLOSED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `DeskDealer`

```
Fields:
- dealerId                  BIGSERIAL PRIMARY KEY
- deskId                    BIGINT NOT NULL REFERENCES dealing_desk(id)
- employeeId               VARCHAR(80) NOT NULL
- dealerName               VARCHAR(200) NOT NULL
- dealerRole               VARCHAR(20) NOT NULL
    CHECK: HEAD_DEALER, SENIOR_DEALER, DEALER, JUNIOR_DEALER, TRAINEE
- authorizedInstruments     JSONB — what they can trade
- singleTradeLimit          NUMERIC(20,4) — individual trade limit
- dailyVolumeLimit          NUMERIC(20,4) — max daily turnover
- requiresCounterSign       BOOLEAN DEFAULT FALSE — needs supervisor approval
- counterSignThreshold      NUMERIC(20,4) — above this amount needs approval
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: ACTIVE, ON_LEAVE, SUSPENDED, REVOKED
- authorizedFrom            DATE NOT NULL
- authorizedTo              DATE
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `DeskPnl`

```
Fields:
- pnlId                    BIGSERIAL PRIMARY KEY
- deskId                    BIGINT NOT NULL REFERENCES dealing_desk(id)
- pnlDate                  DATE NOT NULL
- currency                  VARCHAR(3) NOT NULL DEFAULT 'USD'
- realizedPnl               NUMERIC(20,4) DEFAULT 0
- unrealizedPnl             NUMERIC(20,4) DEFAULT 0
- totalPnl                  NUMERIC(20,4) DEFAULT 0
- mtdPnl                    NUMERIC(20,4) DEFAULT 0
- ytdPnl                    NUMERIC(20,4) DEFAULT 0
- tradingRevenue             NUMERIC(20,4) DEFAULT 0
- hedgingCost               NUMERIC(20,4) DEFAULT 0
- fundingCost               NUMERIC(20,4) DEFAULT 0
- positionCount             INT DEFAULT 0
- tradeCount                INT DEFAULT 0
- totalVolume               NUMERIC(20,4) DEFAULT 0
- varUtilizationPct         NUMERIC(5,2) — current VaR / VaR limit
- stopLossBreached          BOOLEAN DEFAULT FALSE
- status                    VARCHAR(15) NOT NULL DEFAULT 'PROVISIONAL'
    CHECK: PROVISIONAL, VERIFIED, FINAL
- UNIQUE(deskId, pnlDate)
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
```

#### Service: `DealerDeskService`

```
Methods:
- createDesk(dto)                     — register new dealing desk
- authorizeDealer(deskId, dealerDto)  — assign dealer to desk with limits
- revokeDealer(dealerId)              — remove dealer authorization
- recordDailyPnl(deskId, pnlDto)     — end-of-day P&L snapshot
- getDeskDashboard(deskId)            — real-time: positions, P&L, limit usage
- getDeskPnlHistory(deskId, from, to) — P&L trend
- checkDealerAuthority(dealerId, amount, instrumentType) — pre-trade check
- getActiveDesks()                    — all operational desks
- getDeskDealers(deskId)              — dealers assigned to desk
- suspendDesk(deskId, reason)         — halt trading on desk
```

#### Controller: `DealerDeskController`

```
Endpoints:
POST   /api/v1/dealer-desks                         — create desk
GET    /api/v1/dealer-desks                         — list desks
GET    /api/v1/dealer-desks/{id}                    — desk details
GET    /api/v1/dealer-desks/{id}/dashboard          — live dashboard
POST   /api/v1/dealer-desks/{id}/dealers            — authorize dealer
DELETE /api/v1/dealer-desks/{id}/dealers/{dealerId}  — revoke dealer
GET    /api/v1/dealer-desks/{id}/pnl                — P&L history
POST   /api/v1/dealer-desks/{id}/pnl                — record daily P&L
PUT    /api/v1/dealer-desks/{id}/suspend             — suspend desk
```

---

## 2. Quote Management

**BIAN Service Domain**: Quote Management
**BIAN Definition**: Manage price quotes for trading instruments
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.quotemanagement`

#### Entity: `PriceQuote`

```
Fields:
- quoteId                   BIGSERIAL PRIMARY KEY
- quoteRef                  VARCHAR(30) NOT NULL UNIQUE
- deskId                    BIGINT — FK to dealing_desk
- dealerId                  VARCHAR(80) NOT NULL
- quoteType                 VARCHAR(15) NOT NULL
    CHECK: INDICATIVE, FIRM, REQUEST_FOR_QUOTE, EXECUTABLE
- instrumentType            VARCHAR(20) NOT NULL
    CHECK: FX_SPOT, FX_FORWARD, FX_SWAP, IRS, BOND, TBILL, REPO, COMMERCIAL_PAPER
- instrumentCode            VARCHAR(30)
- currencyPair              VARCHAR(7) — e.g., USDNGN
- tenor                     VARCHAR(10) — e.g., SPOT, 1W, 1M, 3M, 6M, 1Y
- bidPrice                  NUMERIC(20,8) NOT NULL
- askPrice                  NUMERIC(20,8) NOT NULL
- midPrice                  NUMERIC(20,8) — calculated
- spreadBps                 NUMERIC(8,2) — calculated
- notionalAmount            NUMERIC(20,4)
- currency                  VARCHAR(3) NOT NULL
- counterpartyCode          VARCHAR(30)
- counterpartyName          VARCHAR(200)
- validFromTime             TIMESTAMP NOT NULL DEFAULT now()
- validUntilTime            TIMESTAMP — quote expiry
- isAutoGenerated           BOOLEAN DEFAULT FALSE
- pricingModel              VARCHAR(30) — model used to generate
- marketDataRef             VARCHAR(30) — snapshot of inputs used
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: ACTIVE, EXPIRED, ACCEPTED, REJECTED, CANCELLED, TRADED
- tradedRef                 VARCHAR(30) — if converted to trade
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `QuoteRequest`

```
Fields:
- requestId                 BIGSERIAL PRIMARY KEY
- requestRef                VARCHAR(30) NOT NULL UNIQUE
- requestorType             VARCHAR(15) NOT NULL
    CHECK: CUSTOMER, INTERBANK, INTERNAL, BROKER
- requestorId               VARCHAR(80)
- requestorName             VARCHAR(200)
- instrumentType            VARCHAR(20) NOT NULL
- currencyPair              VARCHAR(7)
- tenor                     VARCHAR(10)
- amount                    NUMERIC(20,4) NOT NULL
- direction                 VARCHAR(4) NOT NULL CHECK: BUY, SELL, TWO_WAY
- requestedAt               TIMESTAMP NOT NULL DEFAULT now()
- responseDeadline          TIMESTAMP
- assignedDeskId            BIGINT
- assignedDealerId          VARCHAR(80)
- quotesProvided            INT DEFAULT 0
- selectedQuoteId           BIGINT
- status                    VARCHAR(15) NOT NULL DEFAULT 'OPEN'
    CHECK: OPEN, QUOTED, ACCEPTED, EXPIRED, CANCELLED
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `QuoteManagementService`

```
Methods:
- submitQuoteRequest(dto)                     — customer/counterparty requests a quote
- generateQuote(requestId, deskId)            — dealer generates quote for request
- publishIndicativeQuote(dto)                 — publish indicative pricing
- acceptQuote(quoteId)                        — counterparty accepts → triggers trade
- expireQuotes()                              — scheduled: expire stale quotes
- getActiveQuotes(deskId)                     — live quotes by desk
- getQuoteRequests(status)                    — open RFQs
- getQuoteHistory(instrumentType, from, to)   — historical quotes for analysis
- getSpreadAnalysis(currencyPair, period)     — bid-ask spread trends
```

---

## 3. Suitability Checking

**BIAN Service Domain**: Suitability Checking
**BIAN Definition**: Check product suitability for clients based on risk profile and investment objectives
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.suitability`

#### Entity: `ClientRiskProfile`

```
Fields:
- profileId                 BIGSERIAL PRIMARY KEY
- profileCode               VARCHAR(30) NOT NULL UNIQUE
- customerId                BIGINT NOT NULL
- profileDate               DATE NOT NULL
- investmentObjective       VARCHAR(20) NOT NULL
    CHECK: CAPITAL_PRESERVATION, INCOME, BALANCED, GROWTH, AGGRESSIVE_GROWTH, SPECULATION
- riskTolerance             VARCHAR(10) NOT NULL
    CHECK: CONSERVATIVE, MODERATE, BALANCED, AGGRESSIVE, VERY_AGGRESSIVE
- investmentHorizon         VARCHAR(15) NOT NULL
    CHECK: SHORT_TERM, MEDIUM_TERM, LONG_TERM, VERY_LONG_TERM
- annualIncome              NUMERIC(20,4)
- netWorth                  NUMERIC(20,4)
- liquidNetWorth            NUMERIC(20,4)
- investmentExperience      VARCHAR(15)
    CHECK: NONE, LIMITED, MODERATE, EXTENSIVE, PROFESSIONAL
- instrumentExperience      JSONB — [{instrumentType, experienceLevel, yearsTrading}]
- knowledgeAssessmentScore  NUMERIC(5,2) — out of 100
- concentrationLimits       JSONB — [{assetClass, maxPct}]
- maxSingleInvestmentPct    NUMERIC(5,2) — max % of net worth in single investment
- derivativesApproved       BOOLEAN DEFAULT FALSE
- leverageApproved          BOOLEAN DEFAULT FALSE
- maxLeverageRatio          NUMERIC(5,2)
- assessedBy                VARCHAR(200)
- nextReviewDate            DATE
- regulatoryBasis           VARCHAR(20)
    CHECK: MIFID_II, SEC_REGULATION, CBN_GUIDELINE, INTERNAL_POLICY
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: DRAFT, ACTIVE, EXPIRED, UNDER_REVIEW
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `SuitabilityCheck`

```
Fields:
- checkId                   BIGSERIAL PRIMARY KEY
- checkRef                  VARCHAR(30) NOT NULL UNIQUE
- customerId                BIGINT NOT NULL
- profileId                 BIGINT NOT NULL REFERENCES client_risk_profile(id)
- checkType                 VARCHAR(20) NOT NULL
    CHECK: PRE_TRADE, PERIODIC_REVIEW, PRODUCT_CHANGE, PORTFOLIO_REBALANCE, ADVISORY
- instrumentType            VARCHAR(20) NOT NULL
- instrumentCode            VARCHAR(30)
- instrumentRiskRating      VARCHAR(15)
    CHECK: LOW_RISK, MEDIUM_RISK, HIGH_RISK, VERY_HIGH_RISK, SPECULATIVE
- proposedAmount            NUMERIC(20,4)
- proposedPctOfPortfolio    NUMERIC(5,2)
- proposedPctOfNetWorth     NUMERIC(5,2)
- Rules Evaluated:
  - riskToleranceMatch      BOOLEAN — instrument risk vs client tolerance
  - experienceMatch         BOOLEAN — client has experience with instrument type
  - concentrationCheck      BOOLEAN — within concentration limits
  - liquidityCheck          BOOLEAN — client can afford potential loss
  - knowledgeCheck          BOOLEAN — sufficient knowledge score
  - leverageCheck           BOOLEAN — if leveraged, client is approved
- overallResult             VARCHAR(10) NOT NULL
    CHECK: SUITABLE, UNSUITABLE, SUITABLE_WITH_WARNING
- warningMessages           JSONB — list of warning strings
- rejectionReasons          JSONB — list of rejection reasons
- overrideApplied           BOOLEAN DEFAULT FALSE
- overrideJustification     TEXT
- overrideApprovedBy        VARCHAR(80)
- regulatoryDisclosure      TEXT — disclosure statement provided to client
- clientAcknowledged        BOOLEAN DEFAULT FALSE
- clientAcknowledgedAt      TIMESTAMP
- checkedAt                 TIMESTAMP NOT NULL DEFAULT now()
- createdBy                 VARCHAR(100)
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
```

#### Service: `SuitabilityService`

```
Methods:
- createRiskProfile(customerId, dto)              — questionnaire result → profile
- updateRiskProfile(profileId, dto)               — periodic review
- performSuitabilityCheck(customerId, tradeDto)   — pre-trade suitability evaluation
- overrideCheck(checkId, justification, approver) — allow unsuitable with justification
- acknowledgeDisclosure(checkId)                  — client acknowledges risk
- getProfileByCustomer(customerId)                — current risk profile
- getCheckHistory(customerId)                     — all suitability checks
- getOverrideReport(from, to)                     — compliance: all overrides
- getExpiredProfiles()                            — profiles due for renewal
```

---

## 4. Market Making

**BIAN Service Domain**: Market Making
**BIAN Definition**: Provide market making services — continuous two-way pricing
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.marketmaking`

#### Entity: `MarketMakingMandate`

```
Fields:
- mandateId                 BIGSERIAL PRIMARY KEY
- mandateCode               VARCHAR(30) NOT NULL UNIQUE
- mandateName               VARCHAR(200)
- instrumentType            VARCHAR(20) NOT NULL
    CHECK: FX_SPOT, FX_FORWARD, GOVERNMENT_BOND, CORPORATE_BOND, TBILL, EQUITY
- instrumentCode            VARCHAR(30) — specific instrument or NULL for all in type
- exchange                  VARCHAR(60) — e.g., NGX, FMDQ
- mandateType               VARCHAR(15) NOT NULL
    CHECK: DESIGNATED, VOLUNTARY, INTERBANK, PRIMARY_DEALER
- deskId                    BIGINT NOT NULL REFERENCES dealing_desk(id)
- quoteObligation           VARCHAR(15) NOT NULL
    CHECK: CONTINUOUS, ON_REQUEST, SCHEDULED
- minQuoteSize              NUMERIC(20,4)
- maxQuoteSize              NUMERIC(20,4)
- maxSpreadBps              NUMERIC(8,2) — maximum allowed spread
- minQuoteDurationSeconds   INT — how long quotes must stay valid
- dailyQuoteHours           INT — minimum hours of quoting per day
- inventoryLimit            NUMERIC(20,4) — max position from market making
- hedgingStrategy           VARCHAR(20)
    CHECK: FULL_HEDGE, PARTIAL_HEDGE, DISCRETIONARY, NONE
- performanceMetrics        JSONB — quoting %, fill ratio, spread quality
- effectiveFrom             DATE NOT NULL
- effectiveTo               DATE
- regulatoryRef             VARCHAR(80)
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: PENDING_APPROVAL, ACTIVE, SUSPENDED, TERMINATED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `MarketMakingActivity`

```
Fields:
- activityId                BIGSERIAL PRIMARY KEY
- mandateId                 BIGINT NOT NULL REFERENCES market_making_mandate(id)
- activityDate              DATE NOT NULL
- quotesPublished           INT DEFAULT 0
- quotesHit                 INT DEFAULT 0 — trades from quotes
- fillRatioPct              NUMERIC(5,2)
- avgBidAskSpreadBps        NUMERIC(8,2)
- totalVolume               NUMERIC(20,4)
- buyVolume                 NUMERIC(20,4)
- sellVolume                NUMERIC(20,4)
- netPosition               NUMERIC(20,4)
- realizedPnl               NUMERIC(20,4) DEFAULT 0
- unrealizedPnl             NUMERIC(20,4) DEFAULT 0
- inventoryTurnover         NUMERIC(8,4)
- quotingUptimePct          NUMERIC(5,2) — % of trading hours with active quotes
- spreadViolationCount      INT DEFAULT 0 — times spread exceeded max
- obligationMet             BOOLEAN DEFAULT TRUE
- UNIQUE(mandateId, activityDate)
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
```

#### Service: `MarketMakingService`

```
Methods:
- createMandate(dto)                          — register market making obligation
- recordDailyActivity(mandateId, activityDto) — EOD activity log
- getActiveMandates()                         — all current mandates
- getMandatePerformance(mandateId, from, to)  — performance trend
- getObligationComplianceReport(period)       — are we meeting quoting obligations?
- getInventoryExposure()                      — current market making inventory
- suspendMandate(mandateId, reason)           — halt market making
```

---

## 5. ECM and DCM

**BIAN Service Domain**: ECM And DCM (Equity Capital Markets & Debt Capital Markets)
**BIAN Definition**: Equity and debt capital markets operations — underwriting, distribution
**Current Status**: GAP (partial reference in `syndicate` package — `BOND_UNDERWRITING`, `IPO` types)

### Implementation Specification

#### Package: `com.cbs.capitalmarkets`

#### Entity: `CapitalMarketDeal`

```
Fields:
- dealId                    BIGSERIAL PRIMARY KEY
- dealCode                  VARCHAR(30) NOT NULL UNIQUE
- dealType                  VARCHAR(20) NOT NULL
    CHECK: IPO, FOLLOW_ON, RIGHTS_ISSUE, BOND_ISSUANCE, SUKUK,
           COMMERCIAL_PAPER, MEDIUM_TERM_NOTE, SECURITIZATION, CONVERTIBLE
- marketType                VARCHAR(5) NOT NULL
    CHECK: ECM, DCM
- issuerName                VARCHAR(200) NOT NULL
- issuerCustomerId          BIGINT
- issuerSector              VARCHAR(40)
- currency                  VARCHAR(3) NOT NULL DEFAULT 'NGN'
- targetAmount              NUMERIC(20,4) NOT NULL
- actualAmount              NUMERIC(20,4) DEFAULT 0
- issuePrice                NUMERIC(20,8)
- couponRate                NUMERIC(8,4) — for DCM
- tenorMonths               INT — for DCM
- maturityDate              DATE — for DCM
- our Role:
  - ourRole                 VARCHAR(20) NOT NULL
      CHECK: LEAD_MANAGER, JOINT_LEAD, CO_MANAGER, UNDERWRITER, BOOKRUNNER,
             FINANCIAL_ADVISER, SELLING_AGENT, RECEIVING_AGENT
  - ourCommitmentAmount     NUMERIC(20,4)
  - ourFeePct               NUMERIC(5,4)
  - ourFeeAmount            NUMERIC(15,4)
- Deal Timeline:
  - mandateDate             DATE
  - prospectusDate          DATE
  - bookBuildStartDate      DATE
  - bookBuildEndDate        DATE
  - pricingDate             DATE
  - allotmentDate           DATE
  - listingDate             DATE
  - settlementDate          DATE
- regulatoryApprovalRef     VARCHAR(80) — SEC approval
- exchange                  VARCHAR(60) — e.g., NGX, FMDQ
- listingRef                VARCHAR(30)
- prospectusRef             VARCHAR(200)
- creditRating              VARCHAR(10)
- ratingAgency              VARCHAR(60)
- subscriptionLevel         NUMERIC(8,2) — e.g., 2.5x oversubscribed
- allocationMethod          VARCHAR(15)
    CHECK: PRO_RATA, DISCRETIONARY, BALLOT, PRIORITY
- syndicateId               BIGINT — FK to syndicate_arrangement if applicable
- status                    VARCHAR(15) NOT NULL DEFAULT 'MANDATE'
    CHECK: MANDATE, STRUCTURING, REGULATORY_REVIEW, BOOK_BUILDING,
           PRICED, ALLOTTED, SETTLED, LISTED, CANCELLED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `DealInvestor`

```
Fields:
- investorId                BIGSERIAL PRIMARY KEY
- dealId                    BIGINT NOT NULL REFERENCES capital_market_deal(id)
- investorName              VARCHAR(200) NOT NULL
- investorType              VARCHAR(20) NOT NULL
    CHECK: INSTITUTIONAL, RETAIL, HNI, PENSION_FUND, INSURANCE, MUTUAL_FUND,
           SOVEREIGN_WEALTH, CORPORATE, STAFF, GOVERNMENT
- bidAmount                 NUMERIC(20,4) NOT NULL
- bidPrice                  NUMERIC(20,8) — for book building
- allottedAmount            NUMERIC(20,4)
- allottedUnits             NUMERIC(20,6)
- paymentReceived           NUMERIC(20,4) DEFAULT 0
- refundAmount              NUMERIC(20,4) DEFAULT 0
- certificateRef            VARCHAR(80)
- status                    VARCHAR(15) NOT NULL DEFAULT 'BID_RECEIVED'
    CHECK: BID_RECEIVED, ALLOTTED, PAID, REFUNDED, CANCELLED
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `CapitalMarketsService`

```
Methods:
- createDeal(dto)                            — register new ECM/DCM deal
- addInvestorBid(dealId, bidDto)             — record investor subscription
- executePricing(dealId, price)              — set issue price
- executeAllotment(dealId, method)           — allocate to investors
- settleAllotment(dealId)                    — process payments
- getDealPipeline()                          — all active deals by stage
- getDealPerformance(dealId)                 — subscription level, distribution
- getInvestorBook(dealId)                    — full order book
- getRevenueReport(period)                   — fees earned from CM deals
```

---

## 6. Program Trading

**BIAN Service Domain**: Program Trading
**BIAN Definition**: Execute program/algorithmic trading strategies
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.programtrading`

#### Entity: `TradingStrategy`

```
Fields:
- strategyId                BIGSERIAL PRIMARY KEY
- strategyCode              VARCHAR(30) NOT NULL UNIQUE
- strategyName              VARCHAR(200) NOT NULL
- strategyType              VARCHAR(25) NOT NULL
    CHECK: TWAP, VWAP, ICEBERG, BASKET, INDEX_REBALANCE, PAIRS, STATISTICAL_ARB,
           MOMENTUM, MEAN_REVERSION, SCHEDULED
- deskId                    BIGINT REFERENCES dealing_desk(id)
- instrumentScope           JSONB — list of instruments or criteria
- executionAlgorithm        VARCHAR(30)
    CHECK: TIME_SLICE, VOLUME_PARTICIPATION, IMPLEMENTATION_SHORTFALL, ARRIVAL_PRICE, CUSTOM
- parameters                JSONB — algorithm-specific parameters
    e.g., {sliceDurationMin: 5, maxParticipationPct: 10, priceLimit: 100.50}
- riskLimits                JSONB
    e.g., {maxSlippage: 0.5, maxPositionSize: 1000000, stopLoss: 50000}
- preTradeChecks            JSONB — checks before each child order
    e.g., [{check: "SUITABILITY", required: true}, {check: "LIMIT_CHECK", required: true}]
- approvedBy                VARCHAR(80)
- approvalDate              DATE
- modelRiskTier             VARCHAR(10)
    CHECK: TIER_1, TIER_2, TIER_3
- status                    VARCHAR(15) NOT NULL DEFAULT 'DRAFT'
    CHECK: DRAFT, APPROVED, ACTIVE, PAUSED, RETIRED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `ProgramExecution`

```
Fields:
- executionId               BIGSERIAL PRIMARY KEY
- executionRef              VARCHAR(30) NOT NULL UNIQUE
- strategyId                BIGINT NOT NULL REFERENCES trading_strategy(id)
- executionDate             DATE NOT NULL
- parentOrderRef            VARCHAR(30) — master order
- targetQuantity            NUMERIC(20,6)
- targetAmount              NUMERIC(20,4)
- executedQuantity           NUMERIC(20,6) DEFAULT 0
- executedAmount             NUMERIC(20,4) DEFAULT 0
- avgExecutionPrice         NUMERIC(20,8)
- benchmarkPrice            NUMERIC(20,8) — e.g., arrival price
- slippageBps               NUMERIC(8,2) — vs benchmark
- childOrderCount           INT DEFAULT 0
- completionPct             NUMERIC(5,2) DEFAULT 0
- startedAt                 TIMESTAMP
- completedAt               TIMESTAMP
- cancelledReason           TEXT
- status                    VARCHAR(15) NOT NULL DEFAULT 'PENDING'
    CHECK: PENDING, EXECUTING, PAUSED, COMPLETED, PARTIALLY_COMPLETED, CANCELLED, FAILED
- createdBy                 VARCHAR(100)
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
- updatedAt                 TIMESTAMP NOT NULL DEFAULT now()
- version                   BIGINT DEFAULT 0
```

#### Service: `ProgramTradingService`

```
Methods:
- defineStrategy(dto)                       — create trading strategy
- launchExecution(strategyId, orderDto)      — start program execution
- pauseExecution(executionId)               — pause child order generation
- resumeExecution(executionId)              — resume
- cancelExecution(executionId, reason)       — cancel
- getExecutionStatus(executionRef)           — real-time status
- getSlippageReport(from, to)               — benchmark performance analysis
- getActiveExecutions()                      — all running programs
- getStrategyPerformanceHistory(strategyId)  — historical slippage/fill stats
```

---

## 7. Trader Position Operations

**BIAN Service Domain**: Trader Position Operations
**BIAN Definition**: Manage trader-level position operations and limits
**Current Status**: GAP (position management exists at portfolio level in `positionmgmt`, not trader level)

### Implementation Specification

#### Package: `com.cbs.traderposition`

#### Entity: `TraderPosition`

```
Fields:
- positionId                BIGSERIAL PRIMARY KEY
- positionRef               VARCHAR(30) NOT NULL UNIQUE
- dealerId                  VARCHAR(80) NOT NULL
- dealerName                VARCHAR(200) NOT NULL
- deskId                    BIGINT NOT NULL REFERENCES dealing_desk(id)
- instrumentType            VARCHAR(20) NOT NULL
- instrumentCode            VARCHAR(30) NOT NULL
- instrumentName            VARCHAR(300)
- currency                  VARCHAR(3) NOT NULL
- longQuantity              NUMERIC(20,6) DEFAULT 0
- shortQuantity             NUMERIC(20,6) DEFAULT 0
- netQuantity               NUMERIC(20,6) DEFAULT 0 — long - short
- avgCostLong               NUMERIC(20,8)
- avgCostShort              NUMERIC(20,8)
- marketPrice               NUMERIC(20,8)
- marketValue               NUMERIC(20,4)
- unrealizedPnl             NUMERIC(20,4) DEFAULT 0
- realizedPnlToday          NUMERIC(20,4) DEFAULT 0
- traderPositionLimit       NUMERIC(20,4)
- limitUtilizationPct       NUMERIC(5,2)
- limitBreached             BOOLEAN DEFAULT FALSE
- positionDate              DATE NOT NULL
- lastTradeAt               TIMESTAMP
- status                    VARCHAR(15) NOT NULL DEFAULT 'OPEN'
    CHECK: OPEN, FLAT, LIMIT_BREACH, SUSPENDED
- createdAt, updatedAt      TIMESTAMP
- UNIQUE(dealerId, instrumentCode, positionDate)
```

#### Entity: `TraderPositionLimit`

```
Fields:
- limitId                   BIGSERIAL PRIMARY KEY
- dealerId                  VARCHAR(80) NOT NULL
- limitType                 VARCHAR(20) NOT NULL
    CHECK: GROSS_POSITION, NET_POSITION, SINGLE_INSTRUMENT, VAR,
           STOP_LOSS_DAILY, STOP_LOSS_MONTHLY, OVERNIGHT, INTRADAY
- instrumentType            VARCHAR(20) — NULL = all instruments
- currency                  VARCHAR(3) DEFAULT 'USD'
- limitAmount               NUMERIC(20,4) NOT NULL
- warningThresholdPct       NUMERIC(5,2) DEFAULT 80
- currentUtilization        NUMERIC(20,4) DEFAULT 0
- utilizationPct            NUMERIC(5,2) DEFAULT 0
- lastBreachDate            DATE
- breachCount               INT DEFAULT 0
- approvedBy                VARCHAR(80)
- effectiveFrom             DATE NOT NULL
- effectiveTo               DATE
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: ACTIVE, WARNING, BREACHED, SUSPENDED, EXPIRED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `TraderPositionService`

```
Methods:
- updatePosition(dealerId, tradeDto)          — update position from trade
- setLimit(dealerId, limitDto)                — assign/update position limit
- checkLimit(dealerId, proposedTrade)         — pre-trade limit check
- flattenPosition(dealerId, instrumentCode)   — close out position
- getTraderPositions(dealerId)                — all open positions
- getTraderPnl(dealerId, date)                — P&L for the day
- getLimitBreaches(from, to)                  — compliance report
- getTraderRanking(metric, period)            — rank by P&L, volume
- getOvernightPositions(deskId)               — end-of-day positions carried over
```

---

## 8. Market Order

**BIAN Service Domain**: Market Order
**BIAN Definition**: Handle market orders — capture, validate, route
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.marketorder`

#### Entity: `MarketOrder`

```
Fields:
- orderId                   BIGSERIAL PRIMARY KEY
- orderRef                  VARCHAR(30) NOT NULL UNIQUE
- orderSource               VARCHAR(15) NOT NULL
    CHECK: CLIENT, DEALER, PROGRAM, INTERNAL, REBALANCE
- customerId                BIGINT — if client order
- dealerId                  VARCHAR(80)
- deskId                    BIGINT REFERENCES dealing_desk(id)
- portfolioCode             VARCHAR(30) — if portfolio order
- orderType                 VARCHAR(15) NOT NULL
    CHECK: MARKET, LIMIT, STOP, STOP_LIMIT, FILL_OR_KILL, GOOD_TILL_CANCEL,
           GOOD_TILL_DATE, IMMEDIATE_OR_CANCEL
- side                      VARCHAR(4) NOT NULL CHECK: BUY, SELL
- instrumentType            VARCHAR(20) NOT NULL
- instrumentCode            VARCHAR(30) NOT NULL
- instrumentName            VARCHAR(300)
- exchange                  VARCHAR(60)
- quantity                  NUMERIC(20,6) NOT NULL
- limitPrice                NUMERIC(20,8) — for LIMIT/STOP_LIMIT
- stopPrice                 NUMERIC(20,8) — for STOP/STOP_LIMIT
- currency                  VARCHAR(3) NOT NULL
- timeInForce               VARCHAR(15) NOT NULL DEFAULT 'DAY'
    CHECK: DAY, GTC, GTD, IOC, FOK
- expiryDate                DATE — for GTD
- filledQuantity            NUMERIC(20,6) DEFAULT 0
- avgFilledPrice            NUMERIC(20,8)
- filledAmount              NUMERIC(20,4) DEFAULT 0
- remainingQuantity         NUMERIC(20,6)
- commissionAmount          NUMERIC(15,4)
- commissionCurrency        VARCHAR(3)
- suitabilityCheckId        BIGINT — FK to suitability_check
- suitabilityResult         VARCHAR(10)
- validationErrors          JSONB
- routedTo                  VARCHAR(60) — exchange or OTC counterparty
- routedAt                  TIMESTAMP
- filledAt                  TIMESTAMP
- cancelledReason           TEXT
- status                    VARCHAR(15) NOT NULL DEFAULT 'NEW'
    CHECK: NEW, VALIDATED, ROUTED, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `MarketOrderService`

```
Methods:
- submitOrder(dto)                    — capture and validate order
- validateOrder(orderId)              — pre-trade checks (limits, suitability, balance)
- routeOrder(orderId, destination)    — send to exchange/counterparty
- cancelOrder(orderId, reason)        — cancel outstanding order
- amendOrder(orderId, amendDto)       — modify price/quantity (if exchange allows)
- getOrderStatus(orderRef)            — current status
- getOrdersByCustomer(customerId)     — client order history
- getOrdersByDesk(deskId, date)       — desk order flow
- getOpenOrders()                     — all outstanding orders
- getOrderFillReport(from, to)        — fill rates, avg fill time
```

---

## 9. Market Order Execution

**BIAN Service Domain**: Market Order Execution
**BIAN Definition**: Execute market orders — fill management, execution reporting
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.orderexecution`

#### Entity: `OrderExecution`

```
Fields:
- executionId               BIGSERIAL PRIMARY KEY
- executionRef              VARCHAR(30) NOT NULL UNIQUE
- orderId                   BIGINT NOT NULL REFERENCES market_order(id)
- executionType             VARCHAR(15) NOT NULL
    CHECK: FULL_FILL, PARTIAL_FILL, CORRECTION, CANCELLATION, BUST
- executionVenue            VARCHAR(60) NOT NULL
    CHECK: NGX, FMDQ, NASD, OTC, INTERNAL_CROSS, INTERBANK
- executionPrice            NUMERIC(20,8) NOT NULL
- executionQuantity         NUMERIC(20,6) NOT NULL
- executionAmount           NUMERIC(20,4) NOT NULL
- currency                  VARCHAR(3) NOT NULL
- counterpartyCode          VARCHAR(30)
- counterpartyName          VARCHAR(200)
- commissionCharged         NUMERIC(15,4)
- stampDuty                 NUMERIC(15,4)
- levyAmount                NUMERIC(15,4) — SEC/NSE levy
- netSettlementAmount       NUMERIC(20,4)
- tradeDate                 DATE NOT NULL
- settlementDate            DATE NOT NULL
- settlementCycle           VARCHAR(5)
    CHECK: T0, T1, T2, T3
- confirmationRef           VARCHAR(30)
- executedAt                TIMESTAMP NOT NULL
- reportedToExchange        BOOLEAN DEFAULT FALSE
- reportedAt                TIMESTAMP
- exchangeTradeId           VARCHAR(30) — exchange-assigned ID
- status                    VARCHAR(15) NOT NULL DEFAULT 'EXECUTED'
    CHECK: EXECUTED, CONFIRMED, REPORTED, SETTLED, BUSTED, CORRECTED
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
```

#### Entity: `ExecutionQuality`

```
Fields:
- qualityId                 BIGSERIAL PRIMARY KEY
- orderId                   BIGINT NOT NULL REFERENCES market_order(id)
- benchmarkType             VARCHAR(20) NOT NULL
    CHECK: ARRIVAL_PRICE, VWAP, TWAP, CLOSE_PRICE, OPEN_PRICE, MIDPOINT
- benchmarkPrice            NUMERIC(20,8) NOT NULL
- avgExecutionPrice         NUMERIC(20,8) NOT NULL
- slippageBps               NUMERIC(8,2) — positive = worse than benchmark
- implementationShortfall   NUMERIC(20,4) — dollar cost of slippage
- marketImpactBps           NUMERIC(8,2) — estimated market impact
- timingCostBps             NUMERIC(8,2) — cost of delay
- executionDurationSeconds  INT
- fillRatePct               NUMERIC(5,2)
- numberOfFills             INT
- analysisDate              DATE NOT NULL
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
```

#### Service: `OrderExecutionService`

```
Methods:
- recordExecution(orderId, executionDto)       — log fill from exchange/OTC
- bustExecution(executionRef, reason)           — void erroneous execution
- generateConfirmation(executionRef)            — trade confirmation
- analyzeExecutionQuality(orderId)             — benchmark analysis
- getExecutionsByOrder(orderId)                 — all fills for an order
- getDailyExecutionReport(date)                 — all executions for the day
- getExecutionQualityReport(from, to)           — aggregate quality metrics
- getBestExecutionReport(period)                — regulatory best execution report
- getVenueAnalysis(period)                      — execution quality by venue
```

---

## 10. Trading Book Oversight

**BIAN Service Domain**: Trading Book Oversight
**BIAN Definition**: Oversee trading book positions and risk
**Current Status**: GAP (TRADING_BOOK referenced in V29 ALM/Market Risk schema but no dedicated oversight)

### Implementation Specification

#### Package: `com.cbs.tradingbook`

#### Entity: `TradingBook`

```
Fields:
- bookId                    BIGSERIAL PRIMARY KEY
- bookCode                  VARCHAR(20) NOT NULL UNIQUE
- bookName                  VARCHAR(200) NOT NULL
- bookType                  VARCHAR(20) NOT NULL
    CHECK: FX, RATES, CREDIT, EQUITY, COMMODITY, STRUCTURED, ALM, BANKING_BOOK
- deskId                    BIGINT REFERENCES dealing_desk(id)
- baseCurrency              VARCHAR(3) NOT NULL DEFAULT 'USD'
- regulatoryClassification  VARCHAR(20) NOT NULL
    CHECK: TRADING_BOOK, BANKING_BOOK — Basel III FRTB classification
- positionCount             INT DEFAULT 0
- grossPositionValue        NUMERIC(20,4) DEFAULT 0
- netPositionValue          NUMERIC(20,4) DEFAULT 0
- dailyPnl                  NUMERIC(20,4) DEFAULT 0
- mtdPnl                    NUMERIC(20,4) DEFAULT 0
- ytdPnl                    NUMERIC(20,4) DEFAULT 0
- varAmount                 NUMERIC(20,4) — current VaR
- varLimit                  NUMERIC(20,4)
- varUtilizationPct         NUMERIC(5,2)
- stressTestLoss            NUMERIC(20,4)
- capitalRequirement        NUMERIC(20,4) — regulatory capital
- lastValuationAt           TIMESTAMP
- status                    VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK: ACTIVE, SUSPENDED, CLOSED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `TradingBookSnapshot`

```
Fields:
- snapshotId                BIGSERIAL PRIMARY KEY
- bookId                    BIGINT NOT NULL REFERENCES trading_book(id)
- snapshotDate              DATE NOT NULL
- snapshotType              VARCHAR(10) NOT NULL
    CHECK: EOD, INTRADAY, STRESS_TEST
- positionCount             INT
- grossPositionValue        NUMERIC(20,4)
- netPositionValue          NUMERIC(20,4)
- realizedPnl               NUMERIC(20,4)
- unrealizedPnl             NUMERIC(20,4)
- totalPnl                  NUMERIC(20,4)
- var95_1d                  NUMERIC(20,4)
- var99_1d                  NUMERIC(20,4)
- expectedShortfall         NUMERIC(20,4)
- greeks                    JSONB — {delta, gamma, vega, theta, rho}
- concentrationByInstrument JSONB
- concentrationByCurrency   JSONB
- concentrationByCounterparty JSONB
- limitBreaches             JSONB — list of limits breached
- capitalCharge             NUMERIC(20,4)
- UNIQUE(bookId, snapshotDate, snapshotType)
- createdAt                 TIMESTAMP NOT NULL DEFAULT now()
```

#### Service: `TradingBookService`

```
Methods:
- createBook(dto)                          — register trading book
- takeEodSnapshot(bookId)                  — end-of-day capture
- getBookDashboard(bookId)                 — live positions, P&L, risk
- getBookHistory(bookId, from, to)         — historical snapshots
- getConcentrationReport(bookId)           — concentration risk
- getLimitBreachHistory(bookId, from, to)  — breach log
- getCapitalRequirement(bookId)            — regulatory capital calc
- getAllBooks()                             — overview of all trading books
- getBankWideTradingRisk()                 — aggregate trading risk
```

---

## 11. Trading Models

**BIAN Service Domain**: Trading Models
**BIAN Definition**: Develop and maintain trading models
**Current Status**: GAP (QuantModel exists generically, no trading-specific model management)

### Implementation Specification

#### Package: `com.cbs.tradingmodel`

#### Entity: `TradingModel`

```
Fields:
- modelId                   BIGSERIAL PRIMARY KEY
- modelCode                 VARCHAR(30) NOT NULL UNIQUE
- modelName                 VARCHAR(200) NOT NULL
- modelPurpose              VARCHAR(25) NOT NULL
    CHECK: PRICING, HEDGING, EXECUTION, RISK_MEASUREMENT, MARKET_MAKING,
           SIGNAL_GENERATION, PORTFOLIO_OPTIMIZATION, CURVE_CONSTRUCTION
- instrumentScope           VARCHAR(20) NOT NULL
    CHECK: FX, RATES, CREDIT, EQUITY, COMMODITY, MULTI_ASSET
- methodology               VARCHAR(30)
    CHECK: BLACK_SCHOLES, BINOMIAL, MONTE_CARLO, FINITE_DIFFERENCE, HULL_WHITE,
           SABR, HESTON, GARCH, COPULA, MACHINE_LEARNING, CUSTOM
- inputParameters           JSONB — market data inputs required
- outputMetrics             JSONB — what the model produces
- assumptions               JSONB — key model assumptions
- limitations               TEXT — known limitations
- calibrationFrequency      VARCHAR(15)
    CHECK: REAL_TIME, DAILY, WEEKLY, MONTHLY, ON_DEMAND
- lastCalibratedAt          TIMESTAMP
- calibrationQuality        VARCHAR(10)
    CHECK: EXCELLENT, GOOD, ACCEPTABLE, POOR
- modelOwner                VARCHAR(200)
- developer                 VARCHAR(200)
- lastValidatedAt           TIMESTAMP
- validationResult          VARCHAR(15)
    CHECK: APPROVED, CONDITIONALLY_APPROVED, REJECTED, PENDING
- modelRiskTier             VARCHAR(10)
    CHECK: TIER_1, TIER_2, TIER_3
- regulatoryUse             BOOLEAN DEFAULT FALSE
- productionDeployedAt      TIMESTAMP
- performanceMetrics        JSONB — accuracy, error rates, etc.
- nextReviewDate            DATE
- status                    VARCHAR(15) NOT NULL DEFAULT 'DEVELOPMENT'
    CHECK: DEVELOPMENT, TESTING, VALIDATION, APPROVED, PRODUCTION, SUSPENDED, RETIRED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `TradingModelService`

```
Methods:
- registerModel(dto)                        — define new trading model
- submitForValidation(modelId)              — request independent validation
- deployToProduction(modelId)               — promote approved model
- calibrateModel(modelId, marketDataDto)    — run calibration
- retireModel(modelId, replacementId)       — retire with successor
- getModelInventory()                       — all trading models by status
- getModelPerformance(modelId, from, to)    — tracking accuracy over time
- getCalibrationHistory(modelId)            — calibration log
- getModelsForReview()                      — models past review date
- getModelRiskDashboard()                   — risk tier distribution, overdue reviews
```

---

# B. CORPORATE FINANCING & ADVISORY (5 SDs)

> **Context**: These service domains cover investment banking advisory services. For a core banking
> platform, these represent **fee-based advisory services** that the bank's corporate finance team
> offers. The implementation should focus on **deal tracking and fee management** rather than full
> execution capabilities, which are handled by specialized platforms.

---

## 12. Public Offering (IPO)

**BIAN Service Domain**: Public Offering
**BIAN Definition**: Manage public offering activities
**Current Status**: GAP (reference in `syndicate` as type `IPO`, no dedicated implementation)

### Implementation Specification

> **Note**: Covered by [ECM and DCM (#5)](#5-ecm-and-dcm) — the `CapitalMarketDeal` entity with
> `dealType = IPO | FOLLOW_ON | RIGHTS_ISSUE` handles public offering deal tracking.
> Additional entity needed for regulatory/prospectus specifics.

#### Package: `com.cbs.publicoffering` (extends `capitalmarkets`)

#### Entity: `PublicOfferingDetail`

```
Fields:
- detailId                  BIGSERIAL PRIMARY KEY
- dealId                    BIGINT NOT NULL REFERENCES capital_market_deal(id)
- offeringType              VARCHAR(15) NOT NULL
    CHECK: IPO, SECONDARY, RIGHTS_ISSUE, FOLLOW_ON, OFFER_FOR_SALE, OFFER_FOR_SUBSCRIPTION
- exchangeMarket            VARCHAR(60) NOT NULL — e.g., NGX Main Board, NGX ASeM
- sharesOffered             BIGINT NOT NULL
- parValue                  NUMERIC(20,8)
- offerPrice                NUMERIC(20,8)
- priceRange                JSONB — {min, max} for book building
- greenShoeOption           BOOLEAN DEFAULT FALSE
- greenShoeShares           BIGINT
- lockUpPeriodDays          INT — insider lock-up
- prospectusSubmittedDate   DATE
- prospectusApprovalDate    DATE
- secApprovalRef            VARCHAR(80)
- nseApprovalRef            VARCHAR(80)
- applicationOpenDate       DATE
- applicationCloseDate      DATE
- basisOfAllotment          TEXT
- refundStartDate           DATE
- listingDate               DATE
- openingPrice              NUMERIC(20,8)
- closingPriceDay1          NUMERIC(20,8)
- pricePerformance30Days    NUMERIC(8,4) — % return after 30 days
- retailAllocationPct       NUMERIC(5,2)
- institutionalAllocationPct NUMERIC(5,2)
- totalApplications         BIGINT
- totalAmountReceived       NUMERIC(20,4)
- status                    VARCHAR(15) NOT NULL DEFAULT 'PLANNING'
    CHECK: PLANNING, SEC_REVIEW, APPROVED, OPEN, CLOSED, ALLOTTED, LISTED, WITHDRAWN
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `PublicOfferingService`

```
Methods:
- createOffering(dealId, dto)               — attach offering details to CM deal
- submitToRegulator(detailId)               — mark as submitted to SEC
- openApplications(detailId)                — open for subscriptions
- closeApplications(detailId)               — close subscription period
- recordAllotment(detailId, allotmentData)  — basis of allotment
- getOfferingStatus(detailId)               — current stage
- getOfferingPerformance(detailId)          — post-listing performance
- getPipelineReport()                       — all upcoming/active offerings
```

---

## 13. Private Placement

**BIAN Service Domain**: Private Placement
**BIAN Definition**: Manage private placement activities
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.privateplacement`

#### Entity: `PrivatePlacement`

```
Fields:
- placementId               BIGSERIAL PRIMARY KEY
- placementCode             VARCHAR(30) NOT NULL UNIQUE
- dealId                    BIGINT — FK to capital_market_deal if applicable
- placementType             VARCHAR(20) NOT NULL
    CHECK: EQUITY_PRIVATE_PLACEMENT, DEBT_PRIVATE_PLACEMENT, CONVERTIBLE_NOTE,
           MEZZANINE, PREFERENCE_SHARES, VENTURE_ROUND, PRE_IPO
- issuerName                VARCHAR(200) NOT NULL
- issuerCustomerId          BIGINT
- currency                  VARCHAR(3) NOT NULL DEFAULT 'NGN'
- targetAmount              NUMERIC(20,4) NOT NULL
- raisedAmount              NUMERIC(20,4) DEFAULT 0
- instrumentDescription     TEXT — terms of the security
- couponRate                NUMERIC(8,4) — for debt
- maturityDate              DATE — for debt
- conversionTerms           JSONB — for convertible instruments
- minimumSubscription       NUMERIC(20,4)
- maxInvestors              INT — regulatory limit on investor count
- currentInvestors          INT DEFAULT 0
- eligibilityType           VARCHAR(20) NOT NULL
    CHECK: QUALIFIED_INSTITUTIONAL, ACCREDITED, HNI, SOPHISTICATED, STAFF
- offeringMemorandumRef     VARCHAR(200)
- secExemptionRef           VARCHAR(80) — regulatory exemption reference
- closingDate               DATE
- fundsReceivedDate         DATE
- ourRole                   VARCHAR(20) NOT NULL
    CHECK: PLACEMENT_AGENT, ARRANGER, FINANCIAL_ADVISER, INVESTOR
- ourFeeType                VARCHAR(15) CHECK: FLAT, PERCENTAGE, SUCCESS_BASED
- ourFeeAmount              NUMERIC(15,4)
- status                    VARCHAR(15) NOT NULL DEFAULT 'STRUCTURING'
    CHECK: STRUCTURING, MARKETING, SUBSCRIPTION, CLOSED, FUNDED, CANCELLED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Entity: `PlacementInvestor`

```
Fields:
- investorRecordId          BIGSERIAL PRIMARY KEY
- placementId               BIGINT NOT NULL REFERENCES private_placement(id)
- investorName              VARCHAR(200) NOT NULL
- investorType              VARCHAR(20) NOT NULL
- commitmentAmount          NUMERIC(20,4) NOT NULL
- paidAmount                NUMERIC(20,4) DEFAULT 0
- unitsAllocated            NUMERIC(20,6)
- subscriptionDate          DATE
- kycVerified               BOOLEAN DEFAULT FALSE
- accreditationVerified     BOOLEAN DEFAULT FALSE
- status                    VARCHAR(15) NOT NULL DEFAULT 'COMMITTED'
    CHECK: INVITED, COMMITTED, FUNDED, WITHDRAWN
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `PrivatePlacementService`

```
Methods:
- createPlacement(dto)                      — structure private placement
- addInvestor(placementId, investorDto)      — record investor commitment
- recordFunding(placementId, investorId)     — confirm funds received
- closePlacement(placementId)               — close subscription
- getActivePlacements()                      — in-progress placements
- getInvestorBook(placementId)               — investor commitments
- getPlacementReport(period)                 — placements and fees summary
```

---

## 14. Mergers and Acquisitions Advisory

**BIAN Service Domain**: Mergers and Acquisitions Advisory
**BIAN Definition**: Provide M&A advisory services
**Current Status**: GAP

### Implementation Specification

#### Package: `com.cbs.maadvisory`

#### Entity: `MaEngagement`

```
Fields:
- engagementId              BIGSERIAL PRIMARY KEY
- engagementCode            VARCHAR(30) NOT NULL UNIQUE
- engagementName            VARCHAR(300) NOT NULL
- engagementType            VARCHAR(20) NOT NULL
    CHECK: BUY_SIDE, SELL_SIDE, MERGER, DIVESTITURE, MANAGEMENT_BUYOUT,
           LEVERAGED_BUYOUT, RESTRUCTURING, FAIRNESS_OPINION, VALUATION_ONLY
- clientName                VARCHAR(200) NOT NULL
- clientCustomerId          BIGINT
- clientSector              VARCHAR(40)
- targetName                VARCHAR(200)
- targetSector              VARCHAR(40)
- targetCountry             VARCHAR(3)
- transactionCurrency       VARCHAR(3) DEFAULT 'USD'
- estimatedDealValue        NUMERIC(20,4)
- actualDealValue           NUMERIC(20,4)
- dealStructure             VARCHAR(20)
    CHECK: CASH, STOCK, MIXED, ASSET_PURCHASE, SHARE_PURCHASE
- ourRole                   VARCHAR(20) NOT NULL
    CHECK: SOLE_ADVISER, JOINT_ADVISER, BUY_SIDE_ADVISER, SELL_SIDE_ADVISER,
           FAIRNESS_OPINION_PROVIDER, VALUATION_ADVISER
- leadBanker                VARCHAR(200)
- teamMembers               JSONB
- Fee Structure:
  - retainerFee             NUMERIC(15,4)
  - retainerFrequency       VARCHAR(10) CHECK: MONTHLY, QUARTERLY
  - successFeePct           NUMERIC(5,4) — % of deal value
  - successFeeMin           NUMERIC(15,4)
  - successFeeCap           NUMERIC(15,4)
  - expenseReimbursement    BOOLEAN DEFAULT TRUE
  - totalFeesEarned         NUMERIC(15,4) DEFAULT 0
- Milestones:
  - mandateDate             DATE
  - informationMemoDate     DATE
  - dataRoomOpenDate        DATE
  - indicativeBidDeadline   DATE
  - dueDiligenceStart       DATE
  - dueDiligenceEnd         DATE
  - bindingBidDeadline      DATE
  - signingDate             DATE
  - regulatoryApprovalDate  DATE — competition authority
  - closingDate             DATE
- competingBidders          INT — number of interested parties
- confidentialityAgreements JSONB — list of NDAs signed
- regulatoryApprovals       JSONB — required regulatory clearances
- status                    VARCHAR(15) NOT NULL DEFAULT 'PITCHING'
    CHECK: PITCHING, MANDATED, PREPARATION, MARKETING, DUE_DILIGENCE,
           NEGOTIATION, SIGNING, REGULATORY_CLEARANCE, CLOSED, TERMINATED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `MaAdvisoryService`

```
Methods:
- createEngagement(dto)                     — register M&A mandate
- updateMilestone(engagementId, milestone)  — track deal progress
- recordFee(engagementId, feeDto)           — log retainer/success fee
- closeEngagement(engagementId, outcome)    — deal closed or terminated
- getActiveMandates()                       — pipeline of live deals
- getPipelineReport()                       — deals by stage
- getFeeRevenue(period)                     — advisory fee income
- getTeamWorkload()                         — engagements per banker
```

---

## 15. Corporate Tax Advisory

**BIAN Service Domain**: Corporate Tax Advisory
**BIAN Definition**: Provide corporate tax advisory services
**Current Status**: GAP (tax package exists but focused on transaction tax, not advisory)

### Implementation Specification

#### Package: `com.cbs.taxadvisory`

#### Entity: `TaxAdvisoryEngagement`

```
Fields:
- engagementId              BIGSERIAL PRIMARY KEY
- engagementCode            VARCHAR(30) NOT NULL UNIQUE
- engagementName            VARCHAR(200) NOT NULL
- engagementType            VARCHAR(25) NOT NULL
    CHECK: TAX_STRUCTURING, TRANSFER_PRICING, TAX_DUE_DILIGENCE, TAX_COMPLIANCE_REVIEW,
           WITHHOLDING_TAX_ADVISORY, DOUBLE_TAX_TREATY, TAX_OPINION, TAX_DISPUTE,
           VAT_ADVISORY, CUSTOM_DUTY, EXCISE_TAX, INTERNATIONAL_TAX
- clientName                VARCHAR(200) NOT NULL
- clientCustomerId          BIGINT
- jurisdictions             JSONB — countries involved
- taxAuthority              VARCHAR(60)
- leadAdvisor               VARCHAR(200)
- teamMembers               JSONB
- scopeDescription          TEXT
- keyIssues                 JSONB
- taxExposureEstimate       NUMERIC(20,4) — potential tax at risk
- taxSavingsIdentified      NUMERIC(20,4)
- advisoryFee               NUMERIC(15,4)
- feeBasis                  VARCHAR(15)
    CHECK: FIXED, HOURLY, SUCCESS_FEE, RETAINER
- deliverables              JSONB — [{description, dueDate, deliveredDate}]
- opinion                   TEXT — tax opinion summary
- riskRating                VARCHAR(10)
    CHECK: LOW, MEDIUM, HIGH, AGGRESSIVE
- disclaimers               TEXT
- engagementStartDate       DATE
- engagementEndDate         DATE
- status                    VARCHAR(15) NOT NULL DEFAULT 'PROPOSAL'
    CHECK: PROPOSAL, ENGAGED, IN_PROGRESS, OPINION_DELIVERED, CLOSED, TERMINATED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `TaxAdvisoryService`

```
Methods:
- createEngagement(dto)                 — register tax advisory mandate
- deliverOpinion(engagementId, opinion) — deliver tax opinion
- closeEngagement(engagementId)         — complete engagement
- getActiveEngagements()                — pipeline
- getByJurisdiction(country)            — filter by jurisdiction
- getFeeRevenue(period)                 — advisory fee income report
```

---

## 16. Corporate Finance

**BIAN Service Domain**: Corporate Finance
**BIAN Definition**: Provide corporate finance services — financial restructuring, advisory
**Current Status**: GAP (project finance exists but covers only project-specific lending, not broad corporate finance advisory)

### Implementation Specification

#### Package: `com.cbs.corpfinance`

#### Entity: `CorporateFinanceEngagement`

```
Fields:
- engagementId              BIGSERIAL PRIMARY KEY
- engagementCode            VARCHAR(30) NOT NULL UNIQUE
- engagementName            VARCHAR(300) NOT NULL
- engagementType            VARCHAR(25) NOT NULL
    CHECK: DEBT_RESTRUCTURING, EQUITY_RESTRUCTURING, CAPITAL_RAISE_ADVISORY,
           BUSINESS_VALUATION, FINANCIAL_MODELLING, FEASIBILITY_STUDY,
           STRATEGIC_REVIEW, TURNAROUND_ADVISORY, REFINANCING, RECAPITALIZATION
- clientName                VARCHAR(200) NOT NULL
- clientCustomerId          BIGINT
- clientSector              VARCHAR(40)
- currency                  VARCHAR(3) DEFAULT 'USD'
- dealValueEstimate         NUMERIC(20,4)
- ourRole                   VARCHAR(20) NOT NULL
    CHECK: SOLE_ADVISER, LEAD_ADVISER, JOINT_ADVISER, INDEPENDENT_ADVISER
- leadBanker                VARCHAR(200)
- teamMembers               JSONB
- scopeOfWork               TEXT
- keyAssumptions            JSONB
- deliverables              JSONB — [{description, dueDate, status}]
- financialModel            JSONB — key model outputs/scenarios
- valuationRange            JSONB — {lowCase, baseCase, highCase}
- recommendations           TEXT
- Fee Structure:
  - retainerFee             NUMERIC(15,4)
  - successFee              NUMERIC(15,4)
  - totalFeesInvoiced       NUMERIC(15,4) DEFAULT 0
  - totalFeesPaid           NUMERIC(15,4) DEFAULT 0
- Timeline:
  - mandateDate             DATE
  - kickoffDate             DATE
  - draftDeliveryDate       DATE
  - finalDeliveryDate       DATE
  - completionDate          DATE
- linkedDeals               JSONB — related capital market deals, syndications, etc.
- status                    VARCHAR(15) NOT NULL DEFAULT 'PROPOSAL'
    CHECK: PROPOSAL, MANDATED, ANALYSIS, DRAFT_DELIVERED, FINAL_DELIVERED,
           EXECUTION, COMPLETED, TERMINATED
- createdBy, updatedBy      VARCHAR(100)
- createdAt, updatedAt      TIMESTAMP
- version                   BIGINT DEFAULT 0
```

#### Service: `CorporateFinanceService`

```
Methods:
- createEngagement(dto)                     — register CF mandate
- deliverDraft(engagementId, deliverable)   — submit draft deliverable
- finalizeDelivery(engagementId)            — mark deliverables complete
- recordFeeInvoice(engagementId, amount)    — invoice client
- closeEngagement(engagementId, outcome)    — complete or terminate
- getActiveMandates()                       — pipeline
- getPipelineByType()                       — engagements by type
- getFeeRevenue(period)                     — revenue report
- getTeamCapacity()                         — workload per banker
```

---

# C. APPENDICES

## Scope Assessment: Build vs. Buy vs. Skip

| # | Service Domain | Recommendation | Rationale |
|---|---|---|---|
| 1 | Dealer Desk | **Build (Lightweight)** | Most African banks run a small FX/money market desk; needed for treasury integration |
| 2 | Quote Management | **Build (Lightweight)** | Required if dealer desk is built; FX/bond quotes are core to treasury |
| 3 | Suitability Checking | **Build** | Regulatory requirement for wealth/investment customers; integrates with existing wealthmgmt |
| 4 | Market Making | **Build (Lightweight)** | Many banks are primary dealers for government bonds; track mandate compliance |
| 5 | ECM and DCM | **Build** | Capital markets deal tracking is needed for banks that underwrite bonds/equities |
| 6 | Program Trading | **Skip or Defer** | Advanced algo trading is rare in emerging markets; low priority |
| 7 | Trader Position Operations | **Build** | Required for proper risk management if dealer desk is built |
| 8 | Market Order | **Build (Lightweight)** | Needed for client order management in securities/FX |
| 9 | Market Order Execution | **Build (Lightweight)** | Execution logging needed for best-execution compliance |
| 10 | Trading Book Oversight | **Build** | Regulatory requirement for FRTB/Basel III trading book capital |
| 11 | Trading Models | **Build (Lightweight)** | Model inventory and governance; extends existing quantmodel package |
| 12 | Public Offering (IPO) | **Build** | Banks regularly act as issuing house/registrar; fee income tracker |
| 13 | Private Placement | **Build** | Common advisory activity in emerging markets |
| 14 | M&A Advisory | **Build (Lightweight)** | Deal/fee tracking for corporate finance team |
| 15 | Corporate Tax Advisory | **Build (Lightweight)** | Engagement tracking; lightweight |
| 16 | Corporate Finance | **Build (Lightweight)** | Engagement/fee tracking for advisory team |

### Summary

| Recommendation | Count | SDs |
|---|---|---|
| **Build** | 6 | Suitability, ECM/DCM, Trader Positions, Trading Book, Public Offering, Private Placement |
| **Build (Lightweight)** | 9 | Dealer Desk, Quote Mgmt, Market Making, Market Order, Order Execution, Trading Models, M&A, Tax Advisory, Corp Finance |
| **Skip or Defer** | 1 | Program Trading |

---

## Implementation Summary

### New Packages Required

| # | Package | Entities | Service | Complexity |
|---|---|---|---|---|
| 1 | `com.cbs.dealerdesk` | DealingDesk, DeskDealer, DeskPnl | DealerDeskService | Medium |
| 2 | `com.cbs.quotemanagement` | PriceQuote, QuoteRequest | QuoteManagementService | Medium |
| 3 | `com.cbs.suitability` | ClientRiskProfile, SuitabilityCheck | SuitabilityService | Medium |
| 4 | `com.cbs.marketmaking` | MarketMakingMandate, MarketMakingActivity | MarketMakingService | Low-Medium |
| 5 | `com.cbs.capitalmarkets` | CapitalMarketDeal, DealInvestor | CapitalMarketsService | Medium-High |
| 6 | `com.cbs.programtrading` | TradingStrategy, ProgramExecution | ProgramTradingService | Medium |
| 7 | `com.cbs.traderposition` | TraderPosition, TraderPositionLimit | TraderPositionService | Medium |
| 8 | `com.cbs.marketorder` | MarketOrder | MarketOrderService | Medium |
| 9 | `com.cbs.orderexecution` | OrderExecution, ExecutionQuality | OrderExecutionService | Medium |
| 10 | `com.cbs.tradingbook` | TradingBook, TradingBookSnapshot | TradingBookService | Medium |
| 11 | `com.cbs.tradingmodel` | TradingModel | TradingModelService | Low-Medium |
| 12 | `com.cbs.publicoffering` | PublicOfferingDetail | PublicOfferingService | Medium |
| 13 | `com.cbs.privateplacement` | PrivatePlacement, PlacementInvestor | PrivatePlacementService | Medium |
| 14 | `com.cbs.maadvisory` | MaEngagement | MaAdvisoryService | Low-Medium |
| 15 | `com.cbs.taxadvisory` | TaxAdvisoryEngagement | TaxAdvisoryService | Low |
| 16 | `com.cbs.corpfinance` | CorporateFinanceEngagement | CorporateFinanceService | Low-Medium |
| **TOTAL** | **16 packages** | **30 entities** | **16 services** | |

### Database Migrations Required

| Migration | Content | Entities |
|---|---|---|
| **V38** | Wholesale Trading Core | DealingDesk, DeskDealer, DeskPnl, PriceQuote, QuoteRequest, TradingBook, TradingBookSnapshot, TradingModel |
| **V39** | Trading Operations | MarketMakingMandate, MarketMakingActivity, TraderPosition, TraderPositionLimit, MarketOrder, OrderExecution, ExecutionQuality, TradingStrategy, ProgramExecution |
| **V40** | Investment Banking & Advisory | CapitalMarketDeal, DealInvestor, PublicOfferingDetail, PrivatePlacement, PlacementInvestor, SuitabilityCheck, ClientRiskProfile |
| **V41** | Corporate Advisory | MaEngagement, TaxAdvisoryEngagement, CorporateFinanceEngagement |

### Recommended Implementation Waves

#### Wave 4 — Trading Foundation (HIGH if bank has dealing room)

| Items | Packages |
|---|---|
| Dealer Desk | `dealerdesk` |
| Quote Management | `quotemanagement` |
| Trader Positions | `traderposition` |
| Trading Book Oversight | `tradingbook` |
| Trading Models | `tradingmodel` |

**Entities: 11 | Services: 5 | Migration: V38**

#### Wave 5 — Trading Execution & Market Making (MEDIUM)

| Items | Packages |
|---|---|
| Market Order | `marketorder` |
| Order Execution | `orderexecution` |
| Market Making | `marketmaking` |
| Program Trading | `programtrading` (defer if not needed) |

**Entities: 8 | Services: 4 | Migration: V39**

#### Wave 6 — Capital Markets & Advisory (MEDIUM)

| Items | Packages |
|---|---|
| ECM and DCM | `capitalmarkets` |
| Public Offering | `publicoffering` |
| Private Placement | `privateplacement` |
| Suitability Checking | `suitability` |

**Entities: 8 | Services: 4 | Migration: V40**

#### Wave 7 — Corporate Advisory (LOW)

| Items | Packages |
|---|---|
| M&A Advisory | `maadvisory` |
| Corporate Tax Advisory | `taxadvisory` |
| Corporate Finance | `corpfinance` |

**Entities: 3 | Services: 3 | Migration: V41**

---

## Post-Implementation Coverage Target

| Phase | Covered | Partial | Gap | Coverage % |
|---|---|---|---|---|
| **Current (V37)** | 206 | 21 | 16 | 85% |
| **After Partials (Waves 1-3)** | 227 | 0 | 16 | 93% |
| **After Gaps Wave 4-5** | 238 | 0 | 5 | 98% |
| **After Gaps Wave 6-7** | **243** | **0** | **0** | **100%** |

> Achieving **100% BIAN service domain coverage** across all 243 core-banking-relevant service domains (excluding 68 Business Support SDs that are handled by ERP/HRMS/ITSM systems).

---

## Cross-Reference to Companion Document

| Document | Covers | Items | New Entities | New Services |
|---|---|---|---|---|
| [BIAN-PARTIAL-GAP-ANALYSIS.md](./BIAN-PARTIAL-GAP-ANALYSIS.md) | 21 partial implementations | Waves 1-3 | 42 | 25 |
| **This document** | 16 pure gap items | Waves 4-7 | 30 | 16 |
| **COMBINED TOTAL** | **37 items** | **Waves 1-7** | **72 entities** | **41 services** |
