package com.cbs.shariahcompliance.service;

import com.cbs.shariahcompliance.dto.ComplianceDashboard;
import com.cbs.shariahcompliance.entity.AlertStatus;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.RemediationStatus;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
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
import java.util.List;
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
        // 1. Screening stats
        long totalScreenings = screeningResultRepository.count();
        long passedScreenings = screeningResultRepository.countByOverallResult(ScreeningOverallResult.PASS);
        BigDecimal screeningPassRate;
        if (totalScreenings > 0) {
            screeningPassRate = BigDecimal.valueOf(passedScreenings)
                    .divide(BigDecimal.valueOf(totalScreenings), 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(4, RoundingMode.HALF_UP);
        } else {
            screeningPassRate = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }

        // 2. Alert stats (guard against division by zero in any ratio calculations)
        long totalAlerts = alertRepository.count();
        long openNewAlerts = alertRepository.countByStatus(AlertStatus.NEW);
        long openUnderReviewAlerts = alertRepository.countByStatus(AlertStatus.UNDER_REVIEW);
        long openAlerts = openNewAlerts + openUnderReviewAlerts;
        // Note: if totalAlerts == 0, avoid any ratio computation that divides by totalAlerts
        // Currently no alert ratios are computed, but this guard is here for future safety

        // 3. SNCI stats
        BigDecimal detectedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DETECTED)).orElse(BigDecimal.ZERO);
        BigDecimal quarantinedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.QUARANTINED)).orElse(BigDecimal.ZERO);
        BigDecimal pendingSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION)).orElse(BigDecimal.ZERO);
        BigDecimal purifiedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFIED)).orElse(BigDecimal.ZERO);
        BigDecimal disputedSnci = Optional.ofNullable(snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.DISPUTED)).orElse(BigDecimal.ZERO);
        BigDecimal totalSnci = detectedSnci.add(quarantinedSnci).add(pendingSnci).add(purifiedSnci).add(disputedSnci);
        BigDecimal unpurifiedSnci = Optional.ofNullable(snciRepository.sumTotalUnpurified()).orElse(BigDecimal.ZERO);

        // 4. Audit stats
        Optional<ShariahAudit> latestAuditOpt = auditRepository.findTopByOrderByPeriodToDesc();
        String latestAuditOpinion = latestAuditOpt
                .map(a -> a.getOverallOpinion() != null ? a.getOverallOpinion().name() : "N/A")
                .orElse("N/A");

        BigDecimal overallComplianceScore = latestAuditOpt
                .map(a -> a.getComplianceScore() != null ? a.getComplianceScore() : BigDecimal.ZERO)
                .orElse(BigDecimal.ZERO);

        // 5. Open findings and overdue remediations
        List<ShariahAuditFinding> openFindingsList = findingRepository.findByRemediationStatus(RemediationStatus.OPEN);
        List<ShariahAuditFinding> inProgressFindingsList = findingRepository.findByRemediationStatus(RemediationStatus.IN_PROGRESS);
        long openFindings = openFindingsList.size() + inProgressFindingsList.size();

        List<ShariahAuditFinding> overdueList = findingRepository.findOverdueRemediations();
        long overdueRemediations = overdueList.size();

        ComplianceDashboard dashboard = ComplianceDashboard.builder()
                .overallComplianceScore(overallComplianceScore)
                .totalScreenings(totalScreenings)
                .screeningPassRate(screeningPassRate)
                .totalAlerts(totalAlerts)
                .openAlerts(openAlerts)
                .totalSnci(totalSnci)
                .unpurifiedSnci(unpurifiedSnci)
                .latestAuditOpinion(latestAuditOpinion)
                .openFindings(openFindings)
                .overdueRemediations(overdueRemediations)
                .build();

        log.info("Generated compliance dashboard — score: {}, screenings: {}, pass rate: {}%, alerts: {} (open: {}), SNCI total: {}, unpurified: {}, open findings: {}, overdue: {}",
                overallComplianceScore, totalScreenings, screeningPassRate, totalAlerts, openAlerts,
                totalSnci, unpurifiedSnci, openFindings, overdueRemediations);

        return dashboard;
    }
}
