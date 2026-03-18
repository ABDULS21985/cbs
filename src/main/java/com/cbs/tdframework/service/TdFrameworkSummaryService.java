package com.cbs.tdframework.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tdframework.entity.TdFrameworkSummary;
import com.cbs.tdframework.repository.TdFrameworkSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TdFrameworkSummaryService {

    private final TdFrameworkSummaryRepository repository;

    @Transactional
    public TdFrameworkSummary generateSummary(TdFrameworkSummary summary) {
        summary.setSnapshotDate(LocalDate.now());
        TdFrameworkSummary saved = repository.save(summary);
        log.info("TD framework summary generated: agreementId={}, activeDeposits={}, principal={}", saved.getAgreementId(), saved.getActiveDeposits(), saved.getTotalPrincipal());
        return saved;
    }

    public Map<String, BigDecimal> getMaturityLadder(Long agreementId) {
        TdFrameworkSummary latest = getLatest(agreementId);
        Map<String, BigDecimal> ladder = new LinkedHashMap<>();
        ladder.put("next30Days", latest.getMaturingNext30Days() != null ? latest.getMaturingNext30Days() : BigDecimal.ZERO);
        ladder.put("next60Days", latest.getMaturingNext60Days() != null ? latest.getMaturingNext60Days() : BigDecimal.ZERO);
        ladder.put("next90Days", latest.getMaturingNext90Days() != null ? latest.getMaturingNext90Days() : BigDecimal.ZERO);
        return ladder;
    }

    public Map<String, Object> getRolloverForecast(Long agreementId) {
        TdFrameworkSummary latest = getLatest(agreementId);
        Map<String, Object> forecast = new HashMap<>();
        forecast.put("totalPrincipal", latest.getTotalPrincipal());
        forecast.put("expectedRolloverPct", latest.getExpectedRolloverPct());
        if (latest.getTotalPrincipal() != null && latest.getExpectedRolloverPct() != null) {
            forecast.put("expectedRolloverAmount", latest.getTotalPrincipal()
                    .multiply(latest.getExpectedRolloverPct())
                    .divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP));
        }
        return forecast;
    }

    public List<TdFrameworkSummary> getLargeDepositReport(BigDecimal threshold) {
        return repository.findAll().stream()
                .filter(s -> s.getTotalPrincipal() != null && s.getTotalPrincipal().compareTo(threshold) >= 0)
                .toList();
    }

    public List<TdFrameworkSummary> getHistory(Long agreementId) {
        return repository.findByAgreementIdOrderBySnapshotDateDesc(agreementId);
    }

    private TdFrameworkSummary getLatest(Long agreementId) {
        return repository.findFirstByAgreementIdOrderBySnapshotDateDesc(agreementId)
                .orElseThrow(() -> new ResourceNotFoundException("TdFrameworkSummary", "agreementId", agreementId));
    }
}
