# Islamic Backend Service Closure Matrix

Date: 2026-04-05

## Validation Summary

The current backend state was validated with these commands:

- `./gradlew compileJava --rerun-tasks`
- `./gradlew test --tests 'com.cbs.profitdistribution.service.ProfitCalculationServiceTest' --tests 'com.cbs.profitdistribution.service.ProfitDistributionRunServiceTest' --tests 'com.cbs.ijarah.service.IjarahAssetServiceTest' --tests 'com.cbs.ijarah.service.IjarahContractServiceTest' --tests 'com.cbs.payments.islamic.service.PaymentShariahScreeningServiceTest' --tests 'com.cbs.payments.islamic.service.DomesticPaymentServiceTest' --tests 'com.cbs.payments.islamic.service.IslamicPaymentServiceTest' --tests 'com.cbs.murabaha.service.MurabahaContractServiceTest' --tests 'com.cbs.murabaha.service.MurabahaScheduleServiceTest'`
- `./gradlew test --tests 'com.cbs.profitdistribution.service.DistributionReserveServiceTest' --tests 'com.cbs.profitdistribution.service.PoolAssetManagementServiceTest' --tests 'com.cbs.rulesengine.DecisionTableEvaluatorTest' --tests 'com.cbs.fees.islamic.service.LatePenaltyServiceTest' --tests 'com.cbs.shariahcompliance.service.ShariahAuditServiceTest' --tests 'com.cbs.notification.IslamicNotificationServiceTest' --tests 'com.cbs.mudarabah.service.PoolWeightageServiceTest' --tests 'com.cbs.musharakah.service.MusharakahRentalServiceTest' --tests 'com.cbs.tenant.service.CurrentTenantResolverTest'`

Result:

- `compileJava` succeeded.
- Both focused backend regression slices succeeded.

## Follow-on Artifacts

- [Policy and configuration checklist](./islamic-policy-configuration-checklist-2026-04-05.md)
- [Executive summary](./islamic-backend-executive-summary-2026-04-05.md)

## Final Status Totals

- Closed: 41 services
- Policy-dependent: 5 services
- Partial: 0 services

Policy-dependent means the code path is implemented, but runtime correctness still depends on governance configuration, Fatwa approval, threshold settings, or other master-data inputs outside the source code itself.

## Foundation Services

| Service | Status | Evidence / Residual Gap |
|---|---|---|
| [ShariahGovernanceService](../src/main/java/com/cbs/shariah/service/ShariahGovernanceService.java) | Closed | SSB member lifecycle, fatwa workflow, review, voting, and audit tracking are implemented. |
| [HijriCalendarService](../src/main/java/com/cbs/hijri/service/HijriCalendarService.java) | Closed | Hijri conversion, holiday handling, and Islamic business-day validation are implemented. |
| [BusinessRuleService](../src/main/java/com/cbs/rulesengine/service/BusinessRuleService.java) | Closed | Rule create/update/activate/retire flows, versioning, and cache-aware lifecycle logic are implemented. |
| [DecisionTableService](../src/main/java/com/cbs/rulesengine/service/DecisionTableService.java) | Closed | Decision-table and row CRUD, hit policy handling, and reordering/versioning flows are present. |
| [DecisionTableEvaluator](../src/main/java/com/cbs/rulesengine/service/DecisionTableEvaluator.java) | Closed | Typed matching for string, numeric, boolean, enum/list, and date cells plus typed output resolution are implemented and regression-tested. |
| [IslamicNotificationService](../src/main/java/com/cbs/notification/service/IslamicNotificationService.java) | Closed | Locale fallback, tenant/global template merge, bilingual rendering, and terminology substitution are implemented and regression-tested. |
| [IslamicContractTypeService](../src/main/java/com/cbs/productfactory/islamic/service/IslamicContractTypeService.java) | Closed | Contract-type retrieval, update, filtering, and validation logic are present. |
| [IslamicProductService](../src/main/java/com/cbs/productfactory/islamic/service/IslamicProductService.java) | Closed | Product lifecycle, compliance status, material-change handling, and Fatwa linkage are implemented. |
| [IslamicGLMetadataService](../src/main/java/com/cbs/gl/islamic/service/IslamicGLMetadataService.java) | Closed | Islamic GL metadata tagging, AAOIFI references, and product eligibility flags are implemented. |
| [IslamicChartOfAccountsService](../src/main/java/com/cbs/gl/islamic/service/IslamicChartOfAccountsService.java) | Closed | Islamic chart-of-accounts creation and reporting support are implemented. |
| [IslamicPostingRuleService](../src/main/java/com/cbs/gl/islamic/service/IslamicPostingRuleService.java) | Closed | Posting-rule evaluation, SpEL-based account resolution, and Islamic journal posting are implemented. |
| [IrrService](../src/main/java/com/cbs/gl/islamic/service/IrrService.java) | Policy-dependent | IRR retention/release mechanics exist; correctness depends on approved reserve policy and configured pool limits. |
| [PerService](../src/main/java/com/cbs/gl/islamic/service/PerService.java) | Policy-dependent | PER smoothing/release mechanics exist; target rates and reserve policy remain governance-controlled. |
| [CurrentTenantResolver](../src/main/java/com/cbs/tenant/service/CurrentTenantResolver.java) | Closed | Header, request, JWT, and single-active-tenant fallback are implemented; nested JWT map parsing is directly regression-tested. |

## Deposit and Profit Services

| Service | Status | Evidence / Residual Gap |
|---|---|---|
| [WadiahAccountService](../src/main/java/com/cbs/wadiah/service/WadiahAccountService.java) | Closed | Wadiah account opening, disclosure handling, and contract-specific restrictions are implemented. |
| [WadiahOnboardingService](../src/main/java/com/cbs/wadiah/service/WadiahOnboardingService.java) | Closed | Multi-step onboarding, approval, and activation flow is implemented. |
| [QardHasanService](../src/main/java/com/cbs/qard/service/QardHasanService.java) | Closed | Qard account opening and no-return operational handling are implemented. |
| [MudarabahAccountService](../src/main/java/com/cbs/mudarabah/service/MudarabahAccountService.java) | Closed | PSR validation, loss disclosure, and pool participation logic are implemented. |
| [MudarabahTermDepositService](../src/main/java/com/cbs/mudarabah/service/MudarabahTermDepositService.java) | Closed | Term-deposit lifecycle handling compiles cleanly and is structurally complete. |
| [WakalaDepositService](../src/main/java/com/cbs/mudarabah/service/WakalaDepositService.java) | Closed | Wakala setup and fee-cap controls are implemented. |
| [DistributionReserveService](../src/main/java/com/cbs/profitdistribution/service/DistributionReserveService.java) | Policy-dependent | PER/IRR cap-aware execution is implemented and regression-tested; runtime correctness still depends on pool reserve configuration. |
| [PoolAssetManagementService](../src/main/java/com/cbs/profitdistribution/service/PoolAssetManagementService.java) | Closed | Asset transfer proportionality, assignment merge, segregation enforcement, and refresh logic are implemented and regression-tested. |
| [ProfitAllocationService](../src/main/java/com/cbs/profitdistribution/service/ProfitAllocationService.java) | Closed | Profit and loss allocation logic with conservation checks is implemented. |
| [ProfitCalculationService](../src/main/java/com/cbs/profitdistribution/service/ProfitCalculationService.java) | Closed | FX normalization, charity exclusion, validation checks, and null-safe normalization are implemented and regression-tested. |

## Murabaha and Ijarah Services

| Service | Status | Evidence / Residual Gap |
|---|---|---|
| [MurabahaContractService](../src/main/java/com/cbs/murabaha/service/MurabahaContractService.java) | Closed | Contract lifecycle, four-eyes execution, ownership verification, and pool integration are implemented. |
| [AssetMurabahaService](../src/main/java/com/cbs/murabaha/service/AssetMurabahaService.java) | Closed | `initiatePurchase`, `issuePurchaseOrder`, `recordPaymentToSupplier`, `recordDelivery`, `recordPossession`, `transferToCustomer`, and loss-handling flows cover the full asset lifecycle with GL integration. |
| [MurabahaScheduleService](../src/main/java/com/cbs/murabaha/service/MurabahaScheduleService.java) | Closed | `generateSchedule`, `processRepayment`, `calculateEarlySettlement`, `processEarlySettlement`, and `processLatePayments` implement schedule generation, repayment, Ibra handling, duplicate prevention, and charity routing. |
| [MurabahaOriginationService](../src/main/java/com/cbs/murabaha/service/MurabahaOriginationService.java) | Closed | Origination, pricing, credit assessment, DSR checks, and duplicate prevention are implemented. |
| [MurabahaProfitRecognitionService](../src/main/java/com/cbs/murabaha/service/MurabahaProfitRecognitionService.java) | Closed | `recogniseProfitForPeriod`, `recogniseProfitOnRepayment`, `recogniseProfitOnEarlySettlement`, and impairment flows implement period, repayment, and early-settlement recognition with idempotency and reporting. |
| [IjarahRentalService](../src/main/java/com/cbs/ijarah/service/IjarahRentalService.java) | Closed | `generateRentalSchedule`, `processRentalPayment`, `processLateRentals`, and `applyRentalReview` implement rental scheduling, payment posting, charity-routed penalties, review, and duplicate prevention. |
| [IjarahGLService](../src/main/java/com/cbs/ijarah/service/IjarahGLService.java) | Closed | Monthly depreciation, accrual posting with double-post prevention, impairment, balance-sheet, and income-report flows are implemented. |
| [IjarahTransferService](../src/main/java/com/cbs/ijarah/service/IjarahTransferService.java) | Closed | IMB transfer mechanism lifecycle and separation controls are implemented. |

## Shariah, Fees, and AML Services

| Service | Status | Evidence / Residual Gap |
|---|---|---|
| [CharityFundService](../src/main/java/com/cbs/shariahcompliance/service/CharityFundService.java) | Closed | Charity inflow/outflow, batch disbursement, and balance management are implemented. |
| [ShariahAuditService](../src/main/java/com/cbs/shariahcompliance/service/ShariahAuditService.java) | Policy-dependent | Audit workflow, sampling-reference resolution, finding management, and reporting are implemented and regression-tested; methodology and materiality remain governance-defined. |
| [IslamicFeeAccrualService](../src/main/java/com/cbs/fees/islamic/service/IslamicFeeAccrualService.java) | Closed | Periodic accrual, collection, upfront-fee deferral, deferred recognition, and receivable/income reporting are implemented. |
| [IslamicFeeService](../src/main/java/com/cbs/fees/islamic/service/IslamicFeeService.java) | Closed | Fee configuration, decision-table and SpEL resolution, and charity routing are implemented. |
| [IslamicFeeWaiverService](../src/main/java/com/cbs/fees/islamic/service/IslamicFeeWaiverService.java) | Policy-dependent | Waiver routing is implemented, but authority thresholds and approval boundaries are policy-driven. |
| [LatePenaltyService](../src/main/java/com/cbs/fees/islamic/service/LatePenaltyService.java) | Closed | Late-penalty processing, charity routing, four-eyes reversal, and fee-log synchronization are implemented and regression-tested. |
| [IslamicAmlDashboardService](../src/main/java/com/cbs/islamicaml/service/IslamicAmlDashboardService.java) | Closed | AML dashboard aggregation and Islamic monitoring widgets are implemented. |
| [IslamicAmlMonitoringService](../src/main/java/com/cbs/islamicaml/service/IslamicAmlMonitoringService.java) | Closed | Real-time and batch monitoring plus Tawarruq pattern detection with configurable thresholds are implemented. |
| [IslamicSanctionsScreeningService](../src/main/java/com/cbs/islamicaml/service/IslamicSanctionsScreeningService.java) | Closed | Customer, counterparty, broker, provider, and issuer screening plus Arabic fuzzy matching and batch re-screening are implemented. |
| [IslamicStrSarService](../src/main/java/com/cbs/islamicaml/service/IslamicStrSarService.java) | Closed | SAR workflow, MLRO approval, filing deadlines, FIU response, and alert-driven auto-generation are implemented. |

## Musharakah Services

| Service | Status | Evidence / Residual Gap |
|---|---|---|
| [MusharakahContractService](../src/main/java/com/cbs/musharakah/service/MusharakahContractService.java) | Closed | Contract lifecycle and service orchestration are implemented. |
| [MusharakahLossService](../src/main/java/com/cbs/musharakah/service/MusharakahLossService.java) | Closed | Loss detect-assess-allocate-post workflow, ST-005 proportionality enforcement, GL posting, and unit-value recalculation are implemented. |
| [MusharakahOriginationService](../src/main/java/com/cbs/musharakah/service/MusharakahOriginationService.java) | Closed | Application lifecycle, conservation checks, valuation, pricing, approval, expiry, and contract conversion are implemented. |
| [MusharakahBuyoutService](../src/main/java/com/cbs/musharakah/service/MusharakahBuyoutService.java) | Closed | Buyout schedule generation, single and combined payments, iterative surplus application, and scheduled buyouts are implemented. |

## Reclassification Delta

The 12 services that were previously marked partial were re-audited in depth and all 12 are now classified as closed based on live source inspection:

- [AssetMurabahaService](../src/main/java/com/cbs/murabaha/service/AssetMurabahaService.java)
- [MurabahaScheduleService](../src/main/java/com/cbs/murabaha/service/MurabahaScheduleService.java)
- [MurabahaProfitRecognitionService](../src/main/java/com/cbs/murabaha/service/MurabahaProfitRecognitionService.java)
- [IjarahRentalService](../src/main/java/com/cbs/ijarah/service/IjarahRentalService.java)
- [IjarahGLService](../src/main/java/com/cbs/ijarah/service/IjarahGLService.java)
- [IslamicFeeAccrualService](../src/main/java/com/cbs/fees/islamic/service/IslamicFeeAccrualService.java)
- [IslamicAmlMonitoringService](../src/main/java/com/cbs/islamicaml/service/IslamicAmlMonitoringService.java)
- [IslamicSanctionsScreeningService](../src/main/java/com/cbs/islamicaml/service/IslamicSanctionsScreeningService.java)
- [IslamicStrSarService](../src/main/java/com/cbs/islamicaml/service/IslamicStrSarService.java)
- [MusharakahLossService](../src/main/java/com/cbs/musharakah/service/MusharakahLossService.java)
- [MusharakahOriginationService](../src/main/java/com/cbs/musharakah/service/MusharakahOriginationService.java)
- [MusharakahBuyoutService](../src/main/java/com/cbs/musharakah/service/MusharakahBuyoutService.java)

## Residual Policy-Dependent Services

These services do not present a code-completeness gap, but they still depend on approved configuration or governance inputs:

- [IrrService](../src/main/java/com/cbs/gl/islamic/service/IrrService.java)
- [PerService](../src/main/java/com/cbs/gl/islamic/service/PerService.java)
- [DistributionReserveService](../src/main/java/com/cbs/profitdistribution/service/DistributionReserveService.java)
- [ShariahAuditService](../src/main/java/com/cbs/shariahcompliance/service/ShariahAuditService.java)
- [IslamicFeeWaiverService](../src/main/java/com/cbs/fees/islamic/service/IslamicFeeWaiverService.java)