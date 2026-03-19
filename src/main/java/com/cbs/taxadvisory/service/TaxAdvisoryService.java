package com.cbs.taxadvisory.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.taxadvisory.entity.TaxAdvisoryEngagement;
import com.cbs.taxadvisory.repository.TaxAdvisoryEngagementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TaxAdvisoryService {

    private final TaxAdvisoryEngagementRepository repository;

    @Transactional
    public TaxAdvisoryEngagement createEngagement(TaxAdvisoryEngagement engagement) {
        engagement.setEngagementCode("TA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        engagement.setStatus("PROPOSAL");
        TaxAdvisoryEngagement saved = repository.save(engagement);
        log.info("Tax advisory engagement created: code={}, type={}, client={}", saved.getEngagementCode(), saved.getEngagementType(), saved.getClientName());
        return saved;
    }

    @Transactional
    public TaxAdvisoryEngagement deliverOpinion(Long engagementId, String opinion) {
        TaxAdvisoryEngagement engagement = getById(engagementId);
        engagement.setOpinion(opinion);
        engagement.setStatus("OPINION_DELIVERED");
        log.info("Tax opinion delivered: code={}", engagement.getEngagementCode());
        return repository.save(engagement);
    }

    @Transactional
    public TaxAdvisoryEngagement closeEngagement(Long engagementId) {
        TaxAdvisoryEngagement engagement = getById(engagementId);
        engagement.setStatus("CLOSED");
        engagement.setEngagementEndDate(LocalDate.now());
        log.info("Tax advisory engagement closed: code={}", engagement.getEngagementCode());
        return repository.save(engagement);
    }

    public List<TaxAdvisoryEngagement> getActiveEngagements() {
        return repository.findByStatusIn(List.of("ENGAGED", "IN_PROGRESS"));
    }

    public List<TaxAdvisoryEngagement> getByJurisdiction(String country) {
        return repository.findAll().stream()
                .filter(e -> e.getJurisdictions() != null && e.getJurisdictions().toString().contains(country))
                .toList();
    }

    public BigDecimal getFeeRevenue(LocalDate from, LocalDate to) {
        return repository.findAll().stream()
                .filter(e -> "CLOSED".equals(e.getStatus()))
                .filter(e -> e.getEngagementEndDate() != null && !e.getEngagementEndDate().isBefore(from) && !e.getEngagementEndDate().isAfter(to))
                .map(TaxAdvisoryEngagement::getAdvisoryFee)
                .filter(f -> f != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private TaxAdvisoryEngagement getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TaxAdvisoryEngagement", "id", id));
    }

    public TaxAdvisoryEngagement getByCode(String code) {
        return repository.findByEngagementCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("TaxAdvisoryEngagement", "engagementCode", code));
    }

    public java.util.List<TaxAdvisoryEngagement> getAllEngagements() {
        return repository.findAll();
    }

}
