package com.cbs.bizdev.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.bizdev.entity.BizDevInitiative;
import com.cbs.bizdev.repository.BizDevInitiativeRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BizDevService {
    private final BizDevInitiativeRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public BizDevInitiative create(BizDevInitiative init) {
        if (init.getInitiativeName() == null || init.getInitiativeName().isBlank()) {
            throw new BusinessException("Initiative name is required", "MISSING_NAME");
        }
        init.setInitiativeCode("BDI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        init.setStatus("PROPOSED");
        BizDevInitiative saved = repository.save(init);
        log.info("AUDIT: BizDev initiative created: code={}, name={}, actor={}",
                saved.getInitiativeCode(), saved.getInitiativeName(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BizDevInitiative approve(String code) {
        BizDevInitiative i = getByCode(code);
        // Status guard
        if (!"PROPOSED".equals(i.getStatus())) {
            throw new BusinessException("Initiative " + code + " must be PROPOSED to approve; current: " + i.getStatus(), "INVALID_STATUS");
        }
        // Authorization check: approver must not be the creator
        String actor = currentActorProvider.getCurrentActor();
        if (actor.equals(i.getCreatedBy())) {
            throw new BusinessException("Cannot approve your own initiative", "SELF_APPROVAL_NOT_ALLOWED");
        }
        i.setStatus("APPROVED");
        BizDevInitiative saved = repository.save(i);
        log.info("AUDIT: BizDev initiative approved: code={}, actor={}", code, actor);
        return saved;
    }

    @Transactional
    public BizDevInitiative updateProgress(String code, BigDecimal progressPct, Map<String, Object> kpis) {
        BizDevInitiative i = getByCode(code);
        // Validate progressPct range (0-100)
        if (progressPct != null) {
            if (progressPct.compareTo(BigDecimal.ZERO) < 0 || progressPct.compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException("Progress percentage must be between 0 and 100", "INVALID_PROGRESS_PCT");
            }
        }
        i.setProgressPct(progressPct);
        i.setKpis(kpis);
        if (!"IN_PROGRESS".equals(i.getStatus())) { i.setStatus("IN_PROGRESS"); i.setActualStartDate(LocalDate.now()); }
        BizDevInitiative saved = repository.save(i);
        log.info("AUDIT: BizDev initiative progress updated: code={}, progress={}%, actor={}",
                code, progressPct, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BizDevInitiative complete(String code) {
        BizDevInitiative i = getByCode(code);
        if (!"IN_PROGRESS".equals(i.getStatus()) && !"APPROVED".equals(i.getStatus())) {
            throw new BusinessException("Initiative " + code + " must be IN_PROGRESS or APPROVED to complete; current: " + i.getStatus(), "INVALID_STATUS");
        }
        i.setStatus("COMPLETED");
        i.setActualEndDate(LocalDate.now());
        i.setProgressPct(new BigDecimal("100"));
        BizDevInitiative saved = repository.save(i);
        log.info("AUDIT: BizDev initiative completed: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<BizDevInitiative> getByStatus(String status) { return repository.findByStatusOrderByPlannedStartDateAsc(status); }
    public List<BizDevInitiative> getActive() { return repository.findByStatusInOrderByPlannedStartDateAsc(List.of("APPROVED", "IN_PROGRESS")); }
    public BizDevInitiative getByCode(String code) {
        return repository.findByInitiativeCode(code).orElseThrow(() -> new ResourceNotFoundException("BizDevInitiative", "initiativeCode", code));
    }
}
