package com.cbs.proposition.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.proposition.entity.CustomerProposition;
import com.cbs.proposition.repository.CustomerPropositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PropositionService {

    private final CustomerPropositionRepository propositionRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public CustomerProposition create(CustomerProposition prop) {
        validatePropositionFields(prop);

        // Duplicate code check
        if (prop.getPropositionCode() != null && !prop.getPropositionCode().isBlank()) {
            propositionRepository.findByPropositionCode(prop.getPropositionCode()).ifPresent(existing -> {
                throw new BusinessException(
                        "Proposition code '" + prop.getPropositionCode() + "' already exists.",
                        "DUPLICATE_CODE"
                );
            });
        }

        if (propositionRepository.existsByPropositionNameAndStatus(prop.getPropositionName(), "ACTIVE")) {
            throw new BusinessException(
                    "An active proposition with name '" + prop.getPropositionName() + "' already exists.",
                    "DUPLICATE_PROPOSITION"
            );
        }

        prop.setPropositionCode("PROP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (prop.getStatus() == null || prop.getStatus().isBlank()) {
            prop.setStatus("DRAFT");
        }
        prop.setCreatedAt(Instant.now());
        prop.setUpdatedAt(Instant.now());

        CustomerProposition saved = propositionRepository.save(prop);
        log.info("Proposition created: code={}, name={}, segment={}, by={}",
                saved.getPropositionCode(), saved.getPropositionName(), saved.getTargetSegment(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CustomerProposition activate(String code) {
        CustomerProposition p = getByCode(code);

        if ("ACTIVE".equals(p.getStatus())) {
            throw new BusinessException("Proposition " + code + " is already ACTIVE.", "ALREADY_ACTIVE");
        }
        if (!"DRAFT".equals(p.getStatus()) && !"INACTIVE".equals(p.getStatus())) {
            throw new BusinessException(
                    "Proposition must be in DRAFT or INACTIVE status to activate. Current status: " + p.getStatus(),
                    "INVALID_STATUS"
            );
        }

        // Validate effective dates
        if (p.getEffectiveFrom() != null && p.getEffectiveFrom().isAfter(LocalDate.now())) {
            throw new BusinessException(
                    "Cannot activate proposition before effective date: " + p.getEffectiveFrom(),
                    "NOT_YET_EFFECTIVE"
            );
        }
        if (p.getEffectiveTo() != null && p.getEffectiveTo().isBefore(LocalDate.now())) {
            throw new BusinessException(
                    "Cannot activate proposition after expiry date: " + p.getEffectiveTo(),
                    "ALREADY_EXPIRED"
            );
        }

        p.setStatus("ACTIVE");
        p.setUpdatedAt(Instant.now());
        CustomerProposition saved = propositionRepository.save(p);
        log.info("Proposition activated: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CustomerProposition deactivate(String code) {
        CustomerProposition p = getByCode(code);
        if (!"ACTIVE".equals(p.getStatus())) {
            throw new BusinessException(
                    "Only ACTIVE propositions can be deactivated. Current status: " + p.getStatus(),
                    "INVALID_STATUS"
            );
        }
        p.setStatus("INACTIVE");
        p.setUpdatedAt(Instant.now());
        CustomerProposition saved = propositionRepository.save(p);
        log.info("Proposition deactivated: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CustomerProposition update(String code, CustomerProposition updated) {
        CustomerProposition existing = getByCode(code);
        if ("ACTIVE".equals(existing.getStatus())) {
            throw new BusinessException(
                    "Cannot modify an ACTIVE proposition. Deactivate it first.",
                    "ACTIVE_MODIFICATION"
            );
        }
        if (updated.getPropositionName() != null) existing.setPropositionName(updated.getPropositionName());
        if (updated.getTargetSegment() != null) existing.setTargetSegment(updated.getTargetSegment());
        if (updated.getValueStatement() != null) existing.setValueStatement(updated.getValueStatement());
        if (updated.getIncludedProducts() != null) existing.setIncludedProducts(updated.getIncludedProducts());
        if (updated.getPricingSummary() != null) existing.setPricingSummary(updated.getPricingSummary());
        if (updated.getChannelAvailability() != null) existing.setChannelAvailability(updated.getChannelAvailability());
        if (updated.getEligibilityRules() != null) existing.setEligibilityRules(updated.getEligibilityRules());
        if (updated.getEffectiveFrom() != null) existing.setEffectiveFrom(updated.getEffectiveFrom());
        if (updated.getEffectiveTo() != null) existing.setEffectiveTo(updated.getEffectiveTo());
        existing.setUpdatedAt(Instant.now());

        CustomerProposition saved = propositionRepository.save(existing);
        log.info("Proposition updated: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<CustomerProposition> getActive() {
        return propositionRepository.findByStatusOrderByPropositionNameAsc("ACTIVE");
    }

    public List<CustomerProposition> getBySegment(String segment) {
        if (segment == null || segment.isBlank()) {
            throw new BusinessException("Target segment is required.", "INVALID_SEGMENT");
        }
        return propositionRepository.findByTargetSegmentAndStatus(segment, "ACTIVE");
    }

    public CustomerProposition getByCode(String code) {
        return propositionRepository.findByPropositionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerProposition", "propositionCode", code));
    }

    private void validatePropositionFields(CustomerProposition prop) {
        if (prop.getPropositionName() == null || prop.getPropositionName().isBlank()) {
            throw new BusinessException("Proposition name is required.", "INVALID_NAME");
        }
        if (prop.getPropositionName().length() > 200) {
            throw new BusinessException("Proposition name must not exceed 200 characters.", "NAME_TOO_LONG");
        }
        if (prop.getValueStatement() == null || prop.getValueStatement().isBlank()) {
            throw new BusinessException("Value statement is required.", "MISSING_VALUE_STATEMENT");
        }
        if (prop.getIncludedProducts() == null || prop.getIncludedProducts().isEmpty()) {
            throw new BusinessException("At least one included product is required.", "MISSING_PRODUCTS");
        }
        if (prop.getEffectiveFrom() != null && prop.getEffectiveTo() != null
                && prop.getEffectiveTo().isBefore(prop.getEffectiveFrom())) {
            throw new BusinessException("Effective to date must be after effective from date.", "INVALID_DATE_RANGE");
        }
    }
}
