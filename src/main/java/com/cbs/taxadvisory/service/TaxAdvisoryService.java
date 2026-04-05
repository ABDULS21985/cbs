package com.cbs.taxadvisory.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.taxadvisory.entity.TaxAdvisoryEngagement;
import com.cbs.taxadvisory.repository.TaxAdvisoryEngagementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TaxAdvisoryService {

    private final TaxAdvisoryEngagementRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TaxAdvisoryEngagement createEngagement(TaxAdvisoryEngagement engagement) {
        if (!StringUtils.hasText(engagement.getClientName())) {
            throw new BusinessException("Client name is required", "MISSING_CLIENT_NAME");
        }
        if (!StringUtils.hasText(engagement.getEngagementType())) {
            throw new BusinessException("Engagement type is required", "MISSING_ENGAGEMENT_TYPE");
        }
        engagement.setEngagementCode("TA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        engagement.setStatus("PROPOSAL");
        TaxAdvisoryEngagement saved = repository.save(engagement);
        log.info("AUDIT: Tax advisory engagement created: code={}, type={}, client={}, actor={}",
                saved.getEngagementCode(), saved.getEngagementType(), saved.getClientName(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TaxAdvisoryEngagement acceptEngagement(Long engagementId) {
        TaxAdvisoryEngagement engagement = getById(engagementId);
        if (!"PROPOSAL".equals(engagement.getStatus())) {
            throw new BusinessException("Only PROPOSAL engagements can be accepted; current status: " + engagement.getStatus(),
                    "INVALID_ENGAGEMENT_STATUS");
        }
        engagement.setStatus("IN_PROGRESS");
        engagement.setEngagementStartDate(LocalDate.now());
        TaxAdvisoryEngagement saved = repository.save(engagement);
        log.info("AUDIT: Tax advisory engagement accepted: code={}, actor={}",
                engagement.getEngagementCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TaxAdvisoryEngagement deliverOpinion(Long engagementId, String opinion) {
        TaxAdvisoryEngagement engagement = getById(engagementId);
        // Status validation: only IN_PROGRESS or ENGAGED engagements can receive opinions
        if (!"IN_PROGRESS".equals(engagement.getStatus()) && !"ENGAGED".equals(engagement.getStatus())) {
            throw new BusinessException(
                    "Opinion can only be delivered for IN_PROGRESS or ENGAGED engagements; current status: " + engagement.getStatus(),
                    "INVALID_ENGAGEMENT_STATUS");
        }
        if (!StringUtils.hasText(opinion)) {
            throw new BusinessException("Opinion text is required", "MISSING_OPINION");
        }
        engagement.setOpinion(opinion);
        engagement.setStatus("OPINION_DELIVERED");
        TaxAdvisoryEngagement saved = repository.save(engagement);
        log.info("AUDIT: Tax opinion delivered: code={}, actor={}",
                engagement.getEngagementCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TaxAdvisoryEngagement closeEngagement(Long engagementId) {
        TaxAdvisoryEngagement engagement = getById(engagementId);
        if ("CLOSED".equals(engagement.getStatus())) {
            throw new BusinessException("Engagement is already closed", "ALREADY_CLOSED");
        }
        engagement.setStatus("CLOSED");
        engagement.setEngagementEndDate(LocalDate.now());
        TaxAdvisoryEngagement saved = repository.save(engagement);
        log.info("AUDIT: Tax advisory engagement closed: code={}, actor={}",
                engagement.getEngagementCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<TaxAdvisoryEngagement> getActiveEngagements() {
        return repository.findByStatusIn(List.of("ENGAGED", "IN_PROGRESS"));
    }

    /** Replace findAll+filter with DB query for jurisdiction lookup */
    public List<TaxAdvisoryEngagement> getByJurisdiction(String country) {
        if (!StringUtils.hasText(country)) {
            return List.of();
        }
        // Use repository query instead of findAll+stream filter
        return repository.findByJurisdictionsContaining(country);
    }

    /** Replace findAll+filter with DB query for fee revenue */
    public BigDecimal getFeeRevenue(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BusinessException("Date range is required for fee revenue report", "MISSING_DATE_RANGE");
        }
        BigDecimal revenue = repository.sumAdvisoryFeeByStatusAndDateRange("CLOSED", from, to);
        return revenue != null ? revenue : BigDecimal.ZERO;
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
