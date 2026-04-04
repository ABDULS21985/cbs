package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.IslamicAmlDashboard;
import com.cbs.islamicaml.entity.*;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.IslamicStrSarRepository;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicAmlDashboardService {

    private final IslamicAmlAlertRepository alertRepository;
    private final SanctionsScreeningResultRepository screeningResultRepository;
    private final IslamicStrSarRepository sarRepository;

    public IslamicAmlDashboard getDashboard(LocalDate from, LocalDate to) {
        log.info("Building Islamic AML dashboard for period {} to {}", from, to);

        IslamicAmlDashboard.AlertSummary alertSummary = buildAlertSummary(from, to);
        IslamicAmlDashboard.TawarruqMonitoring tawarruqMonitoring = buildTawarruqMonitoring(from, to);
        IslamicAmlDashboard.SanctionsWidget sanctionsWidget = buildSanctionsWidget(from, to);
        IslamicAmlDashboard.SarWidget sarWidget = buildSarWidget(from, to);
        IslamicAmlDashboard.CombinedScreeningWidget combinedScreeningWidget = buildCombinedScreeningWidget();
        IslamicAmlDashboard.PoolMonitoringWidget poolMonitoringWidget = buildPoolMonitoringWidget(from, to);
        List<IslamicAmlDashboard.MonthlyTrend> monthlyTrends = buildMonthlyTrends(from, to);

        return IslamicAmlDashboard.builder()
                .alertSummary(alertSummary)
                .tawarruqMonitoring(tawarruqMonitoring)
                .sanctionsWidget(sanctionsWidget)
                .sarWidget(sarWidget)
                .combinedScreeningWidget(combinedScreeningWidget)
                .poolMonitoringWidget(poolMonitoringWidget)
                .monthlyTrends(monthlyTrends)
                .build();
    }

    // ===================== ALERT SUMMARY =====================

    private IslamicAmlDashboard.AlertSummary buildAlertSummary(LocalDate from, LocalDate to) {
        List<IslamicAmlAlert> allAlerts = alertRepository.findAll();
        List<IslamicAmlAlert> filtered = filterAlertsByDateRange(allAlerts, from, to);

        long totalAlerts = filtered.size();
        long newAlerts = filtered.stream()
                .filter(a -> a.getStatus() == IslamicAmlAlertStatus.NEW).count();
        long underInvestigation = filtered.stream()
                .filter(a -> a.getStatus() == IslamicAmlAlertStatus.UNDER_INVESTIGATION).count();
        long escalated = filtered.stream()
                .filter(a -> a.getStatus() == IslamicAmlAlertStatus.ESCALATED).count();

        long overdueAlerts = alertRepository.findOverdueAlerts().stream()
                .filter(a -> isWithinDateRange(a, from, to))
                .count();

        // Group by rule code (typology)
        Map<String, Long> alertsByCategory = new LinkedHashMap<>();
        for (IslamicAmlAlert alert : filtered) {
            String category = alert.getRuleCode() != null ? alert.getRuleCode() : "UNCLASSIFIED";
            alertsByCategory.merge(category, 1L, Long::sum);
        }

        return IslamicAmlDashboard.AlertSummary.builder()
                .totalAlerts(totalAlerts)
                .newAlerts(newAlerts)
                .underInvestigation(underInvestigation)
                .escalated(escalated)
                .overdueAlerts(overdueAlerts)
                .alertsByCategory(alertsByCategory)
                .build();
    }

    // ===================== TAWARRUQ MONITORING =====================

    private IslamicAmlDashboard.TawarruqMonitoring buildTawarruqMonitoring(LocalDate from, LocalDate to) {
        List<IslamicAmlAlert> allAlerts = alertRepository.findAll();
        List<IslamicAmlAlert> filtered = filterAlertsByDateRange(allAlerts, from, to);

        // Filter for Tawarruq-related alerts
        List<IslamicAmlAlert> tawarruqAlerts = filtered.stream()
                .filter(a -> {
                    String ruleCode = a.getRuleCode() != null ? a.getRuleCode().toUpperCase() : "";
                    return ruleCode.contains("TAWARRUQ") || ruleCode.contains("RAPID_CYCLING")
                            || ruleCode.contains("ASSET_MANIPULATION");
                })
                .collect(Collectors.toList());

        long totalTawarruqAlerts = tawarruqAlerts.size();

        long rapidCyclingDetected = tawarruqAlerts.stream()
                .filter(a -> a.getRuleCode() != null
                        && a.getRuleCode().toUpperCase().contains("RAPID_CYCLING"))
                .count();

        long assetManipulationDetected = tawarruqAlerts.stream()
                .filter(a -> a.getRuleCode() != null
                        && a.getRuleCode().toUpperCase().contains("ASSET_MANIPULATION"))
                .count();

        BigDecimal totalAmountFlagged = tawarruqAlerts.stream()
                .map(a -> Optional.ofNullable(a.getTotalAmountInvolved()).orElse(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return IslamicAmlDashboard.TawarruqMonitoring.builder()
                .totalTawarruqAlerts(totalTawarruqAlerts)
                .rapidCyclingDetected(rapidCyclingDetected)
                .assetManipulationDetected(assetManipulationDetected)
                .totalAmountFlagged(totalAmountFlagged)
                .build();
    }

    // ===================== SANCTIONS WIDGET =====================

    private IslamicAmlDashboard.SanctionsWidget buildSanctionsWidget(LocalDate from, LocalDate to) {
        List<SanctionsScreeningResult> allResults = screeningResultRepository.findAll();
        List<SanctionsScreeningResult> filtered = allResults.stream()
                .filter(r -> {
                    if (r.getScreeningTimestamp() == null) return false;
                    LocalDate screenDate = r.getScreeningTimestamp().toLocalDate();
                    boolean afterFrom = from == null || !screenDate.isBefore(from);
                    boolean beforeTo = to == null || !screenDate.isAfter(to);
                    return afterFrom && beforeTo;
                })
                .collect(Collectors.toList());

        long totalScreenings = filtered.size();
        long potentialMatches = filtered.stream()
                .filter(r -> r.getOverallResult() == SanctionsOverallResult.POTENTIAL_MATCH).count();
        long confirmedMatches = filtered.stream()
                .filter(r -> r.getOverallResult() == SanctionsOverallResult.CONFIRMED_MATCH).count();
        long pendingReview = filtered.stream()
                .filter(r -> r.getDispositionStatus() == SanctionsDispositionStatus.PENDING_REVIEW).count();

        BigDecimal clearRate = totalScreenings > 0
                ? BigDecimal.valueOf(filtered.stream()
                        .filter(r -> r.getOverallResult() == SanctionsOverallResult.CLEAR).count())
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(totalScreenings), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return IslamicAmlDashboard.SanctionsWidget.builder()
                .totalScreenings(totalScreenings)
                .potentialMatches(potentialMatches)
                .confirmedMatches(confirmedMatches)
                .pendingReview(pendingReview)
                .clearRate(clearRate)
                .build();
    }

    // ===================== SAR WIDGET =====================

    private IslamicAmlDashboard.SarWidget buildSarWidget(LocalDate from, LocalDate to) {
        List<IslamicStrSar> allSars = sarRepository.findAll();
        List<IslamicStrSar> filtered = allSars.stream()
                .filter(s -> {
                    if (s.getCreatedAt() == null) return false;
                    LocalDate createdDate = s.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                    boolean afterFrom = from == null || !createdDate.isBefore(from);
                    boolean beforeTo = to == null || !createdDate.isAfter(to);
                    return afterFrom && beforeTo;
                })
                .collect(Collectors.toList());

        long totalSars = filtered.size();
        long draftCount = filtered.stream()
                .filter(s -> s.getStatus() == SarStatus.DRAFT).count();
        long pendingMlroApproval = filtered.stream()
                .filter(s -> s.getStatus() == SarStatus.UNDER_REVIEW
                        || s.getStatus() == SarStatus.APPROVED_FOR_FILING).count();
        long filedCount = filtered.stream()
                .filter(s -> s.getStatus() == SarStatus.FILED
                        || s.getStatus() == SarStatus.ACKNOWLEDGED).count();
        long deadlineBreaches = filtered.stream()
                .filter(IslamicStrSar::isDeadlineBreach).count();

        Map<String, Long> byJurisdiction = new LinkedHashMap<>();
        for (SarJurisdiction jur : SarJurisdiction.values()) {
            long count = filtered.stream()
                    .filter(s -> s.getJurisdiction() == jur).count();
            if (count > 0) {
                byJurisdiction.put(jur.name(), count);
            }
        }

        return IslamicAmlDashboard.SarWidget.builder()
                .totalSars(totalSars)
                .draftCount(draftCount)
                .pendingMlroApproval(pendingMlroApproval)
                .filedCount(filedCount)
                .deadlineBreaches(deadlineBreaches)
                .byJurisdiction(byJurisdiction)
                .build();
    }

    // ===================== COMBINED SCREENING WIDGET =====================

    private IslamicAmlDashboard.CombinedScreeningWidget buildCombinedScreeningWidget() {
        // Combined screening is ephemeral (not persisted as a separate entity),
        // so we derive stats from existing sanctions and screening data
        long totalScreenings = screeningResultRepository.count();
        long sanctionsBlocked = screeningResultRepository.countByOverallResult(SanctionsOverallResult.CONFIRMED_MATCH)
                + screeningResultRepository.countByOverallResult(SanctionsOverallResult.POTENTIAL_MATCH);
        long clearCount = screeningResultRepository.countByOverallResult(SanctionsOverallResult.CLEAR);

        return IslamicAmlDashboard.CombinedScreeningWidget.builder()
                .totalCombinedScreenings(totalScreenings)
                .shariahBlocked(0L) // Would require cross-module query
                .sanctionsBlocked(sanctionsBlocked)
                .dualBlocked(0L)    // Would require cross-module query
                .clearCount(clearCount)
                .build();
    }

    // ===================== POOL MONITORING WIDGET =====================

    private IslamicAmlDashboard.PoolMonitoringWidget buildPoolMonitoringWidget(LocalDate from, LocalDate to) {
        List<IslamicAmlAlert> allAlerts = alertRepository.findAll();
        List<IslamicAmlAlert> filtered = filterAlertsByDateRange(allAlerts, from, to);

        long poolLayeringAlerts = filtered.stream()
                .filter(a -> a.getRuleCode() != null
                        && a.getRuleCode().toUpperCase().contains("POOL_LAYERING"))
                .count();

        long partnershipLayeringAlerts = filtered.stream()
                .filter(a -> a.getRuleCode() != null
                        && a.getRuleCode().toUpperCase().contains("PARTNERSHIP_LAYERING"))
                .count();

        BigDecimal totalPoolAmountFlagged = filtered.stream()
                .filter(a -> a.getRuleCode() != null
                        && (a.getRuleCode().toUpperCase().contains("POOL_LAYERING")
                            || a.getRuleCode().toUpperCase().contains("PARTNERSHIP_LAYERING")))
                .map(a -> Optional.ofNullable(a.getTotalAmountInvolved()).orElse(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return IslamicAmlDashboard.PoolMonitoringWidget.builder()
                .poolLayeringAlerts(poolLayeringAlerts)
                .partnershipLayeringAlerts(partnershipLayeringAlerts)
                .totalPoolAmountFlagged(totalPoolAmountFlagged)
                .build();
    }

    // ===================== MONTHLY TRENDS =====================

    private List<IslamicAmlDashboard.MonthlyTrend> buildMonthlyTrends(LocalDate from, LocalDate to) {
        List<IslamicAmlDashboard.MonthlyTrend> trends = new ArrayList<>();

        LocalDate effectiveFrom = from != null ? from : LocalDate.now().minusMonths(12);
        LocalDate effectiveTo = to != null ? to : LocalDate.now();

        List<IslamicAmlAlert> allAlerts = alertRepository.findAll();
        List<SanctionsScreeningResult> allScreenings = screeningResultRepository.findAll();
        List<IslamicStrSar> allSars = sarRepository.findAll();

        YearMonth startMonth = YearMonth.from(effectiveFrom);
        YearMonth endMonth = YearMonth.from(effectiveTo);
        YearMonth currentMonth = startMonth;

        while (!currentMonth.isAfter(endMonth)) {
            final YearMonth month = currentMonth;

            long alertCount = allAlerts.stream()
                    .filter(a -> {
                        if (a.getCreatedAt() == null) return false;
                        YearMonth alertMonth = YearMonth.from(
                                a.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate());
                        return alertMonth.equals(month);
                    })
                    .count();

            long sarCount = allSars.stream()
                    .filter(s -> {
                        if (s.getCreatedAt() == null) return false;
                        YearMonth sarMonth = YearMonth.from(
                                s.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate());
                        return sarMonth.equals(month);
                    })
                    .count();

            long screeningCount = allScreenings.stream()
                    .filter(r -> {
                        if (r.getScreeningTimestamp() == null) return false;
                        YearMonth scrMonth = YearMonth.from(r.getScreeningTimestamp().toLocalDate());
                        return scrMonth.equals(month);
                    })
                    .count();

            trends.add(IslamicAmlDashboard.MonthlyTrend.builder()
                    .month(month.toString())
                    .alertCount(alertCount)
                    .sarCount(sarCount)
                    .screeningCount(screeningCount)
                    .build());

            currentMonth = currentMonth.plusMonths(1);
        }

        return trends;
    }

    // ===================== PRIVATE HELPERS =====================

    private List<IslamicAmlAlert> filterAlertsByDateRange(List<IslamicAmlAlert> alerts,
                                                          LocalDate from, LocalDate to) {
        return alerts.stream()
                .filter(a -> isWithinDateRange(a, from, to))
                .collect(Collectors.toList());
    }

    private boolean isWithinDateRange(IslamicAmlAlert alert, LocalDate from, LocalDate to) {
        if (alert.getCreatedAt() == null) return false;
        LocalDate alertDate = alert.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
        boolean afterFrom = from == null || !alertDate.isBefore(from);
        boolean beforeTo = to == null || !alertDate.isAfter(to);
        return afterFrom && beforeTo;
    }
}
