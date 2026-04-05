package com.cbs.publicoffering.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.publicoffering.entity.PublicOfferingDetail;
import com.cbs.publicoffering.repository.PublicOfferingDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PublicOfferingService {

    private final PublicOfferingDetailRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public PublicOfferingDetail createOffering(Long dealId, PublicOfferingDetail detail) {
        if (dealId == null) {
            throw new BusinessException("dealId is required", "MISSING_DEAL_ID");
        }
        if (detail.getOfferingType() == null || detail.getOfferingType().isBlank()) {
            throw new BusinessException("offeringType is required", "MISSING_OFFERING_TYPE");
        }
        if (detail.getSharesOffered() == null || detail.getSharesOffered() <= 0) {
            throw new BusinessException("sharesOffered must be positive", "INVALID_SHARES");
        }
        detail.setDealId(dealId);
        detail.setStatus("PLANNING");
        PublicOfferingDetail saved = repository.save(detail);
        log.info("AUDIT: Public offering created by {}: id={}, dealId={}, type={}, shares={}",
                currentActorProvider.getCurrentActor(), saved.getId(), dealId, saved.getOfferingType(), saved.getSharesOffered());
        return saved;
    }

    @Transactional
    public PublicOfferingDetail submitToRegulator(Long id) {
        PublicOfferingDetail d = getById(id);
        // Status guard: must be PLANNING
        if (!"PLANNING".equals(d.getStatus())) {
            throw new BusinessException("Offering must be in PLANNING status to submit to regulator; current: " + d.getStatus(), "INVALID_STATE");
        }
        d.setProspectusSubmittedDate(LocalDate.now());
        d.setStatus("SEC_REVIEW");
        log.info("AUDIT: Public offering submitted to regulator by {}: id={}", currentActorProvider.getCurrentActor(), id);
        return repository.save(d);
    }

    @Transactional
    public PublicOfferingDetail openApplications(Long id) {
        PublicOfferingDetail d = getById(id);
        // Status guard: must be SEC_REVIEW or APPROVED
        if (!"SEC_REVIEW".equals(d.getStatus()) && !"APPROVED".equals(d.getStatus())) {
            throw new BusinessException("Offering must be in SEC_REVIEW or APPROVED status to open applications; current: " + d.getStatus(), "INVALID_STATE");
        }
        d.setApplicationOpenDate(LocalDate.now());
        d.setStatus("OPEN");
        log.info("AUDIT: Public offering applications opened by {}: id={}", currentActorProvider.getCurrentActor(), id);
        return repository.save(d);
    }

    @Transactional
    public PublicOfferingDetail closeApplications(Long id) {
        PublicOfferingDetail d = getById(id);
        // Status guard: must be OPEN
        if (!"OPEN".equals(d.getStatus())) {
            throw new BusinessException("Offering must be OPEN to close applications; current: " + d.getStatus(), "INVALID_STATE");
        }
        if (d.getApplicationCloseDate() != null && LocalDate.now().isAfter(d.getApplicationCloseDate())) {
            throw new BusinessException("Applications already closed on " + d.getApplicationCloseDate(), "ALREADY_CLOSED");
        }
        d.setApplicationCloseDate(LocalDate.now());
        d.setStatus("CLOSED");
        log.info("AUDIT: Public offering applications closed by {}: id={}", currentActorProvider.getCurrentActor(), id);
        return repository.save(d);
    }

    @Transactional
    public PublicOfferingDetail recordAllotment(Long id, String basisOfAllotment) {
        PublicOfferingDetail d = getById(id);
        // Status guard: must be CLOSED
        if (!"CLOSED".equals(d.getStatus())) {
            throw new BusinessException("Offering must be CLOSED to record allotment; current: " + d.getStatus(), "INVALID_STATE");
        }
        d.setBasisOfAllotment(basisOfAllotment);
        d.setStatus("ALLOTTED");
        log.info("AUDIT: Public offering allotment recorded by {}: id={}, basis={}",
                currentActorProvider.getCurrentActor(), id, basisOfAllotment);
        return repository.save(d);
    }

    public PublicOfferingDetail getOfferingStatus(Long id) {
        return getById(id);
    }

    public PublicOfferingDetail getByDealId(Long dealId) {
        return repository.findByDealId(dealId)
                .orElseThrow(() -> new ResourceNotFoundException("PublicOfferingDetail", "dealId", dealId));
    }

    public List<PublicOfferingDetail> getPipelineReport() {
        return repository.findByStatusInOrderByApplicationOpenDateDesc(List.of("PLANNING", "SEC_REVIEW", "APPROVED", "OPEN"));
    }

    private PublicOfferingDetail getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PublicOfferingDetail", "id", id));
    }
}
