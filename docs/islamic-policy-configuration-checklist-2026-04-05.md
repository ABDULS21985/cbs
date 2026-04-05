# Islamic Policy and Configuration Checklist

Date: 2026-04-05

## Purpose

The remaining five policy-dependent services do not have a source-code completeness gap. Their residual risk is operational: approved policy content, threshold values, master-data setup, and governance ownership must be in place before production use.

## Current Position

- Closed in code: 41 services
- Policy-dependent: 5 services
- Partial in code: 0 services

## Service Checklist

| Service | Implemented code path | Required policy or configuration inputs | Primary owner | Go-live evidence required |
|---|---|---|---|---|
| [IrrService](../src/main/java/com/cbs/gl/islamic/service/IrrService.java) | IRR policy create/update, retention, release, closure release, adequacy and dashboard flows are implemented. | Approve pool-specific IRR policy code, retention rate, maximum retention rate, maximum reserve balance and/or percent-of-pool cap, trigger threshold, retention allocation, approval-required flag, Fatwa reference, SSB review dates, and pool linkage. Confirm GL mappings for IRR retention and release transaction types. | Treasury/Finance with Shariah board approval | Signed IRR policy per pool, active Fatwa record, linked pool policy id, successful UAT journals for retention and loss-absorption release |
| [PerService](../src/main/java/com/cbs/gl/islamic/service/PerService.java) | PER policy create/update, smoothing calculation, retention, release, dashboard, and reporting flows are implemented. | Approve target distribution rate, release threshold, retention rate, maximum retention rate, maximum reserve balance and/or percent-of-pool cap, retention allocation, bank-share participation rule, approval-required flag, Fatwa reference, SSB review dates, and pool linkage. Confirm GL mappings for PER retention and release. | Treasury/Finance with Shariah board approval | Signed PER policy per pool, active Fatwa record, linked pool policy id, successful UAT for high-profit retention and low-profit release |
| [DistributionReserveService](../src/main/java/com/cbs/profitdistribution/service/DistributionReserveService.java) | PER-first then IRR execution, cap-aware reserve transactions, run-level reserve summaries, and reserve impact analysis are implemented and regression-tested. | Populate pool configuration for max PER retention percent, max IRR retention percent, and max total reserve percent on every active investment pool. Align those caps with approved PER and IRR policies so the run-time caps do not contradict policy documents. | Profit distribution operations with product governance | Pool configuration export showing all three cap fields populated, UAT run proving retention, release, and reserve-cap breach behavior |
| [ShariahAuditService](../src/main/java/com/cbs/shariahcompliance/service/ShariahAuditService.java) | Audit planning, start, sample generation, review, findings, draft/final report workflow, and compliance scoring are implemented and regression-tested. | Approve audit charter, audit types in use, scope templates, minimum team composition, sampling methodology by entity type, materiality thresholds, finding severity rubric, remediation SLA by severity, compliance-score interpretation, and SSB submission/final-opinion authority. | Head of Shariah Audit with SSB liaison | Approved audit methodology, documented severity and scoring rubric, end-to-end dry run with reviewed samples and final report issuance |
| [IslamicFeeWaiverService](../src/main/java/com/cbs/fees/islamic/service/IslamicFeeWaiverService.java) | Waiver request, authority routing, four-eyes approval, pre-charge and post-charge application, deferral, conversion, rejection, and summary reporting are implemented. | Approve waiver authority matrix and threshold values for officer, branch manager, regional manager, and head office. Confirm role mapping for CBS_OFFICER, BRANCH_MANAGER, REGIONAL_MANAGER, HEAD_OFFICE, and CBS_ADMIN. Approve allowed waiver reasons, evidence requirements, fee-conversion mapping, and treatment of charity-routed penalties versus bank-income fees. | Operations control with Finance and Shariah oversight | Approved threshold schedule, verified approver roles in IAM, UAT evidence for full waiver, partial waiver, deferral, conversion, and charity-routed reversal |

## Required Configuration Items

### IRR and PER reserve policy setup

- Create active policy records for each production investment pool.
- Attach valid Fatwa references to each policy.
- Populate SSB review and next-review dates.
- Verify the pool holds the correct policy id linkage.
- Verify Islamic posting rules exist for IRR and PER retention and release events.

### Pool reserve caps

- Populate max PER retention percent on each pool.
- Populate max IRR retention percent on each pool.
- Populate max total reserve percent on each pool.
- Reconcile these three caps against the signed reserve policy documents.

### Shariah audit governance pack

- Publish the approved audit methodology and severity rubric.
- Define remediation SLA targets for critical, high, medium, and low findings.
- Define who may submit to SSB and who may issue the final opinion.
- Define the minimum reviewed-sample threshold required before draft report generation.

### Islamic fee waiver control matrix

- Set threshold values for officer, branch manager, regional manager, and head office.
- Verify the application configuration values match the approved threshold matrix.
- Verify role assignments in the identity system match the runtime role checks.
- Publish accepted waiver reasons, required evidence, and conversion-fee mapping rules.

## Recommended UAT Scenarios

1. IRR retention posts the expected journal, updates reserve balance, and respects the approved cap.
2. IRR release for loss absorption requires approval when the policy requires it and cannot exceed available reserve balance.
3. PER retains excess profit above target and releases reserve when actual rate falls below release threshold.
4. Distribution reserve orchestration blocks a run when total configured reserve caps would be exceeded.
5. Shariah audit can progress from planned to closed only when sample collection, review, and reporting prerequisites are satisfied.
6. Fee waiver approval blocks self-approval and routes by threshold to the correct approver role.
7. Charity-routed penalty waiver reverses charity impact correctly, while Ujrah fee waiver reduces bank income only.

## Exit Criteria

- Every active pool has approved and linked PER and IRR policies.
- Every active pool has reserve-cap fields populated and reconciled to policy documents.
- Audit methodology and final-opinion authority are approved and published.
- Fee-waiver threshold matrix and role mapping are approved and verified in runtime configuration.
- UAT evidence exists for the seven scenarios above and is signed off by the relevant control owners.

## Release Recommendation

Production release is conditionally supportable after this checklist is completed. The remaining work is governance and configuration closure, not additional code implementation.