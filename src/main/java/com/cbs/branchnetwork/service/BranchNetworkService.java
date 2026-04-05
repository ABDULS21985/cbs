package com.cbs.branchnetwork.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.branchnetwork.entity.BranchNetworkPlan;
import com.cbs.branchnetwork.repository.BranchNetworkPlanRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BranchNetworkService {
    private final BranchNetworkPlanRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public BranchNetworkPlan create(BranchNetworkPlan p) {
        // Validation
        if (p.getRegion() == null || p.getRegion().isBlank()) {
            throw new BusinessException("Region is required", "MISSING_REGION");
        }
        if (p.getPlannedStart() == null || p.getPlannedCompletion() == null) {
            throw new BusinessException("Planned start and completion dates are required", "MISSING_DATES");
        }
        if (p.getPlannedStart().isAfter(p.getPlannedCompletion())) {
            throw new BusinessException("Planned start date must be before or equal to completion date", "INVALID_DATE_RANGE");
        }
        if (p.getEstimatedCost() != null && p.getEstimatedCost().signum() < 0) {
            throw new BusinessException("Estimated cost cannot be negative", "NEGATIVE_COST");
        }
        // Duplicate plan detection: same region + same planned start
        List<BranchNetworkPlan> existing = repository.findByRegionOrderByPlannedStartDesc(p.getRegion());
        boolean duplicate = existing.stream().anyMatch(e ->
                !"COMPLETED".equals(e.getStatus()) && !"CANCELLED".equals(e.getStatus())
                && e.getPlannedStart() != null && e.getPlannedStart().equals(p.getPlannedStart()));
        if (duplicate) {
            throw new BusinessException("Duplicate plan: an active plan already exists for region " + p.getRegion()
                    + " starting " + p.getPlannedStart(), "DUPLICATE_PLAN");
        }
        p.setPlanCode("BNP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        p.setStatus("PROPOSED");
        BranchNetworkPlan saved = repository.save(p);
        log.info("AUDIT: Branch network plan created: code={}, region={}, actor={}",
                saved.getPlanCode(), saved.getRegion(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BranchNetworkPlan approve(String code) {
        BranchNetworkPlan p = getByCode(code);
        // Status guard: only PROPOSED plans can be approved
        if (!"PROPOSED".equals(p.getStatus())) {
            throw new BusinessException("Plan " + code + " must be PROPOSED to approve; current status: " + p.getStatus(), "INVALID_STATUS");
        }
        p.setStatus("APPROVED");
        BranchNetworkPlan saved = repository.save(p);
        log.info("AUDIT: Branch network plan approved: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public BranchNetworkPlan complete(String code) {
        BranchNetworkPlan p = getByCode(code);
        // Status guard: only APPROVED plans can be completed
        if (!"APPROVED".equals(p.getStatus())) {
            throw new BusinessException("Plan " + code + " must be APPROVED to complete; current status: " + p.getStatus(), "INVALID_STATUS");
        }
        p.setActualCompletion(LocalDate.now());
        p.setStatus("COMPLETED");
        BranchNetworkPlan saved = repository.save(p);
        log.info("AUDIT: Branch network plan completed: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<BranchNetworkPlan> getByRegion(String region) { return repository.findByRegionOrderByPlannedStartDesc(region); }
    public List<BranchNetworkPlan> getByStatus(String status) { return repository.findByStatusOrderByPlannedStartAsc(status); }
    public BranchNetworkPlan getByCode(String code) { return repository.findByPlanCode(code).orElseThrow(() -> new ResourceNotFoundException("BranchNetworkPlan", "planCode", code)); }
}
