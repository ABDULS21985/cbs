package com.cbs.islamicaml.service;

import com.cbs.islamicaml.dto.IslamicAmlDashboard;
import com.cbs.islamicaml.entity.*;
import com.cbs.islamicaml.repository.CombinedScreeningAuditLogRepository;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.IslamicStrSarRepository;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final ShariahScreeningResultRepository shariahScreeningResultRepository;
    private final CombinedScreeningAuditLogRepository combinedScreeningAuditLogRepository;

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
        Instant fromInstant = toInstantStart(from);
        Instant toInstant = toInstantEnd(to);

        long totalAlerts = alertRepository.countByCreatedAtBetween(fromInstant, toInstant);
        long newAlerts = alertRepository.countByStatusAndCreatedAtBetween(IslamicAmlAlertStatus.NEW, fromInstant, toInstant);
        long underInvestigation = alertRepository.countByStatusAndCreatedAtBetween(IslamicAmlAlertStatus.UNDER_INVESTIGATION, fromInstant, toInstant);
        long escalated = alertRepository.countByStatusAndCreatedAtBetween(IslamicAmlAlertStatus.ESCALATED, fromInstant, toInstant);

        // Overdue alerts are time-sensitive, no additional date filter needed
        long overdueAlerts = alertRepository.countOverdueAlerts();

        // Group by rule code using aggregate query
        Map<String, Long> alertsByCategory = new LinkedHashMap<>();
        List<Object[]> grouped = alertRepository.countGroupByRuleCode(fromInstant, toInstant);
        for (Object[] row : grouped) {
            String category = row[0] != null ? row[0].toString() : "UNCLASSIFIED";
            Long count = (Long) row[1];
            alertsByCategory.put(category, count);
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
        Instant fromInstant = toInstantStart(from);
        Instant toInstant = toInstantEnd(to);

        // Use count queries with LIKE patterns for Tawarruq-related rule codes
        long tawarruqAlerts = alertRepository.countByRuleCodeLikeAndCreatedAtBetween("%TAWARRUQ%", fromInstant, toInstant);
        long rapidCyclingDetected = alertRepository.countByRuleCodeLikeAndCreatedAtBetween("%RAPID_CYCLING%", fromInstant, toInstant);
        long assetManipulationDetected = alertRepository.countByRuleCodeLikeAndCreatedAtBetween("%ASSET_MANIPULATION%", fromInstant, toInstant);

        long totalTawarruqAlerts = tawarruqAlerts + rapidCyclingDetected + assetManipulationDetected;

        // For totalAmountFlagged, we still need to sum amounts which requires loading entities
        // but only the Tawarruq-related ones (much smaller set than findAll)
        List<IslamicAmlAlert> tawarruqAlertList = alertRepository.findAll((root, query, cb) -> {
            var ruleCode = root.<String>get("ruleCode");
            var datePred = cb.and(
                    cb.greaterThanOrEqualTo(root.get("createdAt"), fromInstant),
                    cb.lessThan(root.get("createdAt"), toInstant));
            var typePred = cb.or(
                    cb.like(cb.upper(ruleCode), "%TAWARRUQ%"),
                    cb.like(cb.upper(ruleCode), "%RAPID_CYCLING%"),
                    cb.like(cb.upper(ruleCode), "%ASSET_MANIPULATION%"));
            return cb.and(datePred, typePred);
        });

        BigDecimal totalAmountFlagged = tawarruqAlertList.stream()
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
        LocalDateTime fromDt = toLocalDateTimeStart(from);
        LocalDateTime toDt = toLocalDateTimeEnd(to);

        long totalScreenings = screeningResultRepository.countByScreeningTimestampBetween(fromDt, toDt);
        long potentialMatches = screeningResultRepository.countByOverallResultAndScreeningTimestampBetween(
                SanctionsOverallResult.POTENTIAL_MATCH, fromDt, toDt);
        long confirmedMatches = screeningResultRepository.countByOverallResultAndScreeningTimestampBetween(
                SanctionsOverallResult.CONFIRMED_MATCH, fromDt, toDt);
        long pendingReview = screeningResultRepository.countByDispositionStatusAndScreeningTimestampBetween(
                SanctionsDispositionStatus.PENDING_REVIEW, fromDt, toDt);
        long clearCount = screeningResultRepository.countByOverallResultAndScreeningTimestampBetween(
                SanctionsOverallResult.CLEAR, fromDt, toDt);

        BigDecimal clearRate = totalScreenings > 0
                ? BigDecimal.valueOf(clearCount)
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
        Instant fromInstant = toInstantStart(from);
        Instant toInstant = toInstantEnd(to);

        long totalSars = sarRepository.countByCreatedAtBetween(fromInstant, toInstant);
        long draftCount = sarRepository.countByStatusAndCreatedAtBetween(SarStatus.DRAFT, fromInstant, toInstant);
        long pendingMlroApproval = sarRepository.countByStatusAndCreatedAtBetween(SarStatus.UNDER_REVIEW, fromInstant, toInstant)
                + sarRepository.countByStatusAndCreatedAtBetween(SarStatus.APPROVED_FOR_FILING, fromInstant, toInstant);
        long filedCount = sarRepository.countByStatusAndCreatedAtBetween(SarStatus.FILED, fromInstant, toInstant)
                + sarRepository.countByStatusAndCreatedAtBetween(SarStatus.ACKNOWLEDGED, fromInstant, toInstant);
        long deadlineBreaches = sarRepository.countBreachingDeadline();

        Map<String, Long> byJurisdiction = new LinkedHashMap<>();
        for (SarJurisdiction jur : SarJurisdiction.values()) {
            long count = sarRepository.countByJurisdictionAndCreatedAtBetween(jur, fromInstant, toInstant);
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
        // Derive stats from both sanctions and Shariah screening data
        long sanctionsTotal = screeningResultRepository.count();
        long shariahTotal = shariahScreeningResultRepository.count();
        long totalScreenings = sanctionsTotal + shariahTotal;

        long sanctionsBlocked = screeningResultRepository.countByOverallResult(SanctionsOverallResult.CONFIRMED_MATCH)
                + screeningResultRepository.countByOverallResult(SanctionsOverallResult.POTENTIAL_MATCH);
        long shariahBlocked = shariahScreeningResultRepository.countByOverallResult(ScreeningOverallResult.FAIL);
        long sanctionsClear = screeningResultRepository.countByOverallResult(SanctionsOverallResult.CLEAR);
        long shariahClear = shariahScreeningResultRepository.countByOverallResult(ScreeningOverallResult.PASS);
        long clearCount = sanctionsClear + shariahClear;

        // Dual blocked: query persisted combined screening audit logs for DUAL_BLOCKED outcomes
        long dualBlocked = combinedScreeningAuditLogRepository.countByOutcome(CombinedScreeningOutcome.DUAL_BLOCKED);

        return IslamicAmlDashboard.CombinedScreeningWidget.builder()
                .totalCombinedScreenings(totalScreenings)
                .shariahBlocked(shariahBlocked)
                .sanctionsBlocked(sanctionsBlocked)
                .dualBlocked(dualBlocked)
                .clearCount(clearCount)
                .build();
    }

    // ===================== POOL MONITORING WIDGET =====================

    private IslamicAmlDashboard.PoolMonitoringWidget buildPoolMonitoringWidget(LocalDate from, LocalDate to) {
        Instant fromInstant = toInstantStart(from);
        Instant toInstant = toInstantEnd(to);

        long poolLayeringAlerts = alertRepository.countByRuleCodeLikeAndCreatedAtBetween("%POOL_LAYERING%", fromInstant, toInstant);
        long partnershipLayeringAlerts = alertRepository.countByRuleCodeLikeAndCreatedAtBetween("%PARTNERSHIP_LAYERING%", fromInstant, toInstant);

        // For totalPoolAmountFlagged, load only pool-related alerts (small targeted set)
        List<IslamicAmlAlert> poolAlerts = alertRepository.findAll((root, query, cb) -> {
            var ruleCode = root.<String>get("ruleCode");
            var datePred = cb.and(
                    cb.greaterThanOrEqualTo(root.get("createdAt"), fromInstant),
                    cb.lessThan(root.get("createdAt"), toInstant));
            var typePred = cb.or(
                    cb.like(cb.upper(ruleCode), "%POOL_LAYERING%"),
                    cb.like(cb.upper(ruleCode), "%PARTNERSHIP_LAYERING%"));
            return cb.and(datePred, typePred);
        });

        BigDecimal totalPoolAmountFlagged = poolAlerts.stream()
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

        YearMonth startMonth = YearMonth.from(effectiveFrom);
        YearMonth endMonth = YearMonth.from(effectiveTo);
        YearMonth currentMonth = startMonth;

        while (!currentMonth.isAfter(endMonth)) {
            LocalDate monthStart = currentMonth.atDay(1);
            LocalDate monthEnd = currentMonth.atEndOfMonth().plusDays(1); // exclusive upper bound

            Instant monthStartInstant = monthStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant monthEndInstant = monthEnd.atStartOfDay(ZoneId.systemDefault()).toInstant();
            LocalDateTime monthStartDt = monthStart.atStartOfDay();
            LocalDateTime monthEndDt = monthEnd.atStartOfDay();

            long alertCount = alertRepository.countByCreatedAtBetween(monthStartInstant, monthEndInstant);
            long sarCount = sarRepository.countByCreatedAtBetween(monthStartInstant, monthEndInstant);
            long screeningCount = screeningResultRepository.countByScreeningTimestampBetween(monthStartDt, monthEndDt);

            trends.add(IslamicAmlDashboard.MonthlyTrend.builder()
                    .month(currentMonth.toString())
                    .alertCount(alertCount)
                    .sarCount(sarCount)
                    .screeningCount(screeningCount)
                    .build());

            currentMonth = currentMonth.plusMonths(1);
        }

        return trends;
    }

    // ===================== PRIVATE HELPERS =====================

    private Instant toInstantStart(LocalDate date) {
        if (date == null) return Instant.EPOCH;
        return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    private Instant toInstantEnd(LocalDate date) {
        if (date == null) return Instant.now().plusSeconds(86400);
        return date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    private LocalDateTime toLocalDateTimeStart(LocalDate date) {
        if (date == null) return LocalDateTime.of(2000, 1, 1, 0, 0);
        return date.atStartOfDay();
    }

    private LocalDateTime toLocalDateTimeEnd(LocalDate date) {
        if (date == null) return LocalDateTime.now().plusDays(1);
        return date.plusDays(1).atStartOfDay();
    }
}
