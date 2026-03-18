# BIAN Partial Coverage — Detailed Gap Analysis & Implementation Plan

> **Generated**: 2026-03-18
> **Codebase Version**: V1–V37 (150 packages, 37 migrations)
> **Overall BIAN Coverage**: 85% Covered | 8.6% Partial | 6.4% Gap
> **Purpose**: Close all 21 partial implementations to reach ~93% full coverage

---

## Table of Contents

1. [Branch Location Management & Operations](#1-branch-location-management--operations)
2. [Point of Service](#2-point-of-service)
3. [Contact Routing & Contact Handler](#3-contact-routing--contact-handler)
4. [Customer Workbench](#4-customer-workbench)
5. [Case Root Cause Analysis](#5-case-root-cause-analysis)
6. [Discount Pricing & Special Pricing Conditions](#6-discount-pricing--special-pricing-conditions)
7. [Information Provider Administration & Service Provider Operations](#7-information-provider-administration--service-provider-operations)
8. [Product Quality Assurance](#8-product-quality-assurance)
9. [Market Data Switch Administration & Operation](#9-market-data-switch-administration--operation)
10. [Corporate Lease](#10-corporate-lease)
11. [Factoring (Supply Chain Finance)](#11-factoring-supply-chain-finance)
12. [Trade Settlement](#12-trade-settlement)
13. [Securities Fails Processing](#13-securities-fails-processing)
14. [Financial Instrument Valuation Models](#14-financial-instrument-valuation-models)
15. [Gap Analysis (Compliance)](#15-gap-analysis-compliance)
16. [Contribution Analysis (Business)](#16-contribution-analysis-business)
17. [Branch Portfolio](#17-branch-portfolio)
18. [Market Research](#18-market-research)
19. [Merchant Acquiring Facility](#19-merchant-acquiring-facility)
20. [Information Provider Operation](#20-information-provider-operation)
21. [Term Deposit Framework Agreement](#21-term-deposit-framework-agreement)

---

## 1. Branch Location Management & Operations

**BIAN Service Domains**: Branch Location Management, Branch Location Operations
**Current Package**: `com.cbs.branch`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `Branch.java` entity | branchCode, branchName, branchType (HEAD_OFFICE, REGIONAL, BRANCH, SUB_BRANCH, AGENCY, DIGITAL), parentBranchCode, regionCode, address, phone, email, managerName, operatingHours, servicesOffered (JSON), currency, isActive, openedDate |
| `BranchService.java` | createBranch(), getBranch(), getBranchByCode(), getAllActiveBranches(), getChildBranches(), getRegionBranches(), getBranchesByType(), updateBranch(), closeBranch() |

### What's Missing

#### A. Branch Facility Management (new entity: `BranchFacility`)

```
Fields needed:
- facilityId, branchId
- facilityType: BUILDING, ATM_LOBBY, PARKING, SAFE_ROOM, SERVER_ROOM, GENERATOR, VAULT_ROOM, MEETING_ROOM
- condition: EXCELLENT, GOOD, FAIR, POOR, UNDER_REPAIR
- lastInspectionDate, nextInspectionDue
- maintenanceContractRef, maintenanceVendor
- insurancePolicyRef, insuranceExpiry
- squareFootage, capacity
- accessibilityCompliant (boolean)
- fireExitCount, cctvCameraCount
- facilityNotes (JSON)
- status: OPERATIONAL, UNDER_MAINTENANCE, DECOMMISSIONED
```

**Service methods needed**:
- `registerFacility()` — register facility asset under a branch
- `scheduleInspection()` — create inspection entry
- `recordInspection()` — log inspection result + condition update
- `raiseMaintenance()` — trigger maintenance request
- `completeMaintenance()` — close maintenance + update condition
- `getFacilitiesByBranch()` — list all facilities for a branch
- `getOverdueInspections()` — facilities past inspection due date

#### B. Branch Staff Scheduling (new entity: `BranchStaffSchedule`)

```
Fields needed:
- scheduleId, branchId
- employeeId, employeeName, role (TELLER, CSO, MANAGER, SECURITY, GREETER)
- shiftType: MORNING, AFTERNOON, FULL_DAY, SPLIT, WEEKEND
- scheduledDate, startTime, endTime
- isOvertime (boolean)
- substituteEmployeeId (for swaps)
- status: SCHEDULED, CHECKED_IN, CHECKED_OUT, ABSENT, ON_LEAVE
```

**Service methods needed**:
- `createSchedule()` — assign staff to branch shift
- `checkIn()` / `checkOut()` — attendance tracking
- `swapShift()` — swap between two employees
- `getScheduleByBranch()` — daily/weekly view
- `getStaffUtilization()` — utilization percentage per branch
- `getUnderstaffedBranches()` — branches below minimum staffing

#### C. Branch Queue Management (new entity: `BranchQueueTicket`)

```
Fields needed:
- ticketId, branchId
- ticketNumber (e.g., A001)
- serviceType: CASH_DEPOSIT, CASH_WITHDRAWAL, ACCOUNT_OPENING, ENQUIRY, FOREX, LOAN, CARD_SERVICE, GENERAL
- customerId (optional)
- priority: NORMAL, PRIORITY, VIP
- counterNumber (assigned counter)
- servingEmployeeId
- issuedAt, calledAt, servingStartedAt, completedAt
- waitTimeSeconds, serviceTimeSeconds
- status: WAITING, CALLED, SERVING, COMPLETED, NO_SHOW, CANCELLED
```

**Service methods needed**:
- `issueTicket()` — print/issue queue ticket
- `callNext()` — call next ticket to counter
- `startServing()` / `completeServing()` — track service time
- `markNoShow()` — customer didn't respond
- `getQueueStatus()` — live queue dashboard (waiting count, avg wait time)
- `getQueueAnalytics()` — daily/weekly queue metrics
- `getPeakHourAnalysis()` — identify peak traffic periods

#### D. Branch Service Delivery Plan (new entity: `BranchServicePlan`)

```
Fields needed:
- planId, branchId
- planPeriod: MONTHLY, QUARTERLY, ANNUAL
- periodStart, periodEnd
- targetTransactionVolume, actualTransactionVolume
- targetNewAccounts, actualNewAccounts
- targetCrossSell, actualCrossSell
- customerSatisfactionTarget, customerSatisfactionActual
- avgWaitTimeTarget, avgWaitTimeActual
- avgServiceTimeTarget, avgServiceTimeActual
- staffingPlan (JSON — roles and counts)
- operatingCostBudget, operatingCostActual
- revenueTarget, revenueActual
- status: DRAFT, APPROVED, ACTIVE, CLOSED
```

**Service methods needed**:
- `createPlan()` — define service delivery targets
- `updateActuals()` — record actual performance metrics
- `getPerformanceDashboard()` — plan vs actual comparison
- `getBranchRanking()` — rank branches by achievement %

### Database Migration Needed

```sql
-- V38 or next: Branch Operations Enhancement
CREATE TABLE branch_facility (...);
CREATE TABLE branch_staff_schedule (...);
CREATE TABLE branch_queue_ticket (...);
CREATE TABLE branch_service_plan (...);
```

### Estimated Effort
- **Entities**: 4 new
- **Services**: 4 new (+ extend BranchService)
- **Controllers**: 4 new
- **Migration**: 1 SQL file
- **Complexity**: Medium

---

## 2. Point of Service

**BIAN Service Domain**: Point of Service
**Current Package**: `com.cbs.channel`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `ChannelSession.java` | sessionId, customerId, channel, deviceId, deviceType, ipAddress, userAgent, geo location, context data, status, timeout |
| `ChannelConfig.java` | channel config, features, transaction types, limits, session timeout, operating hours |
| `ChannelService.java` | createSession(), handoffSession(), touchSession(), endSession(), cleanupExpiredSessions(), getActiveSessionCounts() |

### What's Missing

#### A. Service Point Configuration (new entity: `ServicePoint`)

```
Fields needed:
- servicePointId, servicePointName
- servicePointType: BRANCH_COUNTER, SELF_SERVICE_KIOSK, MOBILE_BANKER, ATM, POS_DEVICE, ONLINE, AGENT_TERMINAL
- locationId (branchId or agentId)
- deviceId (if physical)
- supportedServices (JSON — list of service codes)
- operatingHours (JSON)
- isAccessible (boolean — wheelchair accessible)
- staffRequired (boolean)
- assignedStaffId
- maxConcurrentCustomers
- avgServiceTimeMinutes
- status: ONLINE, OFFLINE, MAINTENANCE
```

#### B. Service Point Interaction (new entity: `ServicePointInteraction`)

```
Fields needed:
- interactionId, servicePointId
- customerId, sessionId
- interactionType: ENQUIRY, TRANSACTION, APPLICATION, COMPLAINT, ADVISORY
- servicesUsed (JSON — list of service codes)
- channelUsed
- staffAssisted (boolean), staffId
- startedAt, endedAt
- durationSeconds
- customerSatisfactionScore (1–5)
- feedbackComment
- outcome: COMPLETED, ABANDONED, REFERRED, ESCALATED
```

**Service methods needed**:
- `registerServicePoint()` — define service point with capabilities
- `startInteraction()` / `endInteraction()` — track customer visit
- `getServicePointStatus()` — live status dashboard
- `getServicePointMetrics()` — utilization, avg duration, satisfaction
- `getAvailableServicePoints()` — find nearby available service points by type

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 new
- **Complexity**: Low-Medium

---

## 3. Contact Routing & Contact Handler

**BIAN Service Domains**: Contact Routing, Contact Handler
**Current Package**: `com.cbs.contactcenter`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `ContactCenter.java` | centerCode, centerName, totalAgents, activeAgents, queueCapacity, avgWaitTime, avgHandleTime, serviceLevelTarget |
| `ContactInteraction.java` | interactionId, centerId, customerId, agentId, channel, direction, contactReason, queueName, waitTime, handleTime, disposition, sentiment, firstContactResolution |
| `ContactCenterService.java` | createCenter(), startInteraction(), assignToAgent(), completeInteraction(), getByCustomer(), getAgentQueue() |

### What's Missing

#### A. Routing Rule Engine (new entity: `RoutingRule`)

```
Fields needed:
- ruleId, ruleName
- ruleType: SKILL_BASED, PRIORITY, ROUND_ROBIN, LEAST_OCCUPIED, PREFERRED_AGENT, LANGUAGE, VIP, OVERFLOW
- priority (execution order)
- conditions (JSON):
  - customerSegment, customerLanguage, contactReason
  - channelType, timeOfDay, dayOfWeek
  - customerSentiment, previousAgentId
  - accountBalance (VIP threshold)
- targetQueue, targetSkillGroup, targetAgentId
- fallbackRule (ruleId)
- maxWaitBeforeFallback (seconds)
- isActive (boolean)
- effectiveFrom, effectiveTo
```

#### B. Agent State (new entity: `AgentState`)

```
Fields needed:
- agentStateId, agentId, agentName
- centerId
- skillGroups (JSON — list of skill tags)
- languages (JSON)
- currentState: AVAILABLE, ON_CALL, WRAP_UP, BREAK, LUNCH, TRAINING, OFFLINE
- stateChangedAt
- currentInteractionId
- dailyHandled, dailyAvgHandleTime, dailyFirstContactResolution
- qualityScore (0–100)
- maxConcurrentChats
- activeChatCount
- shiftStart, shiftEnd
```

#### C. Contact Queue (new entity: `ContactQueue`)

```
Fields needed:
- queueId, queueName
- centerId
- queueType: INBOUND_CALL, OUTBOUND_CALL, CHAT, EMAIL, SOCIAL, ESCALATION, CALLBACK
- skillRequired (JSON)
- currentWaiting, longestWaitSeconds
- slaTargetSeconds, slaAchievementPct
- maxCapacity
- overflowQueueId
- priorityLevel: LOW, NORMAL, HIGH, CRITICAL
- agentsAssigned, agentsAvailable
- status: ACTIVE, OVERFLOW, FULL, CLOSED
```

#### D. Callback Request (new entity: `CallbackRequest`)

```
Fields needed:
- callbackId, customerId
- callbackNumber, preferredTime, preferredLanguage
- contactReason, urgency
- assignedAgentId
- attemptCount, maxAttempts
- lastAttemptAt, lastOutcome (ANSWERED, NO_ANSWER, BUSY, VOICEMAIL)
- status: SCHEDULED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
```

**Service methods needed**:
- `routeContact()` — evaluate rules and assign to queue/agent
- `updateAgentState()` — track agent availability transitions
- `requestCallback()` — schedule a callback
- `getQueueDashboard()` — real-time queue metrics
- `getAgentPerformance()` — agent-level KPIs
- `getRoutingEfficiency()` — routing success rate, avg time to assignment

### Estimated Effort
- **Entities**: 4 new
- **Services**: 2 new (RoutingService, AgentStateService)
- **Complexity**: Medium-High

---

## 4. Customer Workbench

**BIAN Service Domain**: Customer Workbench
**Current Package**: `com.cbs.workbench`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `StaffWorkbenchSession.java` | sessionId, staffUserId, staffName, workbenchType (TELLER only), customerId, activeContext (JSON), sessionStatus |
| `WorkbenchService.java` | createSession(), loadCustomerContext(), endSession(), getActiveSessions() |

### What's Missing

#### A. Extended Workbench Types (update `StaffWorkbenchSession`)

```
Add to workbenchType enum:
- TELLER, RELATIONSHIP_MANAGER, LOAN_OFFICER, TRADE_OFFICER, TREASURY_DEALER,
  CARD_OPERATIONS, COMPLIANCE_OFFICER, BRANCH_MANAGER, CALL_CENTER_AGENT, BACK_OFFICE
```

#### B. Workbench Widget Configuration (new entity: `WorkbenchWidget`)

```
Fields needed:
- widgetId, widgetCode
- widgetName, widgetType: CUSTOMER_PROFILE, ACCOUNT_SUMMARY, TRANSACTION_HISTORY,
  RECENT_INTERACTIONS, ALERTS, CROSS_SELL, COMPLIANCE_FLAGS, CASE_TRACKER,
  DOCUMENT_VIEWER, QUICK_ACTIONS, PERFORMANCE_DASHBOARD, APPROVAL_QUEUE
- applicableWorkbenchTypes (JSON)
- displayOrder
- defaultExpanded (boolean)
- dataSourceEndpoint (API path)
- refreshIntervalSeconds
- isRequired (boolean — cannot be hidden)
- status: ACTIVE, INACTIVE
```

#### C. Workbench Quick Action (new entity: `WorkbenchQuickAction`)

```
Fields needed:
- actionId, actionCode
- actionName, actionCategory: TRANSACTION, ENQUIRY, SERVICE_REQUEST, APPROVAL, ESCALATION
- applicableWorkbenchTypes (JSON)
- targetEndpoint (API)
- requiredFields (JSON)
- authorizationLevel: SELF, SUPERVISOR, DUAL_CONTROL
- displayOrder
- hotkey (optional keyboard shortcut)
- isActive (boolean)
```

#### D. Workbench Alert (new entity: `WorkbenchAlert`)

```
Fields needed:
- alertId, sessionId
- alertType: KYC_EXPIRY, FRAUD_FLAG, DELINQUENT, VIP_CUSTOMER, COMPLIANCE_HOLD,
  DORMANT_ACCOUNT, SANCTION_MATCH, DECEASED, PEP_FLAG, PRODUCT_RECOMMENDATION
- severity: INFO, WARNING, CRITICAL
- message, detailsJson
- acknowledged (boolean), acknowledgedAt
- actionTaken
```

**Service methods needed**:
- `loadWorkbench()` — initialize workbench with widgets by type
- `getCustomer360()` — aggregated customer view (accounts, loans, cards, cases, alerts)
- `executeQuickAction()` — perform action with authorization check
- `getAlerts()` — retrieve active alerts for loaded customer
- `acknowledgeAlert()` — mark alert as seen/actioned
- `getApprovalQueue()` — pending items requiring staff approval
- `logAction()` — audit trail of all workbench actions

### Estimated Effort
- **Entities**: 3 new + 1 updated
- **Services**: 1 extended significantly
- **Complexity**: Medium

---

## 5. Case Root Cause Analysis

**BIAN Service Domain**: Case Root Cause Analysis
**Current Package**: `com.cbs.casemgmt`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `CustomerCase.java` | Has `rootCause` field (single text), priority-based SLA, case linking, compensation tracking |
| `CaseMgmtService.java` | createCase(), assignCase(), resolveCase(), escalateCase(), addNote(), checkSlaBreaches() |

### What's Missing

#### A. Root Cause Analysis Record (new entity: `CaseRootCauseAnalysis`)

```
Fields needed:
- rcaId, caseId
- analysisMethod: FIVE_WHYS, FISHBONE, PARETO, FAULT_TREE, TIMELINE, FAILURE_MODE
- analysisDate, analystName
- problemStatement (TEXT)
- rootCauseCategory: PROCESS, SYSTEM, PEOPLE, POLICY, THIRD_PARTY, DATA, INFRASTRUCTURE
- rootCauseSubCategory (VARCHAR)
- rootCauseDescription (TEXT)
- contributingFactors (JSON — list of factor objects)
- evidenceReferences (JSON — document/transaction refs)
- impactAssessment:
  - customersAffected (INT)
  - financialImpact (NUMERIC)
  - reputationalImpact: HIGH, MEDIUM, LOW
  - regulatoryImplication (boolean)
- correctiveActions (JSON):
  - actionDescription, owner, dueDate, status (OPEN, IN_PROGRESS, COMPLETED)
- preventiveActions (JSON):
  - same structure as corrective
- lessonsLearned (TEXT)
- linkedKnowledgeArticleId
- status: IN_PROGRESS, COMPLETED, VALIDATED
```

#### B. Case Pattern Analysis (new entity: `CasePatternInsight`)

```
Fields needed:
- insightId
- patternType: RECURRING_ROOT_CAUSE, PRODUCT_CLUSTER, CHANNEL_CLUSTER, TIME_CLUSTER,
  CUSTOMER_SEGMENT_CLUSTER, GEOGRAPHIC_CLUSTER
- patternDescription
- caseCount, dateRangeStart, dateRangeEnd
- affectedProducts (JSON), affectedChannels (JSON)
- rootCauseCategory
- trendDirection: INCREASING, STABLE, DECREASING
- recommendedAction
- priority: CRITICAL, HIGH, MEDIUM, LOW
- assignedTo
- status: IDENTIFIED, UNDER_REVIEW, ACTIONED, RESOLVED, MONITORING
- generatedAt
```

**Service methods needed**:
- `createRootCauseAnalysis()` — initiate RCA for a case
- `addCorrectiveAction()` / `completeCorrectiveAction()` — track remediation
- `linkKnowledgeArticle()` — link to known solution
- `generatePatternInsights()` — analyze case clusters by category/product/channel
- `getRecurringRootCauses()` — top N root causes by frequency
- `getRcaDashboard()` — summary metrics (avg time to RCA, top categories, open actions)
- `getPreventiveActionStatus()` — track outstanding preventive measures

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 new (RootCauseAnalysisService)
- **Complexity**: Medium

---

## 6. Discount Pricing & Special Pricing Conditions

**BIAN Service Domains**: Discount Pricing, Special Pricing Conditions
**Current Package**: `com.cbs.fees`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `FeeDefinition.java` | Fee schedules with FLAT, PERCENTAGE, TIERED calculation, tax handling, waiver authority levels, product/channel/customer type applicability |
| `FeeChargeLog.java` | Charge logging with waiver tracking |
| `FeeService.java` | chargeEventFees(), chargeFee(), previewFee(), waiveFee(), createFeeDefinition() |

### What's Missing

#### A. Discount Scheme (new entity: `DiscountScheme`)

```
Fields needed:
- schemeId, schemeCode, schemeName
- schemeType: PROMOTIONAL, LOYALTY_TIER, VOLUME_BASED, RELATIONSHIP_BASED,
  SEASONAL, STAFF, BUNDLED_PRODUCT, EARLY_BIRD, REFERRAL, CORPORATE
- discountBasis: PERCENTAGE_OFF, FLAT_REDUCTION, FEE_WAIVER, RATE_REDUCTION,
  CASHBACK, BONUS_INTEREST
- discountValue (NUMERIC)
- applicableFeeIds (JSON — list of fee definition IDs)
- applicableProducts (JSON)
- applicableSegments (JSON — customer segments eligible)
- minRelationshipValue (NUMERIC — min total balance for eligibility)
- minTransactionVolume (INT — min monthly transactions)
- loyaltyTierRequired: BRONZE, SILVER, GOLD, PLATINUM, NONE
- maxDiscountAmount (NUMERIC — cap per transaction)
- maxUsagePerCustomer (INT — per period)
- maxTotalBudget (NUMERIC — total scheme budget)
- currentUtilization (NUMERIC)
- combinableWithOtherDiscounts (boolean)
- priorityOrder (INT — if multiple schemes apply)
- effectiveFrom, effectiveTo
- approvedBy, approvalDate
- status: DRAFT, APPROVED, ACTIVE, EXHAUSTED, EXPIRED, SUSPENDED
```

#### B. Special Pricing Agreement (new entity: `SpecialPricingAgreement`)

```
Fields needed:
- agreementId, agreementCode
- customerId, customerName
- agreementType: RELATIONSHIP_PRICING, CORPORATE_PACKAGE, HIGH_NET_WORTH,
  GOVERNMENT, NGO, STAFF, NEGOTIATED
- negotiatedBy, approvedBy, approvalLevel
- feeOverrides (JSON):
  - [{feeCode, standardRate, negotiatedRate, discountPct}]
- rateOverrides (JSON):
  - [{productCode, standardRate, negotiatedRate, spreadBps}]
- fxMarginOverride (NUMERIC)
- freeTransactionAllowance (INT per month)
- waivedFees (JSON — list of fee codes permanently waived)
- conditions (TEXT — special terms)
- reviewFrequency: QUARTERLY, SEMI_ANNUAL, ANNUAL
- nextReviewDate
- relationshipValueAtApproval (NUMERIC)
- currentRelationshipValue (NUMERIC)
- effectiveFrom, effectiveTo
- status: DRAFT, APPROVED, ACTIVE, UNDER_REVIEW, EXPIRED, TERMINATED
```

**Service methods needed**:
- `createDiscountScheme()` — define discount with eligibility criteria
- `evaluateDiscounts()` — given a fee event + customer, calculate applicable discounts
- `applyDiscount()` — apply and log discount usage
- `getDiscountUtilization()` — track budget/usage
- `createSpecialPricing()` — create negotiated pricing for a customer
- `reviewSpecialPricing()` — trigger review, compare relationship value vs pricing given
- `getSpecialPricingByCustomer()` — all active agreements for a customer
- `getPricingComparisonReport()` — standard vs actual pricing per customer

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 new (PricingService or extend FeeService)
- **Complexity**: Medium

---

## 7. Information Provider Administration & Service Provider Operations

**BIAN Service Domains**: Information Provider Administration, Service Provider Operations
**Current Package**: `com.cbs.provider`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| Provider interfaces | KycProvider (interface), InternalKycProvider, AccountNumberGenerator, DayCountEngine |

### What's Missing

#### A. Service Provider Registry (new entity: `ServiceProvider`)

```
Fields needed:
- providerId, providerCode, providerName
- providerType: KYC_PROVIDER, CREDIT_BUREAU, PAYMENT_GATEWAY, CARD_PROCESSOR,
  SMS_GATEWAY, EMAIL_SERVICE, SWIFT, MARKET_DATA, FRAUD_SCREENING,
  AML_SCREENING, DOCUMENT_VERIFICATION, BIOMETRIC, IDENTITY_VERIFICATION,
  INSURANCE, RATING_AGENCY, CIT_COMPANY, PRINTING_SERVICE
- integrationMethod: REST_API, SOAP, SFTP, MQ, WEBSOCKET, SDK, BATCH_FILE
- baseUrl, apiVersion
- authType: API_KEY, OAUTH2, CERTIFICATE, BASIC, NONE
- contractReference
- slaResponseTimeMs, slaUptimePct
- actualAvgResponseTimeMs, actualUptimePct (rolling)
- monthlyVolumeLimit, currentMonthVolume
- costModel: PER_CALL, MONTHLY_FLAT, TIERED, FREE
- costPerCall (NUMERIC)
- monthlyCost (NUMERIC)
- primaryContactName, primaryContactEmail, primaryContactPhone
- escalationContactName, escalationContactEmail
- lastHealthCheckAt, healthStatus: HEALTHY, DEGRADED, DOWN, UNKNOWN
- failoverProviderId (alternative provider)
- status: ONBOARDING, ACTIVE, SUSPENDED, DECOMMISSIONED
```

#### B. Provider Health Log (new entity: `ProviderHealthLog`)

```
Fields needed:
- logId, providerId
- checkTimestamp
- responseTimeMs
- httpStatusCode
- isHealthy (boolean)
- errorMessage (if unhealthy)
- requestCount (since last check)
- errorCount (since last check)
- errorRatePct
```

#### C. Provider Transaction Log (new entity: `ProviderTransactionLog`)

```
Fields needed:
- logId, providerId
- transactionRef
- operationType: KYC_CHECK, CREDIT_PULL, PAYMENT_SEND, SMS_SEND, SCREEN_CHECK, etc.
- requestTimestamp, responseTimestamp
- responseTimeMs
- requestPayloadRef (encrypted reference)
- responseCode, responseStatus: SUCCESS, FAILURE, TIMEOUT, PARTIAL
- costCharged (NUMERIC)
- retryCount
- errorCode, errorMessage
```

**Service methods needed**:
- `registerProvider()` — onboard a new service provider
- `healthCheck()` — ping provider and log result
- `logTransaction()` — record every provider call
- `getProviderDashboard()` — uptime, avg response, error rate, cost
- `getProviderSlaReport()` — SLA vs actual performance
- `triggerFailover()` — switch to backup provider
- `getProviderCostReport()` — monthly cost by provider
- `decommissionProvider()` — graceful retirement with dependency check

### Estimated Effort
- **Entities**: 3 new
- **Services**: 1 new (ProviderManagementService)
- **Complexity**: Medium

---

## 8. Product Quality Assurance

**BIAN Service Domain**: Product Quality Assurance
**Current Package**: `com.cbs.productanalytics`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `ProductPerformanceSnapshot.java` | Financial metrics: active accounts, revenue, cost, margin, NPL ratio, risk weight |
| `ProductAnalyticsService.java` | record(), getByProduct(), getByFamily() |

### What's Missing

#### A. Product Quality Assessment (new entity: `ProductQualityAssessment`)

```
Fields needed:
- assessmentId, productCode, productName
- assessmentPeriod: MONTHLY, QUARTERLY
- periodDate
- Quality Metrics:
  - customerSatisfactionScore (NPS or CSAT, NUMERIC)
  - complaintCount, complaintsPer1000Accounts
  - defectRate (e.g., failed transactions, processing errors)
  - processingErrorCount
  - slaBreachCount, slaMeetPct
  - avgOnboardingTimeDays
  - avgClaimSettlementDays (if applicable)
- Compliance Metrics:
  - regulatoryFindingsCount
  - auditFindingsCount
  - pendingRemediations
  - complianceScorePct
- Market Metrics:
  - marketSharePct
  - competitorBenchmarkPosition (rank)
  - pricingCompetitiveness: ABOVE_MARKET, AT_MARKET, BELOW_MARKET
- Operational Metrics:
  - channelAvailabilityPct
  - straightThroughProcessingPct
  - manualInterventionRate
- overallQualityRating: EXCELLENT, GOOD, SATISFACTORY, NEEDS_IMPROVEMENT, CRITICAL
- actionItems (JSON)
- assessedBy
- status: DRAFT, REVIEWED, PUBLISHED
```

**Service methods needed**:
- `createAssessment()` — periodic quality review
- `getQualityTrend()` — quality rating trend over periods
- `getQualityDashboard()` — all products quality summary
- `getActionItems()` — outstanding quality improvement actions
- `compareProducts()` — side-by-side quality comparison

### Estimated Effort
- **Entities**: 1 new
- **Services**: 1 new (ProductQualityService)
- **Complexity**: Low-Medium

---

## 9. Market Data Switch Administration & Operation

**BIAN Service Domains**: Market Data Switch Administration, Market Data Switch Operation
**Current Package**: `com.cbs.marketdata`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `MarketDataFeed.java` | feedCode, provider, feedType, dataCategory, connectionProtocol, endpointUrl, lastUpdateAt, recordsToday, errorCountToday |
| `MarketDataService.java` | registerFeed(), recordPrice(), getFeedStatus() |

### What's Missing

#### A. Market Data Switch (new entity: `MarketDataSwitch`)

```
Fields needed:
- switchId, switchName
- switchType: AGGREGATOR, DISTRIBUTOR, NORMALIZER, FILTER, VALIDATOR
- inputFeeds (JSON — list of feedIds)
- outputSubscribers (JSON — list of consuming systems)
- transformationRules (JSON):
  - [{sourceField, targetField, transformation}]
- filterRules (JSON):
  - [{field, operator, value}] — e.g., only NGN instruments
- validationRules (JSON):
  - [{field, rule, threshold}] — e.g., price change > 20% = stale
- throughputPerSecond
- latencyMs (measured)
- lastProcessedAt
- totalProcessedToday, totalRejectedToday, totalErrorsToday
- status: RUNNING, DEGRADED, STOPPED, MAINTENANCE
```

#### B. Market Data Subscription (new entity: `MarketDataSubscription`)

```
Fields needed:
- subscriptionId
- subscriberSystem: TREASURY, ALM, RISK, TRADING, CUSTODY, VALUATION, EOD
- feedIds (JSON — which feeds)
- instrumentFilter (JSON — specific instruments/currencies)
- deliveryMethod: PUSH, PULL, BATCH
- deliveryFrequency: REAL_TIME, 15MIN, HOURLY, END_OF_DAY
- format: JSON, CSV, FIX, PROPRIETARY
- lastDeliveredAt
- deliveryFailureCount
- isActive (boolean)
```

**Service methods needed**:
- `registerSwitch()` — define data switch configuration
- `startSwitch()` / `stopSwitch()` — lifecycle control
- `addSubscription()` — subscribe a system to market data
- `processIncomingData()` — validate, transform, distribute
- `getSwitchDashboard()` — throughput, latency, errors
- `getSubscriptionHealth()` — delivery status per subscriber
- `reconcileData()` — cross-check across feeds for same instrument

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 new (MarketDataSwitchService)
- **Complexity**: Medium

---

## 10. Corporate Lease

**BIAN Service Domain**: Corporate Lease
**Current Package**: `com.cbs.leasing`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `LeaseContract.java` | Full lease entity with IFRS 16, ROU asset, depreciation, purchase options, early termination |
| `LeasingService.java` | createLease(), activate(), recordDepreciation(), exercisePurchaseOption(), earlyTerminate() |

### What's Missing — Corporate-Specific Extensions

#### A. Update `LeaseContract` entity

```
Add fields:
- corporateLeaseType: FLEET_MANAGEMENT, EQUIPMENT_PROGRAM, TECHNOLOGY_REFRESH,
  PROPERTY_LEASE, SALE_AND_LEASEBACK, CROSS_BORDER
- masterAgreementId (for fleet/program — groups multiple leases)
- costCenter, businessUnit, projectCode (corporate allocation)
- guarantorName, guarantorId (parent company guarantee)
- subleaseAllowed (boolean)
- subleaseRevenue (NUMERIC)
- modificationHistory (JSON — IFRS 16 lease modifications log)
- variablePaymentBasis: INDEX_LINKED, REVENUE_SHARE, USAGE_BASED, FIXED
- variablePaymentIndex (e.g., CPI)
- renewalOption: NONE, MUTUAL, LESSEE_ONLY
- renewalTermMonths
```

#### B. Lease Portfolio (new entity: `CorporateLeasePortfolio`)

```
Fields needed:
- portfolioId, corporateCustomerId
- totalLeases, activeLeases
- totalRouAssetValue, totalLeaseLiability
- weightedAvgTerm, weightedAvgRate
- annualLeaseExpense
- expiringNext90Days, expiringNext180Days
- asOfDate
```

**Service methods needed**:
- `createMasterAgreement()` — group leases under corporate program
- `modifyLease()` — IFRS 16 compliant lease modification
- `processVariablePayment()` — calculate index-linked or usage-based payments
- `getPortfolioSummary()` — consolidated corporate lease view
- `getMaturityProfile()` — lease expiry ladder
- `getSubleaseReport()` — sublease tracking
- `generateIfrs16Disclosure()` — regulatory disclosure data

### Estimated Effort
- **Entities**: 1 new + 1 updated
- **Services**: 1 extended
- **Complexity**: Medium

---

## 11. Factoring (Supply Chain Finance)

**BIAN Service Domain**: Factoring
**Current Package**: `com.cbs.trade`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `SupplyChainProgramme.java` | SCF programme with discount rate |
| `ScfInvoice.java` | Invoice financing with discount calculation |
| `TradeService.java` | createScfProgramme(), financeInvoice() |

### What's Missing — Full Factoring Capabilities

#### A. Factoring Facility (new entity: `FactoringFacility`)

```
Fields needed:
- facilityId, facilityCode
- facilityType: RECOURSE_FACTORING, NON_RECOURSE_FACTORING, REVERSE_FACTORING,
  INVOICE_DISCOUNTING, FORFAITING, RECEIVABLES_PURCHASE
- sellerCustomerId, sellerName
- buyerCustomerIds (JSON — approved buyers)
- currency, facilityLimit, utilizedAmount, availableAmount
- advanceRatePct (typically 80–90%)
- discountRatePct (annual)
- serviceFeeRatePct
- collectionPeriodDays (avg debtor days)
- dilutionReservePct (for non-recourse)
- maxInvoiceAge (days — invoices older than X rejected)
- maxConcentrationPct (single buyer limit)
- creditInsuranceProvider, creditInsurancePolicyRef
- notificationRequired (boolean — notify debtor)
- effectiveFrom, effectiveTo
- status: APPROVED, ACTIVE, SUSPENDED, MATURED
```

#### B. Factoring Transaction (new entity: `FactoringTransaction`)

```
Fields needed:
- transactionId, facilityId
- invoiceRef, invoiceDate, invoiceAmount
- buyerName, buyerId
- advanceAmount, discountAmount, netProceedsToSeller
- collectionDueDate, actualCollectionDate
- collectedAmount
- dilutionAmount (credit notes, disputes)
- recourseExercised (boolean)
- recourseAmount
- serviceFeeCharged
- status: SUBMITTED, APPROVED, FUNDED, PARTIALLY_COLLECTED, COLLECTED, DEFAULTED, RECOURSE
```

**Service methods needed**:
- `createFactoringFacility()` — establish factoring line
- `submitInvoice()` — seller submits invoice for factoring
- `approveAndFund()` — validate, advance funds to seller
- `recordCollection()` — when buyer pays the invoice
- `exerciseRecourse()` — for recourse factoring, recover from seller
- `getConcentrationReport()` — buyer concentration analysis
- `getAgingReport()` — receivables aging by facility
- `calculateDilution()` — dilution rate tracking

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 new (FactoringService)
- **Complexity**: Medium-High

---

## 12. Trade Settlement

**BIAN Service Domain**: Trade Settlement
**Current Package**: `com.cbs.custody`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `CustodyAccount.java` | settlementEnabled flag, accountType, totalAssetsValue |
| `CustodyService.java` | open(), getByCode(), getByCustomer() — basic CRUD only |

### What's Missing

#### A. Settlement Instruction (new entity: `SettlementInstruction`)

```
Fields needed:
- instructionId, instructionRef
- custodyAccountId
- tradeRef (from tradeops.trade_confirmation)
- instructionType: DVP, FOP, RECEIVE_VS_PAYMENT, DELIVERY_VS_PAYMENT,
  RECEIVE_FREE, DELIVERY_FREE, INTERNAL_TRANSFER
- settlementCycle: T0, T1, T2, T3
- instrumentCode, instrumentName, isin
- quantity (NUMERIC)
- settlementAmount (NUMERIC), currency
- counterpartyCode, counterpartyName
- counterpartyBic, counterpartyAccountRef
- depositoryCode (e.g., CSCS, DTC, Euroclear)
- placeOfSettlement
- intendedSettlementDate
- actualSettlementDate
- matchStatus: UNMATCHED, MATCHED, ALLEGED, DISPUTED
- matchedAt
- priorityFlag (boolean)
- holdReason (if on hold)
- failReason (if failed)
- failedSince (DATE — continuous fail tracking)
- penaltyAmount (CSDR penalty if applicable)
- status: CREATED, MATCHED, SETTLING, SETTLED, PARTIALLY_SETTLED, FAILED, CANCELLED
```

#### B. Settlement Batch (new entity: `SettlementBatch`)

```
Fields needed:
- batchId, batchRef
- depositoryCode
- settlementDate
- totalInstructions, settledCount, failedCount, pendingCount
- totalDebitAmount, totalCreditAmount
- netAmount, currency
- cutoffTime
- submittedAt, completedAt
- status: PREPARING, SUBMITTED, IN_PROGRESS, COMPLETED, PARTIALLY_COMPLETED
```

**Service methods needed**:
- `createSettlementInstruction()` — from confirmed trade
- `matchInstruction()` — match with counterparty instruction
- `submitForSettlement()` — send to depository/CSD
- `recordSettlementResult()` — update status post-settlement
- `getFailedSettlements()` — all failed instructions
- `calculatePenalty()` — CSDR penalty calculation
- `getSettlementDashboard()` — daily settlement rates, fails, pending
- `netSettlements()` — netting calculation for batch
- `recycleFailedInstruction()` — resubmit failed instruction

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 new (SettlementService)
- **Complexity**: High

---

## 13. Securities Fails Processing

**BIAN Service Domain**: Securities Fails Processing
**Current Package**: `com.cbs.openitem`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `OpenItem.java` | Generic open items — itemType, itemCategory, amount, agingDays, assignedTo, resolutionAction |
| `OpenItemService.java` | create(), assign(), resolve(), getOpen(), updateAging() |

### What's Missing

#### A. Securities Fail Record (new entity: `SecuritiesFail`)

```
Fields needed:
- failId, failRef
- settlementInstructionId
- instrumentCode, instrumentName, isin
- failType: DELIVERY_FAIL, RECEIPT_FAIL, CASH_SHORTFALL, SECURITIES_SHORTFALL,
  COUNTERPARTY_FAIL, DEPOSITORY_ISSUE, MISMATCH, REGULATORY_HOLD
- counterpartyCode, counterpartyName
- originalSettlementDate, currentExpectedDate
- failStartDate
- agingDays (calculated)
- agingBucket: SAME_DAY, 1_TO_3_DAYS, 4_TO_7_DAYS, 8_TO_14_DAYS, 15_TO_30_DAYS, OVER_30
- quantity, amount, currency
- penaltyAccrued (NUMERIC — daily CSDR penalty)
- buyInEligible (boolean — past buy-in threshold)
- buyInDeadline (DATE)
- escalationLevel: OPERATIONS, DESK_HEAD, COMPLIANCE, SENIOR_MANAGEMENT
- resolutionAction: RESUBMIT, PARTIAL_SETTLEMENT, COUNTERPARTY_CHASE,
  BUY_IN, SHAPE_INSTRUCTION, CANCEL_REISSUE, MANUAL_OVERRIDE
- resolutionNotes
- resolvedAt
- status: OPEN, INVESTIGATING, ESCALATED, BUY_IN_INITIATED, RESOLVED, WRITTEN_OFF
```

**Service methods needed**:
- `recordFail()` — create fail from settlement instruction failure
- `escalateFail()` — auto-escalate based on aging
- `initiateBuyIn()` — trigger buy-in process for chronic fails
- `calculatePenalty()` — daily CSDR penalty accrual
- `resolveFail()` — close fail with resolution action
- `getFailsDashboard()` — fail rates by type, aging distribution, penalty accrued
- `getCounterpartyFailReport()` — fails by counterparty (for relationship management)
- `getAgingAnalysis()` — aging bucket distribution

### Estimated Effort
- **Entities**: 1 new
- **Services**: 1 new (SecuritiesFailService)
- **Complexity**: Medium

---

## 14. Financial Instrument Valuation Models

**BIAN Service Domain**: Financial Instrument Valuation Models
**Current Packages**: `com.cbs.secposition`, `com.cbs.quantmodel`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `SecuritiesPosition.java` | currentPrice, marketValue, unrealizedGainLoss, accruedInterest |
| `QuantModel.java` | Generic model registry with model type including PRICING_MODEL |

### What's Missing

#### A. Valuation Model Definition (new entity: `ValuationModel`)

```
Fields needed:
- modelId, modelCode
- modelName
- instrumentType: BOND, EQUITY, FX_FORWARD, IRS, OPTION, STRUCTURED_PRODUCT,
  MUTUAL_FUND, PRIVATE_EQUITY, REAL_ESTATE, COMMODITY
- valuationMethodology: DISCOUNTED_CASH_FLOW, COMPARABLE_MARKET, BINOMIAL_TREE,
  BLACK_SCHOLES, MONTE_CARLO, NAV_BASED, MARK_TO_MARKET, MARK_TO_MODEL, DEALER_QUOTE
- fairValueHierarchy: LEVEL_1, LEVEL_2, LEVEL_3
- inputParameters (JSON):
  - [{paramName, paramType, source, fallbackSource}]
  - e.g., yieldCurve, creditSpread, volatilitySurface, fxRate
- calibrationFrequency: DAILY, WEEKLY, MONTHLY
- lastCalibratedAt
- independentPriceVerification (boolean)
- ipvFrequency: DAILY, WEEKLY, MONTHLY
- lastIpvDate
- ipvThresholdPct (tolerance for model vs market)
- modelOwner, validatedBy
- regulatoryApproval (boolean)
- status: DEVELOPMENT, VALIDATED, PRODUCTION, RETIRED
```

#### B. Valuation Run (new entity: `ValuationRun`)

```
Fields needed:
- runId, runRef
- valuationDate
- modelId
- runType: END_OF_DAY, INTRADAY, AD_HOC, STRESS_TEST
- instrumentsValued (INT)
- totalMarketValue (NUMERIC), currency
- unrealizedGainLoss (NUMERIC)
- fairValueLevel1Total, fairValueLevel2Total, fairValueLevel3Total
- ipvBreachCount (where model price deviates from market beyond threshold)
- pricingExceptions (JSON — instruments that couldn't be priced)
- runStartedAt, runCompletedAt
- status: RUNNING, COMPLETED, COMPLETED_WITH_EXCEPTIONS, FAILED
```

#### C. Instrument Valuation Detail (new entity: `InstrumentValuation`)

```
Fields needed:
- valuationId, runId
- instrumentCode, isin
- modelUsed
- fairValueLevel: LEVEL_1, LEVEL_2, LEVEL_3
- modelPrice (NUMERIC)
- marketPrice (NUMERIC — for IPV)
- priceDeviation (NUMERIC)
- deviationBreached (boolean)
- inputsUsed (JSON — actual parameter values)
- sensitivityDelta, sensitivityGamma, sensitivityVega (for derivatives)
- duration, modifiedDuration, convexity (for bonds)
- yieldToMaturity, spreadToBenchmark (for bonds)
- dayCountConvention
- accrualDays, accruedAmount
- cleanPrice, dirtyPrice
- previousValuation, valuationChange
- status: PRICED, ESTIMATED, STALE, EXCEPTION
```

**Service methods needed**:
- `defineValuationModel()` — register model with methodology and inputs
- `runValuation()` — execute valuation for a portfolio/date
- `runIpv()` — independent price verification
- `getValuationSummary()` — portfolio valuation by level
- `getValuationExceptions()` — instruments with pricing issues
- `getSensitivityReport()` — Greeks and duration across portfolio
- `getFairValueDisclosure()` — IFRS 13 disclosure data (Level 1/2/3 breakdown)
- `getValuationTrend()` — mark-to-market movement over time

### Estimated Effort
- **Entities**: 3 new
- **Services**: 1 new (ValuationService)
- **Complexity**: High

---

## 15. Gap Analysis (Compliance)

**BIAN Service Domain**: Gap Analysis
**Current Package**: `com.cbs.guidelinecompliance`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `GuidelineAssessment.java` | Assessment with control counts, compliance score, findings (JSON), remediationPlan (JSON) |
| `GuidelineComplianceService.java` | create(), complete(), getBySource(), getByRating() |

### What's Missing

#### A. Gap Analysis Record (new entity: `ComplianceGapAnalysis`)

```
Fields needed:
- gapId, analysisCode
- assessmentId (FK to GuidelineAssessment)
- requirementRef, requirementDescription
- regulatorySource, clauseReference
- currentState (TEXT — what exists today)
- targetState (TEXT — what is required)
- gapDescription (TEXT)
- gapSeverity: CRITICAL, MAJOR, MINOR, OBSERVATION
- gapCategory: POLICY, PROCESS, TECHNOLOGY, PEOPLE, DATA, DOCUMENTATION
- riskIfUnaddressed: HIGH, MEDIUM, LOW
- remediationOwner
- remediationDescription
- remediationCost (NUMERIC)
- remediationStartDate, remediationTargetDate, remediationActualDate
- remediationMilestones (JSON):
  - [{milestone, dueDate, completedDate, status}]
- evidenceRefs (JSON — documents proving closure)
- verifiedBy, verifiedAt
- status: IDENTIFIED, REMEDIATION_PLANNED, IN_PROGRESS, REMEDIATED, VERIFIED, ACCEPTED_RISK
```

**Service methods needed**:
- `identifyGap()` — log a gap from an assessment
- `planRemediation()` — assign owner, cost, timeline
- `updateRemediationProgress()` — milestone tracking
- `closeGap()` — mark as remediated with evidence
- `verifyGap()` — independent verification of closure
- `acceptRisk()` — formally accept residual risk
- `getGapDashboard()` — open gaps by severity, category, age
- `getRemediationTimeline()` — Gantt-view of remediation activities
- `getOverdueRemediations()` — past target date, still open
- `getGapTrendReport()` — gaps identified vs closed over time

### Estimated Effort
- **Entities**: 1 new
- **Services**: 1 new (GapAnalysisService)
- **Complexity**: Medium

---

## 16. Contribution Analysis (Business)

**BIAN Service Domain**: Contribution Analysis
**Current Package**: `com.cbs.contributionrisk`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `RiskContribution.java` | Risk-focused: marginal/incremental/component contribution to portfolio risk |
| `ContributionRiskService.java` | calculate(), getByPortfolio(), getByBusinessUnit() |

### What's Missing — Business Performance Contribution

#### A. Business Contribution Analysis (new entity: `BusinessContribution`)

```
Fields needed:
- contributionId, reportCode
- periodType: MONTHLY, QUARTERLY, ANNUAL
- periodDate
- businessUnit, businessUnitName
- productFamily
- region, branchId
- currency
- Revenue Contribution:
  - interestIncome, feeIncome, tradingIncome, otherIncome, totalRevenue
  - revenueContributionPct
- Cost Contribution:
  - costOfFunds, operatingExpense, provisionExpense, totalCost
  - costContributionPct
- Profitability:
  - grossMargin, operatingProfit, netProfit
  - profitContributionPct
  - returnOnEquity, returnOnAssets
  - costToIncomeRatio
- Volume Metrics:
  - avgAssets, avgDeposits, avgLoans
  - customerCount, transactionCount
- Capital:
  - rwaAmount, capitalAllocated
  - returnOnRwa (RAROC)
- benchmark (JSON — vs budget/prior year)
- status: CALCULATED, REVIEWED, PUBLISHED
```

**Service methods needed**:
- `calculateContribution()` — compute contribution metrics for a BU/product/period
- `getByBusinessUnit()` — contribution of each BU to bank totals
- `getByProduct()` — contribution of each product family
- `getByRegion()` — geographic contribution
- `getContributionTrend()` — period-over-period trend
- `getBenchmarkComparison()` — actual vs budget/prior year
- `getTopContributors()` — rank by net profit contribution
- `getUnderperformers()` — BUs/products below threshold

### Estimated Effort
- **Entities**: 1 new
- **Services**: 1 new (BusinessContributionService)
- **Complexity**: Medium

---

## 17. Branch Portfolio

**BIAN Service Domain**: Branch Portfolio
**Current Package**: `com.cbs.branchnetwork`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `BranchNetworkPlan.java` | Network planning: new branches, closures, relocations, feasibility |
| `BranchNetworkService.java` | create(), approve(), complete(), getByRegion() |

### What's Missing — Portfolio Analysis

#### A. Branch Performance Record (new entity: `BranchPerformance`)

```
Fields needed:
- performanceId, branchId
- periodType: MONTHLY, QUARTERLY
- periodDate
- Financial Metrics:
  - totalDeposits, totalLoans, totalAssets
  - depositGrowthPct, loanGrowthPct
  - interestIncome, feeIncome, totalRevenue
  - operatingCost, netProfit
  - costToIncomeRatio, returnOnAssets
- Customer Metrics:
  - totalCustomers, newCustomers, closedCustomers
  - activeCustomers, dormantCustomers
  - customerRetentionPct
  - avgRevenuePerCustomer
- Operational Metrics:
  - totalTransactions, digitalAdoptionPct
  - avgQueueWaitMinutes, customerSatisfactionScore
  - staffCount, revenuePerStaff
  - facilityUtilizationPct
- Risk Metrics:
  - nplRatioPct, overdueAccountsPct
  - fraudIncidentCount, complianceFindingsCount
- ranking (INT — within region/national)
- status: CALCULATED, REVIEWED
```

**Service methods needed**:
- `recordPerformance()` — snapshot branch metrics
- `getBranchRanking()` — rank branches by configurable metric
- `getRegionalSummary()` — aggregate performance by region
- `getUnderperformingBranches()` — below threshold on key metrics
- `getBranchTrend()` — period-over-period trend
- `getOptimizationCandidates()` — branches for closure/resize based on metrics
- `getDigitalMigrationReport()` — branches with high digital adoption potential

### Estimated Effort
- **Entities**: 1 new
- **Services**: 1 new (BranchPerformanceService)
- **Complexity**: Medium

---

## 18. Market Research

**BIAN Service Domain**: Market Research
**Current Package**: `com.cbs.marketdata` (research_publication table)
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `ResearchPublication` (in marketdata) | publication_code, title, type, author, sector, summary, tags, compliance_reviewed |

### What's Missing — Full Market Research Management

#### A. Research Project (new entity: `MarketResearchProject`)

```
Fields needed:
- projectId, projectCode
- projectName, projectType: CUSTOMER_RESEARCH, MARKET_SIZING, COMPETITIVE_STUDY,
  PRODUCT_FEASIBILITY, BRAND_PERCEPTION, CHANNEL_PREFERENCE, PRICING_SENSITIVITY,
  GEOGRAPHIC_OPPORTUNITY, SEGMENTATION_STUDY, REGULATORY_IMPACT
- objectives (TEXT)
- methodology: SURVEY, FOCUS_GROUP, INTERVIEW, DESK_RESEARCH, MYSTERY_SHOPPING,
  DATA_ANALYTICS, MIXED_METHOD
- targetPopulation, sampleSize
- vendor (if outsourced)
- projectLead
- budget, actualCost
- plannedStartDate, plannedEndDate, actualEndDate
- keyFindings (JSON)
- recommendations (JSON)
- actionsTaken (JSON)
- impactMeasurement (JSON)
- status: PROPOSED, APPROVED, IN_PROGRESS, ANALYSIS, COMPLETED, ARCHIVED
```

**Service methods needed**:
- `createProject()` — initiate research project
- `completeProject()` — finalize with findings and recommendations
- `trackActions()` — track actions taken from research recommendations
- `getActiveProjects()` — ongoing research
- `getResearchLibrary()` — searchable past research by type/topic
- `getInsightsSummary()` — aggregated insights across projects

### Estimated Effort
- **Entities**: 1 new
- **Services**: 1 new (MarketResearchService)
- **Complexity**: Low

---

## 19. Merchant Acquiring Facility

**BIAN Service Domain**: Merchant Acquiring Facility
**Current Package**: `com.cbs.merchant`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `MerchantProfile.java` | merchantId, merchantName, MCC, settlementAccountId, mdrRate, terminalCount, riskCategory, chargebackRate |
| `MerchantService.java` | onboard(), activate(), suspend(), getActive(), getHighRisk() |

### What's Missing — Acquiring Facility Operations

#### A. Acquiring Facility (new entity: `AcquiringFacility`)

```
Fields needed:
- facilityId, merchantId
- facilityType: CARD_PRESENT, CARD_NOT_PRESENT, ECOMMERCE, MPOS, QR, RECURRING
- processorConnection: VISA, MASTERCARD, VERVE, AMEX, UNION_PAY
- terminalIdPrefix
- settlementCurrency, settlementCycle: T0, T1, T2
- mdrRatePct (per network)
- dailyTransactionLimit, monthlyVolumeLimit
- chargebackLimitPct
- reserveHoldPct (rolling reserve for high-risk)
- reserveBalance
- pciComplianceStatus: COMPLIANT, NON_COMPLIANT, PENDING_SAQ, PENDING_ASV
- pciComplianceDate
- fraudScreeningEnabled (boolean)
- threeDSecureEnabled (boolean)
- status: SETUP, ACTIVE, SUSPENDED, TERMINATED
```

#### B. Merchant Settlement (new entity: `MerchantSettlement`)

```
Fields needed:
- settlementId, merchantId, facilityId
- settlementDate
- grossTransactionAmount, transactionCount
- mdrDeducted, otherFeesDeducted
- chargebackDeductions, refundDeductions
- reserveHeld
- netSettlementAmount
- settlementAccountId, settlementReference
- settledAt
- status: CALCULATED, APPROVED, SETTLED, DISPUTE
```

#### C. Merchant Chargeback (new entity: `MerchantChargeback`)

```
Fields needed:
- chargebackId, merchantId
- originalTransactionRef, transactionDate, transactionAmount
- cardNetwork, reasonCode, reasonDescription
- chargebackAmount, currency
- evidenceDeadline
- merchantResponseRef, merchantEvidence (JSON)
- representmentSubmitted (boolean)
- arbitrationRequired (boolean)
- outcome: MERCHANT_WIN, MERCHANT_LOSS, SPLIT, PENDING
- financialImpact
- status: RECEIVED, NOTIFIED, EVIDENCE_REQUESTED, REPRESENTMENT, ARBITRATION, CLOSED
```

**Service methods needed**:
- `setupFacility()` — create acquiring arrangement for merchant
- `processSettlement()` — calculate and execute daily settlement
- `recordChargeback()` — log inbound chargeback
- `submitRepresentment()` — merchant defense submission
- `getSettlementHistory()` — merchant statement
- `getMerchantAnalytics()` — volume, MDR revenue, chargeback ratio
- `getPciComplianceReport()` — compliance status across portfolio
- `getRollingReserveReport()` — reserve balances and release schedule

### Estimated Effort
- **Entities**: 3 new
- **Services**: 1 new (AcquiringService)
- **Complexity**: High

---

## 20. Information Provider Operation

**BIAN Service Domain**: Information Provider Operation
**Current Package**: `com.cbs.marketdata`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `MarketDataFeed.java` | Feed configuration with connection details and basic health metrics |
| `MarketDataService.java` | registerFeed(), recordPrice(), getFeedStatus() |

### What's Missing — Provider Operations Monitoring

#### A. Feed Operation Log (new entity: `FeedOperationLog`)

```
Fields needed:
- logId, feedId
- operationType: CONNECT, DISCONNECT, RECONNECT, HEARTBEAT, DATA_RECEIPT,
  ERROR, RECOVERY, SCHEDULED_MAINTENANCE, FAILOVER
- timestamp
- recordsReceived (INT)
- recordsProcessed (INT)
- recordsRejected (INT)
- latencyMs
- errorCode, errorMessage
- recoveryAction (if applicable)
- connectionDurationSeconds (for connect/disconnect)
```

#### B. Feed Quality Metric (new entity: `FeedQualityMetric`)

```
Fields needed:
- metricId, feedId
- metricDate
- totalRecordsReceived, totalRecordsProcessed, totalRecordsRejected
- uptimePct (for the day)
- avgLatencyMs, maxLatencyMs, p99LatencyMs
- gapCount (data gaps detected)
- staleDataCount (prices older than threshold)
- duplicateCount
- outOfRangeCount (prices outside expected bounds)
- qualityScore (composite 0–100)
```

**Service methods needed**:
- `logOperation()` — record feed events
- `calculateDailyQuality()` — end-of-day quality metrics
- `getOperationsTimeline()` — chronological feed events
- `getFeedQualityReport()` — quality trends over time
- `getProviderSlaReport()` — SLA compliance per provider
- `alertOnDegradation()` — trigger alerts when quality drops below threshold

### Estimated Effort
- **Entities**: 2 new
- **Services**: 1 extended (MarketDataService)
- **Complexity**: Low-Medium

---

## 21. Term Deposit Framework Agreement

**BIAN Service Domain**: Term Deposit Framework Agreement
**Current Package**: `com.cbs.tdframework`
**Current Status**: PARTIAL

### What Exists

| Component | Implementation |
|-----------|---------------|
| `TdFrameworkAgreement.java` | Agreement with rate structure, tiers, auto-rollover, early withdrawal terms |
| `TdFrameworkService.java` | create(), approve(), getApplicableRate(), getActiveByCustomer() |

### What's Missing

#### A. Extend `TdFrameworkAgreement` entity

```
Add fields:
- facilityType: RETAIL, CORPORATE, INSTITUTIONAL, GOVERNMENT, INTERBANK
- sweepEnabled (boolean)
- sweepSourceAccountId
- sweepThresholdAmount
- sweepTenor (default tenor for swept amounts)
- bulkDepositEnabled (boolean)
- bulkBatchProcessing (boolean)
- promotionalRateEnabled (boolean)
- promotionalRate (NUMERIC)
- promotionalRateExpiry (DATE)
- liquidityLadderContribution (boolean — include in bank's liquidity ladder)
- regulatoryReportingRequired (boolean — for large deposits)
- reportingThreshold (NUMERIC)
- maxDepositsUnderAgreement (INT)
- currentDepositsCount (INT)
- totalDepositedAmount (NUMERIC — all active TDs under this agreement)
- weightedAvgRate (NUMERIC — across all TDs)
- weightedAvgTenor (INT — days)
- fxHedgingRequired (boolean — for FCY deposits)
- lastReviewDate, nextReviewDate
```

#### B. Framework Deposit Summary (new entity: `TdFrameworkSummary`)

```
Fields needed:
- summaryId, agreementId
- snapshotDate
- activeDeposits (INT)
- totalPrincipal, totalAccruedInterest
- weightedAvgRate, weightedAvgTenorDays
- maturingNext30Days (NUMERIC)
- maturingNext60Days (NUMERIC)
- maturingNext90Days (NUMERIC)
- expectedRolloverPct
- concentrationPct (of bank's total deposits)
```

**Service methods needed**:
- `enableSweep()` — configure auto-sweep from current account to TD
- `executeSweep()` — create TD from excess balance
- `applyPromotionalRate()` — time-limited rate boost
- `getMaturityLadder()` — deposits maturing by time bucket
- `getFrameworkSummary()` — aggregated view of all TDs under agreement
- `getRolloverForecast()` — predicted rollover vs withdrawal
- `getLargeDepositReport()` — regulatory reporting for large deposits
- `reviewAgreement()` — trigger periodic review

### Estimated Effort
- **Entities**: 1 new + 1 updated
- **Services**: 1 extended
- **Complexity**: Medium

---

## Summary: Implementation Effort

| # | Gap Area | New Entities | New Services | Complexity | Priority |
|---|----------|:---:|:---:|---|---|
| 1 | Branch Location Mgmt & Ops | 4 | 4 | Medium | High |
| 2 | Point of Service | 2 | 1 | Low-Medium | Medium |
| 3 | Contact Routing & Handler | 4 | 2 | Medium-High | High |
| 4 | Customer Workbench | 3 | 1 | Medium | High |
| 5 | Case Root Cause Analysis | 2 | 1 | Medium | Medium |
| 6 | Discount Pricing & Special | 2 | 1 | Medium | High |
| 7 | Provider Administration | 3 | 1 | Medium | Medium |
| 8 | Product Quality Assurance | 1 | 1 | Low-Medium | Low |
| 9 | Market Data Switch | 2 | 1 | Medium | Low |
| 10 | Corporate Lease | 1 | 1 | Medium | Medium |
| 11 | Factoring | 2 | 1 | Medium-High | Medium |
| 12 | Trade Settlement | 2 | 1 | High | High |
| 13 | Securities Fails Processing | 1 | 1 | Medium | Medium |
| 14 | FI Valuation Models | 3 | 1 | High | High |
| 15 | Gap Analysis (Compliance) | 1 | 1 | Medium | Medium |
| 16 | Contribution Analysis | 1 | 1 | Medium | Medium |
| 17 | Branch Portfolio | 1 | 1 | Medium | Medium |
| 18 | Market Research | 1 | 1 | Low | Low |
| 19 | Merchant Acquiring | 3 | 1 | High | High |
| 20 | Info Provider Operation | 2 | 1 | Low-Medium | Low |
| 21 | TD Framework Agreement | 1 | 1 | Medium | Medium |
| **TOTAL** | | **42** | **25** | | |

---

## Recommended Implementation Waves

### Wave 1 — Critical Revenue & Operations (HIGH priority)
1. Branch Location Management & Operations (#1)
2. Contact Routing & Handler (#3)
3. Customer Workbench (#4)
4. Discount Pricing & Special Pricing (#6)
5. Trade Settlement (#12)
6. FI Valuation Models (#14)
7. Merchant Acquiring Facility (#19)

**Entities: 22 | Services: 11 | Est. Migration: V38**

### Wave 2 — Risk & Compliance Completion (MEDIUM priority)
8. Case Root Cause Analysis (#5)
9. Corporate Lease (#10)
10. Factoring (#11)
11. Securities Fails Processing (#13)
12. Gap Analysis (#15)
13. Contribution Analysis (#16)
14. Branch Portfolio (#17)
15. Provider Administration (#7)
16. TD Framework Agreement (#21)

**Entities: 13 | Services: 9 | Est. Migration: V39**

### Wave 3 — Analytics & Infrastructure (LOW priority)
17. Point of Service (#2)
18. Product Quality Assurance (#8)
19. Market Data Switch (#9)
20. Market Research (#18)
21. Info Provider Operation (#20)

**Entities: 8 | Services: 5 | Est. Migration: V40**

---

## Post-Implementation Target

| Metric | Current | After Wave 1 | After Wave 2 | After Wave 3 |
|--------|---------|:---:|:---:|:---:|
| BIAN SDs Covered | 206 / 243 | 218 / 243 | 230 / 243 | 238 / 243 |
| Coverage % | 85% | 90% | 95% | **98%** |
| Incl. Partial | 93% | 96% | 98% | **99%** |
| Remaining Gaps | 16 pure + 21 partial | 9 pure + 7 partial | 9 pure + 0 partial | 5 pure only |

> The final 5 gaps (Corporate Financing & Advisory — IPO, M&A, Tax Advisory, Corporate Finance, Public Offering) are investment banking domains outside the core banking perimeter and can be excluded from CBS scope.
