package com.cbs.openitem.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.openitem.entity.SecuritiesFail;
import com.cbs.openitem.repository.SecuritiesFailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SecuritiesFailService {

    private final SecuritiesFailRepository repository;

    @Transactional
    public SecuritiesFail recordFail(SecuritiesFail fail) {
        fail.setFailRef("SF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        fail.setStatus("OPEN");
        fail.setEscalationLevel("OPERATIONS");
        fail.setPenaltyAccrued(BigDecimal.ZERO);
        updateAging(fail);
        SecuritiesFail saved = repository.save(fail);
        log.info("Securities fail recorded: ref={}, type={}, instrument={}", saved.getFailRef(), saved.getFailType(), saved.getInstrumentCode());
        return saved;
    }

    @Transactional
    public SecuritiesFail escalateFail(Long failId) {
        SecuritiesFail fail = getById(failId);
        updateAging(fail);

        // Auto-escalate by aging: >3d DESK_HEAD, >7d COMPLIANCE, >14d SENIOR_MANAGEMENT
        if (fail.getAgingDays() > 14) {
            fail.setEscalationLevel("SENIOR_MANAGEMENT");
        } else if (fail.getAgingDays() > 7) {
            fail.setEscalationLevel("COMPLIANCE");
        } else if (fail.getAgingDays() > 3) {
            fail.setEscalationLevel("DESK_HEAD");
        }
        fail.setStatus("ESCALATED");
        log.info("Fail escalated: ref={}, level={}, agingDays={}", fail.getFailRef(), fail.getEscalationLevel(), fail.getAgingDays());
        return repository.save(fail);
    }

    @Transactional
    public SecuritiesFail initiateBuyIn(Long failId) {
        SecuritiesFail fail = getById(failId);
        fail.setBuyInEligible(true);
        fail.setBuyInDeadline(LocalDate.now().plusDays(4));
        fail.setStatus("BUY_IN_INITIATED");
        log.info("Buy-in initiated: ref={}, deadline={}", fail.getFailRef(), fail.getBuyInDeadline());
        return repository.save(fail);
    }

    @Transactional
    public SecuritiesFail calculatePenalty(Long failId, BigDecimal dailyPenaltyRate) {
        SecuritiesFail fail = getById(failId);
        updateAging(fail);
        // CSDR penalty = amount × dailyRate × agingDays
        BigDecimal penalty = fail.getAmount()
                .multiply(dailyPenaltyRate)
                .multiply(BigDecimal.valueOf(fail.getAgingDays()))
                .divide(BigDecimal.valueOf(10000), 4, RoundingMode.HALF_UP);
        fail.setPenaltyAccrued(penalty);
        log.info("Penalty calculated: ref={}, penalty={}, agingDays={}", fail.getFailRef(), penalty, fail.getAgingDays());
        return repository.save(fail);
    }

    @Transactional
    public SecuritiesFail resolveFail(Long failId, String resolutionAction, String notes) {
        SecuritiesFail fail = getById(failId);
        fail.setResolutionAction(resolutionAction);
        fail.setResolutionNotes(notes);
        fail.setResolvedAt(Instant.now());
        fail.setStatus("RESOLVED");
        log.info("Fail resolved: ref={}, action={}", fail.getFailRef(), resolutionAction);
        return repository.save(fail);
    }

    public Map<String, Object> getFailsDashboard() {
        List<SecuritiesFail> all = repository.findAll();
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalFails", all.size());
        dashboard.put("openFails", all.stream().filter(f -> !"RESOLVED".equals(f.getStatus()) && !"WRITTEN_OFF".equals(f.getStatus())).count());
        dashboard.put("byType", all.stream().collect(Collectors.groupingBy(SecuritiesFail::getFailType, Collectors.counting())));
        dashboard.put("byAgingBucket", all.stream().filter(f -> f.getAgingBucket() != null).collect(Collectors.groupingBy(SecuritiesFail::getAgingBucket, Collectors.counting())));
        dashboard.put("totalPenalty", all.stream().map(SecuritiesFail::getPenaltyAccrued).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
        return dashboard;
    }

    public Map<String, Long> getCounterpartyFailReport() {
        return repository.findByStatusIn(List.of("OPEN", "INVESTIGATING", "ESCALATED", "BUY_IN_INITIATED")).stream()
                .filter(f -> f.getCounterpartyCode() != null)
                .collect(Collectors.groupingBy(SecuritiesFail::getCounterpartyCode, Collectors.counting()));
    }

    public SecuritiesFail getByRef(String ref) {
        return repository.findByFailRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("SecuritiesFail", "failRef", ref));
    }

    private SecuritiesFail getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SecuritiesFail", "id", id));
    }

    private void updateAging(SecuritiesFail fail) {
        if (fail.getFailStartDate() != null) {
            long days = ChronoUnit.DAYS.between(fail.getFailStartDate(), LocalDate.now());
            fail.setAgingDays((int) days);
            if (days == 0) fail.setAgingBucket("SAME_DAY");
            else if (days <= 3) fail.setAgingBucket("1_TO_3_DAYS");
            else if (days <= 7) fail.setAgingBucket("4_TO_7_DAYS");
            else if (days <= 14) fail.setAgingBucket("8_TO_14_DAYS");
            else if (days <= 30) fail.setAgingBucket("15_TO_30_DAYS");
            else fail.setAgingBucket("OVER_30");
        }
    }
}
