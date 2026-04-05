package com.cbs.shariahcompliance.service;

import com.cbs.shariahcompliance.dto.ComplianceDashboard;
import com.cbs.shariahcompliance.entity.AlertStatus;
import com.cbs.shariahcompliance.entity.AlertType;
import com.cbs.shariahcompliance.entity.FindingSeverity;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.RemediationStatus;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.entity.ScreeningSeverity;
import com.cbs.shariahcompliance.entity.ShariahAudit;
import com.cbs.shariahcompliance.entity.ShariahAuditFinding;
import com.cbs.shariahcompliance.repository.ShariahAuditFindingRepository;
import com.cbs.shariahcompliance.repository.ShariahAuditRepository;
import com.cbs.shariahcompliance.repository.ShariahComplianceAlertRepository;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ComplianceDashboardService {

    private final ShariahScreeningResultRepository screeningResultRepository;
    private final ShariahComplianceAlertRepository alertRepository;
    private final SnciRecordRepository snciRepository;
    private final ShariahAuditRepository auditRepository;
    private final ShariahAuditFindingRepository findingRepository;

    public ComplianceDashboard getDashboard() {
        long totalScreenings = screeningResultRepository.count();
        long passedScreenings = screeningResultRepository.countByOverallResult(ScreeningOverallResult.PASS);
                long failedScreenings = screeningResultRepository.countByOverallResult(ScreeningOverallResult.FAIL);
                long alertedScreenings = screeningResultRepository.countByOverallResult(ScreeningOverallResult.ALERT);
                long warnedScreenings = screeningResultRepository.countByOverallResult(ScreeningOverallResult.WARN);
        BigDecimal screeningPassRate;
        if (totalScreenings > 0) {
            screeningPassRate = BigDecimal.valueOf(passedScreenings)
                    .divide(BigDecimal.valueOf(totalScreenings), 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(4, RoundingMode.HALF_UP);
        } else {
            screeningPassRate = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        BigDecimal screeningControlScore = totalScreenings == 0
                ? scaled(100)
                : percentage(BigDecimal.valueOf(passedScreenings)
                        .add(BigDecimal.valueOf(warnedScreenings).multiply(new BigDecimal("0.50"))), BigDecimal.valueOf(totalScreenings));

        long totalAlerts = alertRepository.count();
        long openNewAlerts = alertRepository.countByStatus(AlertStatus.NEW);
        long openUnderReviewAlerts = alertRepository.countByStatus(AlertStatus.UNDER_REVIEW);
        long openAlerts = openNewAlerts + openUnderReviewAlerts;
        long overdueAlerts = alertRepository.countOverdueAlerts();
        long escalatedAlerts = alertRepository.countByStatus(AlertStatus.ESCALATED);
        long resolvedAlerts = totalAlerts - openAlerts - escalatedAlerts;
        BigDecimal alertResolutionScore = totalAlerts == 0
                ? scaled(100)
                : percentage(BigDecimal.valueOf(Math.max(resolvedAlerts - overdueAlerts, 0)), BigDecimal.valueOf(totalAlerts));
        Map<String, Long> alertsBySeverity = new LinkedHashMap<>();
        for (ScreeningSeverity severity : ScreeningSeverity.values()) {
            alertsBySeverity.put(severity.name(), alertRepository.countBySeverity(severity));
        }
        Map<String, Long> alertsByType = new LinkedHashMap<>();
        for (AlertType type : AlertType.values()) {
            alertsByType.put(type.name(), alertRepository.countByAlertType(type));
        }

        BigDecimal detectedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DETECTED)).orElse(BigDecimal.ZERO);
        BigDecimal quarantinedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.QUARANTINED)).orElse(BigDecimal.ZERO);
        BigDecimal pendingSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION)).orElse(BigDecimal.ZERO);
        BigDecimal approvedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFICATION_APPROVED)).orElse(BigDecimal.ZERO);
        BigDecimal purifiedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFIED)).orElse(BigDecimal.ZERO);
        BigDecimal disputedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DISPUTED)).orElse(BigDecimal.ZERO);
        BigDecimal waivedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.WAIVED_BY_SSB)).orElse(BigDecimal.ZERO);
        BigDecimal totalSnci = detectedSnci.add(quarantinedSnci).add(pendingSnci).add(approvedSnci).add(purifiedSnci).add(disputedSnci).add(waivedSnci);
        BigDecimal unpurifiedSnci = Optional.ofNullable(snciRepository.sumTotalUnpurified()).orElse(BigDecimal.ZERO);
        BigDecimal snciResolutionScore = totalSnci.compareTo(BigDecimal.ZERO) == 0
                ? scaled(100)
                : percentage(purifiedSnci.add(waivedSnci), totalSnci);
        Map<String, BigDecimal> snciByStatus = new LinkedHashMap<>();
        snciByStatus.put(QuarantineStatus.DETECTED.name(), scaled(detectedSnci));
        snciByStatus.put(QuarantineStatus.QUARANTINED.name(), scaled(quarantinedSnci));
        snciByStatus.put(QuarantineStatus.PENDING_PURIFICATION.name(), scaled(pendingSnci));
        snciByStatus.put(QuarantineStatus.PURIFICATION_APPROVED.name(), scaled(approvedSnci));
        snciByStatus.put(QuarantineStatus.PURIFIED.name(), scaled(purifiedSnci));
        snciByStatus.put(QuarantineStatus.DISPUTED.name(), scaled(disputedSnci));
        snciByStatus.put(QuarantineStatus.WAIVED_BY_SSB.name(), scaled(waivedSnci));

        Optional<ShariahAudit> latestAuditOpt = auditRepository.findTopByOrderByPeriodToDesc();
        String latestAuditOpinion = latestAuditOpt
                .map(a -> a.getOverallOpinion() != null ? a.getOverallOpinion().name() : "N/A")
                .orElse("N/A");

        BigDecimal overallComplianceScore = latestAuditOpt
                .map(a -> a.getComplianceScore() != null ? a.getComplianceScore() : BigDecimal.ZERO)
                .orElse(BigDecimal.ZERO);
                BigDecimal evidenceCoverageRate = latestAuditOpt
                                .map(this::calculateEvidenceCoverage)
                                .orElse(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP));

        long openFindings = findingRepository.countByRemediationStatus(RemediationStatus.OPEN)
                + findingRepository.countByRemediationStatus(RemediationStatus.IN_PROGRESS);

        long overdueRemediations = findingRepository.countOverdueRemediations();
                Map<String, Long> findingsBySeverity = new LinkedHashMap<>();
                for (FindingSeverity severity : FindingSeverity.values()) {
                        findingsBySeverity.put(severity.name(), countFindingsBySeverity(latestAuditOpt, severity));
                }
                Map<String, Long> findingsByStatus = new LinkedHashMap<>();
                for (RemediationStatus status : RemediationStatus.values()) {
                        findingsByStatus.put(status.name(), findingRepository.countByRemediationStatus(status));
                }
                long totalTrackedFindings = findingsByStatus.values().stream().mapToLong(Long::longValue).sum();
                long remediatedOrAccepted = findingsByStatus.getOrDefault(RemediationStatus.REMEDIATED.name(), 0L)
                                + findingsByStatus.getOrDefault(RemediationStatus.ACCEPTED_RISK.name(), 0L)
                                + findingsByStatus.getOrDefault(RemediationStatus.CLOSED.name(), 0L);
                BigDecimal remediationScore = totalTrackedFindings == 0
                                ? scaled(100)
                                : percentage(BigDecimal.valueOf(remediatedOrAccepted), BigDecimal.valueOf(totalTrackedFindings));

                BigDecimal blendedScore = weightedScore(screeningControlScore, alertResolutionScore, snciResolutionScore, remediationScore, evidenceCoverageRate);
                BigDecimal effectiveOverallScore = overallComplianceScore.compareTo(BigDecimal.ZERO) > 0 ? overallComplianceScore : blendedScore;
                String slaPosture = determineSlaPosture(overdueAlerts, overdueRemediations, openAlerts, escalatedAlerts);
                List<String> priorityActions = buildPriorityActions(overdueAlerts, overdueRemediations, unpurifiedSnci,
                                alertsBySeverity, findingsBySeverity, latestAuditOpinion, screeningPassRate, failedScreenings, alertedScreenings);

        ComplianceDashboard dashboard = ComplianceDashboard.builder()
                                .overallComplianceScore(effectiveOverallScore)
                .totalScreenings(totalScreenings)
                .screeningPassRate(screeningPassRate)
                .totalAlerts(totalAlerts)
                .openAlerts(openAlerts)
                .totalSnci(totalSnci)
                .unpurifiedSnci(unpurifiedSnci)
                .latestAuditOpinion(latestAuditOpinion)
                .openFindings(openFindings)
                .overdueRemediations(overdueRemediations)
                                .screeningControlScore(screeningControlScore)
                                .alertResolutionScore(alertResolutionScore)
                                .snciResolutionScore(snciResolutionScore)
                                .remediationScore(remediationScore)
                                .evidenceCoverageRate(evidenceCoverageRate)
                                .overdueAlerts(overdueAlerts)
                                .slaPosture(slaPosture)
                                .alertsBySeverity(alertsBySeverity)
                                .alertsByType(alertsByType)
                                .findingsBySeverity(findingsBySeverity)
                                .findingsByStatus(findingsByStatus)
                                .snciByStatus(snciByStatus)
                                .priorityActions(priorityActions)
                .build();

                log.info("Generated compliance dashboard — score: {}, screening score: {}, alert score: {}, SNCI score: {}, remediation score: {}, evidence coverage: {}%, alerts overdue: {}, remediation overdue: {}, SLA posture: {}",
                                effectiveOverallScore, screeningControlScore, alertResolutionScore, snciResolutionScore,
                                remediationScore, evidenceCoverageRate, overdueAlerts, overdueRemediations, slaPosture);

        return dashboard;
    }

        private BigDecimal calculateEvidenceCoverage(ShariahAudit audit) {
                if (audit.getTotalTransactionsInScope() <= 0 || audit.getSampleSize() <= 0) {
                        return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
                }
                return percentage(BigDecimal.valueOf(audit.getSampleSize()), BigDecimal.valueOf(audit.getTotalTransactionsInScope()));
        }

        private long countFindingsBySeverity(Optional<ShariahAudit> latestAuditOpt, FindingSeverity severity) {
                return latestAuditOpt.map(audit -> findingRepository.countByAuditIdAndSeverity(audit.getId(), severity)).orElse(0L);
        }

        private BigDecimal weightedScore(
                        BigDecimal screeningControlScore,
                        BigDecimal alertResolutionScore,
                        BigDecimal snciResolutionScore,
                        BigDecimal remediationScore,
                        BigDecimal evidenceCoverageRate
        ) {
                BigDecimal score = screeningControlScore.multiply(new BigDecimal("0.25"))
                                .add(alertResolutionScore.multiply(new BigDecimal("0.20")))
                                .add(snciResolutionScore.multiply(new BigDecimal("0.25")))
                                .add(remediationScore.multiply(new BigDecimal("0.20")))
                                .add(evidenceCoverageRate.multiply(new BigDecimal("0.10")));
                return score.setScale(4, RoundingMode.HALF_UP);
        }

        private String determineSlaPosture(long overdueAlerts, long overdueRemediations, long openAlerts, long escalatedAlerts) {
                if (overdueAlerts > 0 || overdueRemediations > 0) {
                        return "BREACHED";
                }
                if (escalatedAlerts > 0 || openAlerts > 0) {
                        return "AT_RISK";
                }
                return "ON_TRACK";
        }

        private List<String> buildPriorityActions(
                        long overdueAlerts,
                        long overdueRemediations,
                        BigDecimal unpurifiedSnci,
                        Map<String, Long> alertsBySeverity,
                        Map<String, Long> findingsBySeverity,
                        String latestAuditOpinion,
                        BigDecimal screeningPassRate,
                        long failedScreenings,
                        long alertedScreenings
        ) {
                List<String> actions = new ArrayList<>();
                if (overdueAlerts > 0) {
                        actions.add("Resolve or escalate " + overdueAlerts + " alerts that have breached SLA.");
                }
                if (overdueRemediations > 0) {
                        actions.add("Close " + overdueRemediations + " overdue audit remediations with accountable owners and dates.");
                }
                if (unpurifiedSnci.compareTo(BigDecimal.ZERO) > 0) {
                        actions.add("Purify or formally waive outstanding SNCI balance of " + scaled(unpurifiedSnci).toPlainString() + ".");
                }
                long criticalAlerts = alertsBySeverity.getOrDefault(ScreeningSeverity.CRITICAL.name(), 0L);
                if (criticalAlerts > 0) {
                        actions.add("Review " + criticalAlerts + " critical Shariah alerts for immediate containment.");
                }
                long criticalFindings = findingsBySeverity.getOrDefault(FindingSeverity.CRITICAL.name(), 0L);
                if (criticalFindings > 0) {
                        actions.add("Address " + criticalFindings + " critical audit findings before new product or contract approvals.");
                }
                if (!"N/A".equals(latestAuditOpinion) && !"FULLY_COMPLIANT".equalsIgnoreCase(latestAuditOpinion)) {
                        actions.add("Prepare management and SSB follow-up for latest audit opinion: " + latestAuditOpinion + ".");
                }
                if (screeningPassRate.compareTo(new BigDecimal("95.0000")) < 0 && (failedScreenings > 0 || alertedScreenings > 0)) {
                        actions.add("Triage failed/alerted screenings to restore pass rate above 95%.");
                }
                if (actions.isEmpty()) {
                        actions.add("Maintain current control posture and continue periodic evidence refresh.");
                }
                return actions;
        }

        private BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
                if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
                        return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
                }
                return numerator.divide(denominator, 6, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100))
                                .setScale(4, RoundingMode.HALF_UP);
        }

        private BigDecimal scaled(BigDecimal value) {
                return value == null ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP) : value.setScale(4, RoundingMode.HALF_UP);
        }

        private BigDecimal scaled(long value) {
                return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
        }
}
