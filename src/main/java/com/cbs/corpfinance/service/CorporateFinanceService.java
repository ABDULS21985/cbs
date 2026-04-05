package com.cbs.corpfinance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public CorporateFinanceEngagement createEngagement(CorporateFinanceEngagement engagement) {
        if (engagement.getClientName() == null || engagement.getClientName().isBlank()) {
            throw new BusinessException("Client name is required", "MISSING_CLIENT_NAME");
        }
        if (engagement.getEngagementType() == null || engagement.getEngagementType().isBlank()) {
            throw new BusinessException("Engagement type is required", "MISSING_ENGAGEMENT_TYPE");
        }
        // Conflict-of-interest check: same lead banker should not handle engagements for competing clients
        if (engagement.getLeadBanker() != null && engagement.getClientName() != null) {
            List<CorporateFinanceEngagement> activeMandates = repository.findByStatusNotIn(List.of("COMPLETED", "TERMINATED"));
            boolean conflict = activeMandates.stream()
                    .anyMatch(e -> engagement.getLeadBanker().equals(e.getLeadBanker())
                            && !engagement.getClientName().equals(e.getClientName())
                            && engagement.getEngagementType().equals(e.getEngagementType()));
            if (conflict) {
                log.warn("AUDIT: Potential conflict of interest: leadBanker={} already has active {} engagement for another client",
                        engagement.getLeadBanker(), engagement.getEngagementType());
            }
        }
        engagement.setEngagementCode("CF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        engagement.setTotalFeesInvoiced(BigDecimal.ZERO);
        engagement.setTotalFeesPaid(BigDecimal.ZERO);
        engagement.setStatus("PROPOSAL");
        CorporateFinanceEngagement saved = repository.save(engagement);
        log.info("AUDIT: Corporate finance engagement created: code={}, type={}, client={}, actor={}",
                saved.getEngagementCode(), saved.getEngagementType(), saved.getClientName(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CorporateFinanceEngagement deliverDraft(Long engagementId) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        // Status guard: must be PROPOSAL or IN_PROGRESS to deliver draft
        if ("COMPLETED".equals(engagement.getStatus()) || "TERMINATED".equals(engagement.getStatus())
                || "FINAL_DELIVERED".equals(engagement.getStatus())) {
            throw new BusinessException("Cannot deliver draft for engagement in status: " + engagement.getStatus(), "INVALID_STATUS");
        }
        engagement.setStatus("DRAFT_DELIVERED");
        engagement.setDraftDeliveryDate(LocalDate.now());
        log.info("AUDIT: Draft delivered: code={}, actor={}", engagement.getEngagementCode(), currentActorProvider.getCurrentActor());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement finalizeDelivery(Long engagementId) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        // Status guard: must be DRAFT_DELIVERED to finalize
        if (!"DRAFT_DELIVERED".equals(engagement.getStatus())) {
            throw new BusinessException("Engagement must be DRAFT_DELIVERED to finalize; current status: " + engagement.getStatus(), "INVALID_STATUS");
        }
        engagement.setStatus("FINAL_DELIVERED");
        engagement.setFinalDeliveryDate(LocalDate.now());
        log.info("AUDIT: Final delivery: code={}, actor={}", engagement.getEngagementCode(), currentActorProvider.getCurrentActor());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement recordFeeInvoice(Long engagementId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("Fee amount must be positive", "INVALID_FEE_AMOUNT");
        }
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setTotalFeesInvoiced(engagement.getTotalFeesInvoiced().add(amount));
        log.info("AUDIT: Fee invoice recorded: code={}, amount={}, total={}, actor={}",
                engagement.getEngagementCode(), amount, engagement.getTotalFeesInvoiced(), currentActorProvider.getCurrentActor());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement recordFeePayment(Long engagementId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("Payment amount must be positive", "INVALID_PAYMENT_AMOUNT");
        }
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setTotalFeesPaid(engagement.getTotalFeesPaid().add(amount));
        log.info("AUDIT: Fee payment recorded: code={}, amount={}, total={}, actor={}",
                engagement.getEngagementCode(), amount, engagement.getTotalFeesPaid(), currentActorProvider.getCurrentActor());
        return repository.save(engagement);
    }

    @Transactional
    public CorporateFinanceEngagement closeEngagement(Long engagementId) {
        CorporateFinanceEngagement engagement = getById(engagementId);
        engagement.setStatus("COMPLETED");
        engagement.setCompletionDate(LocalDate.now());
        log.info("AUDIT: Corporate finance engagement completed: code={}, actor={}",
                engagement.getEngagementCode(), currentActorProvider.getCurrentActor());
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
        // Use repository query instead of findAll+filter for efficiency
        return repository.findByCompletionDateBetween(from, to).stream()
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
        return repository.findAll();
    }
}
