package com.cbs.corpfinance.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.corpfinance.entity.CorporateFinanceEngagement;
import com.cbs.corpfinance.repository.CorporateFinanceEngagementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CorporateFinanceService {

    private final CorporateFinanceEngagementRepository repository;

    @Transactional
    public CorporateFinanceEngagement createEngagement(CorporateFinanceEngagement engagement) {
        engagement.setEngagementCode("CF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        engagement.setTotalFeesInvoiced(BigDecimal.ZERO);
        engagement.setTotalFeesPaid(BigDecimal.ZERO);
        engagement.setStatus("PROPOSAL");
        CorporateFinanceEngagement saved = repository.save(engagement);
        log.info("Corporate finance engagement created: code={}, type={}, client={}", saved.getEngagementCode(), saved.getEngagementType(), saved.getClientName());
        return saved;
    }

    @Transactional
    public CorporateFinanceEngagement deliverDraft(Long engagementId) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setStatus("DRAFT_DELIVERED");
        engagement.setDraftDeliveryDate(LocalDate.now());
        log.info("Draft delivered: code={}", engagement.getEngagementCode());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement finalizeDelivery(Long engagementId) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setStatus("FINAL_DELIVERED");
        engagement.setFinalDeliveryDate(LocalDate.now());
        log.info("Final delivery: code={}", engagement.getEngagementCode());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement recordFeeInvoice(Long engagementId, BigDecimal amount) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setTotalFeesInvoiced(engagement.getTotalFeesInvoiced().add(amount));
        log.info("Fee invoice recorded: code={}, amount={}, total={}", engagement.getEngagementCode(), amount, engagement.getTotalFeesInvoiced());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement recordFeePayment(Long engagementId, BigDecimal amount) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setTotalFeesPaid(engagement.getTotalFeesPaid().add(amount));
        log.info("Fee payment recorded: code={}, amount={}, total={}", engagement.getEngagementCode(), amount, engagement.getTotalFeesPaid());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement closeEngagement(Long engagementId) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setStatus("COMPLETED");
        engagement.setCompletionDate(LocalDate.now());
        log.info("Corporate finance engagement completed: code={}", engagement.getEngagementCode());
        return repository.save(engagement);
    }

    public List<CorporateFinanceEngagement> getActiveMandates() {
        return repository.findByStatusNotIn(List.of("COMPLETED", "TERMINATED"));
    }

    public Map<String, Long> getPipelineByType() {
        return repository.findAll().stream()
                .collect(Collectors.groupingBy(CorporateFinanceEngagement::getEngagementType, Collectors.counting()));
    }

    public BigDecimal getFeeRevenue(LocalDate from, LocalDate to) {
        return repository.findAll().stream()
                .filter(e -> e.getCompletionDate() != null && !e.getCompletionDate().isBefore(from) && !e.getCompletionDate().isAfter(to))
                .map(CorporateFinanceEngagement::getTotalFeesInvoiced)
                .filter(f -> f != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Map<String, Long> getTeamCapacity() {
        return repository.findByStatusNotIn(List.of("COMPLETED", "TERMINATED")).stream()
                .filter(e -> e.getLeadBanker() != null)
                .collect(Collectors.groupingBy(CorporateFinanceEngagement::getLeadBanker, Collectors.counting()));
    }

    private CorporateFinanceEngagement getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateFinanceEngagement", "id", id));
    }

    public CorporateFinanceEngagement getByCode(String code) {
        return repository.findByEngagementCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateFinanceEngagement", "engagementCode", code));
    }

    public List<CorporateFinanceEngagement> getAllEngagements() {
        return engagementRepository.findAll();
    }
}