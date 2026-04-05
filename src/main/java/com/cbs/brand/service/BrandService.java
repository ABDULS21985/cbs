package com.cbs.brand.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.brand.entity.BrandGuideline;
import com.cbs.brand.repository.BrandGuidelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BrandService {

    private final BrandGuidelineRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public BrandGuideline create(BrandGuideline bg) {
        validateGuidelineFields(bg);

        if (repository.existsByGuidelineNameAndGuidelineType(bg.getGuidelineName(), bg.getGuidelineType())) {
            throw new BusinessException(
                    "A brand guideline with name '" + bg.getGuidelineName() + "' and type '"
                            + bg.getGuidelineType() + "' already exists.",
                    "DUPLICATE_GUIDELINE"
            );
        }

        bg.setGuidelineCode("BG-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        bg.setApprovalStatus("DRAFT");

        BrandGuideline saved = repository.save(bg);
        log.info("Brand guideline created: code={}, type={}, by={}",
                saved.getGuidelineCode(), saved.getGuidelineType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BrandGuideline submitForApproval(String code) {
        BrandGuideline bg = getByCode(code);
        if (!"DRAFT".equals(bg.getApprovalStatus())) {
            throw new BusinessException(
                    "Guideline must be in DRAFT to submit for approval. Current status: " + bg.getApprovalStatus(),
                    "INVALID_STATUS"
            );
        }
        if (bg.getContent() == null || bg.getContent().isEmpty()) {
            throw new BusinessException("Content is required before submitting for approval.", "MISSING_CONTENT");
        }
        bg.setApprovalStatus("PENDING_APPROVAL");
        BrandGuideline saved = repository.save(bg);
        log.info("Brand guideline submitted for approval: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BrandGuideline approve(String code) {
        BrandGuideline bg = getByCode(code);
        if (!"PENDING_APPROVAL".equals(bg.getApprovalStatus())) {
            throw new BusinessException(
                    "Guideline must be PENDING_APPROVAL to approve. Current status: " + bg.getApprovalStatus(),
                    "INVALID_STATUS"
            );
        }
        String approver = currentActorProvider.getCurrentActor();
        bg.setApprovalStatus("APPROVED");
        bg.setApprovedBy(approver);
        BrandGuideline saved = repository.save(bg);
        log.info("Brand guideline approved: code={}, by={}", code, approver);
        return saved;
    }

    @Transactional
    public BrandGuideline activate(String code) {
        BrandGuideline bg = getByCode(code);
        if ("ACTIVE".equals(bg.getApprovalStatus())) {
            throw new BusinessException("Guideline " + code + " is already ACTIVE.", "ALREADY_ACTIVE");
        }
        if (!"APPROVED".equals(bg.getApprovalStatus())) {
            throw new BusinessException(
                    "Guideline must be APPROVED before activation. Current status: " + bg.getApprovalStatus(),
                    "INVALID_STATUS"
            );
        }

        // Check effective dates
        if (bg.getEffectiveFrom() != null && bg.getEffectiveFrom().isAfter(LocalDate.now())) {
            throw new BusinessException(
                    "Cannot activate before effective date: " + bg.getEffectiveFrom(),
                    "NOT_YET_EFFECTIVE"
            );
        }

        // Deactivate previous active versions of the same guideline name and type
        List<BrandGuideline> previousActive = repository
                .findByGuidelineNameAndGuidelineTypeAndApprovalStatus(
                        bg.getGuidelineName(), bg.getGuidelineType(), "ACTIVE");
        for (BrandGuideline prev : previousActive) {
            prev.setApprovalStatus("SUPERSEDED");
            repository.save(prev);
            log.info("Previous guideline version superseded: code={}", prev.getGuidelineCode());
        }

        bg.setApprovalStatus("ACTIVE");
        BrandGuideline saved = repository.save(bg);
        log.info("Brand guideline activated: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BrandGuideline deactivate(String code) {
        BrandGuideline bg = getByCode(code);
        if (!"ACTIVE".equals(bg.getApprovalStatus())) {
            throw new BusinessException(
                    "Only ACTIVE guidelines can be deactivated. Current status: " + bg.getApprovalStatus(),
                    "INVALID_STATUS"
            );
        }
        bg.setApprovalStatus("INACTIVE");
        BrandGuideline saved = repository.save(bg);
        log.info("Brand guideline deactivated: code={}, by={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public int expireOverdueGuidelines() {
        List<BrandGuideline> activeGuidelines = repository.findByApprovalStatusOrderByGuidelineNameAsc("ACTIVE");
        int expiredCount = 0;
        LocalDate today = LocalDate.now();
        for (BrandGuideline bg : activeGuidelines) {
            if (bg.getEffectiveTo() != null && bg.getEffectiveTo().isBefore(today)) {
                bg.setApprovalStatus("EXPIRED");
                repository.save(bg);
                expiredCount++;
                log.info("Brand guideline expired: code={}, effectiveTo={}", bg.getGuidelineCode(), bg.getEffectiveTo());
            }
        }
        if (expiredCount > 0) {
            log.info("Expired {} overdue brand guidelines", expiredCount);
        }
        return expiredCount;
    }

    public List<BrandGuideline> getByType(String type) {
        if (type == null || type.isBlank()) {
            throw new BusinessException("Guideline type is required.", "INVALID_TYPE");
        }
        return repository.findByGuidelineTypeAndApprovalStatusOrderByGuidelineNameAsc(type, "ACTIVE");
    }

    public List<BrandGuideline> getActive() {
        return repository.findByApprovalStatusOrderByGuidelineNameAsc("ACTIVE");
    }

    public BrandGuideline getByCode(String code) {
        return repository.findByGuidelineCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("BrandGuideline", "guidelineCode", code));
    }

    private void validateGuidelineFields(BrandGuideline bg) {
        if (bg.getGuidelineName() == null || bg.getGuidelineName().isBlank()) {
            throw new BusinessException("Guideline name is required.", "INVALID_NAME");
        }
        if (bg.getGuidelineName().length() > 200) {
            throw new BusinessException("Guideline name must not exceed 200 characters.", "NAME_TOO_LONG");
        }
        if (bg.getGuidelineType() == null || bg.getGuidelineType().isBlank()) {
            throw new BusinessException("Guideline type is required.", "INVALID_TYPE");
        }
        if (bg.getContent() == null || bg.getContent().isEmpty()) {
            throw new BusinessException("Guideline content is required.", "MISSING_CONTENT");
        }
        if (bg.getEffectiveFrom() == null) {
            throw new BusinessException("Effective from date is required.", "MISSING_EFFECTIVE_DATE");
        }
        if (bg.getEffectiveTo() != null && bg.getEffectiveTo().isBefore(bg.getEffectiveFrom())) {
            throw new BusinessException("Effective to date must be after effective from date.", "INVALID_DATE_RANGE");
        }
    }
}
