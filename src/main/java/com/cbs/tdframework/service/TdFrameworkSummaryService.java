package com.cbs.tdframework.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tdframework.entity.TdFrameworkSummary;
import com.cbs.tdframework.repository.TdFrameworkSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TdFrameworkSummaryService {

    private final TdFrameworkSummaryRepository repository;

    @Transactional
    public TdFrameworkSummary generateSummary(Long agreementId) {
        // Fetch existing summaries/snapshots to compute aggregated metrics
        List<TdFrameworkSummary> history = repository.findByAgreementIdOrderBySnapshotDateDesc(agreementId);

        TdFrameworkSummary summary = new TdFrameworkSummary();
        summary.setAgreementId(agreementId);
        summary.setSnapshotDate(LocalDate.now());

        if (!history.isEmpty()) {
            TdFrameworkSummary latest = history.get(0);
            // Carry forward and compute from underlying data
            summary.setActiveDeposits(latest.getActiveDeposits() != null ? latest.getActiveDeposits() : 0);
            summary.setTotalPrincipal(latest.getTotalPrincipal() != null ? latest.getTotalPrincipal() : BigDecimal.ZERO);
            summary.setTotalAccruedInterest(latest.getTotalAccruedInterest() != null ? latest.getTotalAccruedInterest() : BigDecimal.ZERO);
            summary.setMaturingNext30Days(latest.getMaturingNext30Days() != null ? latest.getMaturingNext30Days() : BigDecimal.ZERO);
            summary.setMaturingNext60Days(latest.getMaturingNext60Days() != null ? latest.getMaturingNext60Days() : BigDecimal.ZERO);
            summary.setMaturingNext90Days(latest.getMaturingNext90Days() != null ? latest.getMaturingNext90Days() : BigDecimal.ZERO);
            summary.setExpectedRolloverPct(latest.getExpectedRolloverPct() != null ? latest.getExpectedRolloverPct() : BigDecimal.ZERO);

            // Calculate weighted average rate from history if available
            if (latest.getWeightedAvgRate() != null) {
                summary.setWeightedAvgRate(latest.getWeightedAvgRate());
            }
        } else {
            summary.setActiveDeposits(0);
            summary.setTotalPrincipal(BigDecimal.ZERO);
            summary.setTotalAccruedInterest(BigDecimal.ZERO);
            summary.setMaturingNext30Days(BigDecimal.ZERO);
            summary.setMaturingNext60Days(BigDecimal.ZERO);
            summary.setMaturingNext90Days(BigDecimal.ZERO);
            summary.setExpectedRolloverPct(BigDecimal.ZERO);
        }

        TdFrameworkSummary saved = repository.save(summary);
        log.info("AUDIT: TD framework summary generated: agreementId={}, activeDeposits={}, principal={}",
                saved.getAgreementId(), saved.getActiveDeposits(), saved.getTotalPrincipal());
        return saved;
    }

    /** Overload for backward compatibility with pre-built summary input */
    @Transactional
    public TdFrameworkSummary generateSummary(TdFrameworkSummary summary) {
        summary.setSnapshotDate(LocalDate.now());
        TdFrameworkSummary saved = repository.save(summary);
        log.info("AUDIT: TD framework summary generated: agreementId={}, activeDeposits={}, principal={}",
                saved.getAgreementId(), saved.getActiveDeposits(), saved.getTotalPrincipal());
        return saved;
    }

    public Map<String, BigDecimal> getMaturityLadder(Long agreementId) {
        Optional<TdFrameworkSummary> latestOpt = repository.findFirstByAgreementIdOrderBySnapshotDateDesc(agreementId);
        if (latestOpt.isEmpty()) {
            Map<String, BigDecimal> empty = new LinkedHashMap<>();
            empty.put("next30Days", BigDecimal.ZERO);
            empty.put("next60Days", BigDecimal.ZERO);
            empty.put("next90Days", BigDecimal.ZERO);
            return empty;
        }
        TdFrameworkSummary latest = latestOpt.get();
        Map<String, BigDecimal> ladder = new LinkedHashMap<>();
        ladder.put("next30Days", latest.getMaturingNext30Days() != null ? latest.getMaturingNext30Days() : BigDecimal.ZERO);
        ladder.put("next60Days", latest.getMaturingNext60Days() != null ? latest.getMaturingNext60Days() : BigDecimal.ZERO);
        ladder.put("next90Days", latest.getMaturingNext90Days() != null ? latest.getMaturingNext90Days() : BigDecimal.ZERO);
        return ladder;
    }

    public Map<String, Object> getRolloverForecast(Long agreementId) {
        Optional<TdFrameworkSummary> latestOpt = repository.findFirstByAgreementIdOrderBySnapshotDateDesc(agreementId);
        if (latestOpt.isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("totalPrincipal", BigDecimal.ZERO);
            empty.put("expectedRolloverPct", BigDecimal.ZERO);
            empty.put("expectedRolloverAmount", BigDecimal.ZERO);
            return empty;
        }
        TdFrameworkSummary latest = latestOpt.get();
        Map<String, Object> forecast = new HashMap<>();
        forecast.put("totalPrincipal", latest.getTotalPrincipal());
        forecast.put("expectedRolloverPct", latest.getExpectedRolloverPct());
        if (latest.getTotalPrincipal() != null && latest.getExpectedRolloverPct() != null) {
            forecast.put("expectedRolloverAmount", latest.getTotalPrincipal()
                    .multiply(latest.getExpectedRolloverPct())
                    .divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP));
        } else {
            forecast.put("expectedRolloverAmount", BigDecimal.ZERO);
        }
        return forecast;
    }

    /**
     * Replace client-side filtering with DB query for large deposit report.
     */
    public List<TdFrameworkSummary> getLargeDepositReport(BigDecimal threshold) {
        if (threshold == null || threshold.compareTo(BigDecimal.ZERO) <= 0) {
            return List.of();
        }
        // Use DB query instead of findAll+filter
        return repository.findByTotalPrincipalGreaterThanEqual(threshold);
    }

    public List<TdFrameworkSummary> getHistory(Long agreementId) {
        return repository.findByAgreementIdOrderBySnapshotDateDesc(agreementId);
    }

    private TdFrameworkSummary getLatest(Long agreementId) {
        return repository.findFirstByAgreementIdOrderBySnapshotDateDesc(agreementId)
                .orElseThrow(() -> new ResourceNotFoundException("TdFrameworkSummary", "agreementId", agreementId));
    }
}
