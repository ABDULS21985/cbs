package com.cbs.promo.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.promo.entity.PromotionalEvent;
import com.cbs.promo.repository.PromotionalEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PromoService {

    private final PromotionalEventRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public PromotionalEvent create(PromotionalEvent event) {
        validateEventFields(event);

        if (event.getPromoCode() != null && !event.getPromoCode().isBlank()) {
            if (repository.existsByPromoCodeAndStatus(event.getPromoCode(), "ACTIVE")) {
                throw new BusinessException(
                        "An active promotion with promo code '" + event.getPromoCode() + "' already exists.",
                        "DUPLICATE_PROMO_CODE"
                );
            }
        }

        event.setEventCode("PRE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        event.setStatus("PLANNED");
        event.setCurrentRedemptions(0);
        if (event.getSpentAmount() == null) {
            event.setSpentAmount(BigDecimal.ZERO);
        }
        if (event.getLeadsGenerated() == null) {
            event.setLeadsGenerated(0);
        }
        if (event.getConversions() == null) {
            event.setConversions(0);
        }

        PromotionalEvent saved = repository.save(event);
        log.info("Promotional event created: code={}, type={}, startDate={}, by={}",
                saved.getEventCode(), saved.getEventType(), saved.getStartDate(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public PromotionalEvent activate(String code) {
        PromotionalEvent e = getByCode(code);

        if ("ACTIVE".equals(e.getStatus())) {
            throw new BusinessException("Promotion " + code + " is already ACTIVE.", "ALREADY_ACTIVE");
        }
        if (!"PLANNED".equals(e.getStatus())) {
            throw new BusinessException(
                    "Promotion must be in PLANNED status to activate. Current status: " + e.getStatus(),
                    "INVALID_STATUS"
            );
        }

        // Validate active period
        LocalDate today = LocalDate.now();
        if (e.getStartDate() != null && e.getStartDate().isAfter(today)) {
            throw new BusinessException(
                    "Cannot activate promotion before start date: " + e.getStartDate(),
                    "NOT_YET_STARTED"
            );
        }
        if (e.getEndDate() != null && e.getEndDate().isBefore(today)) {
            throw new BusinessException(
                    "Cannot activate promotion after end date: " + e.getEndDate(),
                    "ALREADY_EXPIRED"
            );
        }

        e.setStatus("ACTIVE");
        PromotionalEvent saved = repository.save(e);
        log.info("Promotion activated: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public PromotionalEvent recordRedemption(String code) {
        PromotionalEvent e = getByCode(code);

        if (!"ACTIVE".equals(e.getStatus())) {
            throw new BusinessException("Promotion " + code + " is not ACTIVE. Cannot record redemption.", "NOT_ACTIVE");
        }

        // Check expiry
        if (e.getEndDate() != null && e.getEndDate().isBefore(LocalDate.now())) {
            e.setStatus("EXPIRED");
            repository.save(e);
            throw new BusinessException("Promotion " + code + " has expired on " + e.getEndDate(), "PROMO_EXPIRED");
        }

        // Check max redemptions with optimistic locking approach
        if (e.getMaxRedemptions() != null && e.getCurrentRedemptions() >= e.getMaxRedemptions()) {
            e.setStatus("EXHAUSTED");
            repository.save(e);
            throw new BusinessException("Max redemptions (" + e.getMaxRedemptions() + ") reached for " + code, "MAX_REDEMPTIONS");
        }

        e.setCurrentRedemptions(e.getCurrentRedemptions() + 1);

        // Check if this redemption exhausts the promotion
        if (e.getMaxRedemptions() != null && e.getCurrentRedemptions() >= e.getMaxRedemptions()) {
            e.setStatus("EXHAUSTED");
            log.info("Promotion exhausted after redemption: code={}, total={}", code, e.getCurrentRedemptions());
        }

        PromotionalEvent saved = repository.save(e);
        log.info("Redemption recorded: code={}, count={}/{}, by={}",
                code, saved.getCurrentRedemptions(),
                saved.getMaxRedemptions() != null ? saved.getMaxRedemptions() : "unlimited",
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public PromotionalEvent cancel(String code) {
        PromotionalEvent e = getByCode(code);
        if ("CANCELLED".equals(e.getStatus())) {
            throw new BusinessException("Promotion " + code + " is already cancelled.", "ALREADY_CANCELLED");
        }
        if ("EXPIRED".equals(e.getStatus()) || "EXHAUSTED".equals(e.getStatus())) {
            throw new BusinessException(
                    "Cannot cancel a promotion that is " + e.getStatus() + ".",
                    "INVALID_STATUS"
            );
        }
        e.setStatus("CANCELLED");
        PromotionalEvent saved = repository.save(e);
        log.info("Promotion cancelled: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public int expireOverduePromotions() {
        List<PromotionalEvent> activePromos = repository.findByStatusOrderByStartDateAsc("ACTIVE");
        LocalDate today = LocalDate.now();
        int expiredCount = 0;
        for (PromotionalEvent promo : activePromos) {
            if (promo.getEndDate() != null && promo.getEndDate().isBefore(today)) {
                promo.setStatus("EXPIRED");
                repository.save(promo);
                expiredCount++;
                log.info("Promotion auto-expired: code={}, endDate={}", promo.getEventCode(), promo.getEndDate());
            }
        }
        if (expiredCount > 0) {
            log.info("Expired {} overdue promotions", expiredCount);
        }
        return expiredCount;
    }

    public List<PromotionalEvent> getActive() {
        return repository.findByStatusOrderByStartDateAsc("ACTIVE");
    }

    public List<PromotionalEvent> getByType(String type) {
        if (type == null || type.isBlank()) {
            throw new BusinessException("Event type is required.", "INVALID_TYPE");
        }
        return repository.findByEventTypeAndStatusOrderByStartDateAsc(type, "ACTIVE");
    }

    public PromotionalEvent getByCode(String code) {
        return repository.findByEventCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("PromotionalEvent", "eventCode", code));
    }

    private void validateEventFields(PromotionalEvent event) {
        if (event.getEventName() == null || event.getEventName().isBlank()) {
            throw new BusinessException("Event name is required.", "INVALID_NAME");
        }
        if (event.getEventName().length() > 200) {
            throw new BusinessException("Event name must not exceed 200 characters.", "NAME_TOO_LONG");
        }
        if (event.getEventType() == null || event.getEventType().isBlank()) {
            throw new BusinessException("Event type is required.", "INVALID_TYPE");
        }
        if (event.getStartDate() == null) {
            throw new BusinessException("Start date is required.", "MISSING_START_DATE");
        }
        if (event.getEndDate() != null && event.getEndDate().isBefore(event.getStartDate())) {
            throw new BusinessException("End date must be after start date.", "INVALID_DATE_RANGE");
        }
        if (event.getMaxRedemptions() != null && event.getMaxRedemptions() <= 0) {
            throw new BusinessException("Max redemptions must be a positive number.", "INVALID_MAX_REDEMPTIONS");
        }
        if (event.getBudgetAmount() != null && event.getBudgetAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Budget amount cannot be negative.", "INVALID_BUDGET");
        }
        if (event.getDiscountValue() != null && event.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Discount value must be positive.", "INVALID_DISCOUNT");
        }
    }
}
