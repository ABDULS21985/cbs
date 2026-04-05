package com.cbs.salesplan.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.salesplan.entity.SalesPlan;
import com.cbs.salesplan.entity.SalesTarget;
import com.cbs.salesplan.repository.SalesPlanRepository;
import com.cbs.salesplan.repository.SalesTargetRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.math.BigDecimal; import java.math.RoundingMode; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SalesPlanService {
    private final SalesPlanRepository planRepository;
    private final SalesTargetRepository targetRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public SalesPlan createPlan(SalesPlan plan) {
        // Validate dates
        if (plan.getPeriodStart() == null || plan.getPeriodEnd() == null) {
            throw new BusinessException("Period start and end dates are required", "MISSING_PERIOD_DATES");
        }
        if (plan.getPeriodEnd().isBefore(plan.getPeriodStart())) {
            throw new BusinessException("Period end date must be after start date", "INVALID_PERIOD_DATES");
        }
        if (!StringUtils.hasText(plan.getRegion())) {
            throw new BusinessException("Region is required", "MISSING_REGION");
        }
        plan.setPlanCode("SP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        plan.setStatus("DRAFT");
        SalesPlan saved = planRepository.save(plan);
        log.info("AUDIT: Sales plan created: code={}, region={}, period={} to {}, actor={}",
                saved.getPlanCode(), saved.getRegion(), saved.getPeriodStart(), saved.getPeriodEnd(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesPlan activatePlan(String planCode) {
        SalesPlan plan = getPlanByCode(planCode);
        if (!"DRAFT".equals(plan.getStatus())) {
            throw new BusinessException("Only DRAFT plans can be activated", "INVALID_PLAN_STATUS");
        }
        plan.setStatus("ACTIVE");
        SalesPlan saved = planRepository.save(plan);
        log.info("AUDIT: Sales plan activated: code={}, actor={}", planCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesTarget addTarget(String planCode, SalesTarget target) {
        SalesPlan plan = getPlanByCode(planCode);
        if (target.getTargetValue() == null || target.getTargetValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Target value must be positive", "INVALID_TARGET_VALUE");
        }
        if (!StringUtils.hasText(target.getOfficerId())) {
            throw new BusinessException("Officer ID is required", "MISSING_OFFICER_ID");
        }

        // Duplicate target detection: same officer + product code in same plan
        targetRepository.findByPlanIdAndOfficerIdAndProductCode(
                plan.getId(), target.getOfficerId(), target.getProductCode()
        ).ifPresent(existing -> {
            throw new BusinessException(
                    "Duplicate target for officer " + target.getOfficerId()
                            + " with product " + target.getProductCode()
                            + " in plan " + planCode + " (target: " + existing.getTargetCode() + ")",
                    "DUPLICATE_TARGET");
        });

        target.setTargetCode("ST-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        target.setPlanId(plan.getId());
        target.setStatus("ACTIVE");
        target.setActualValue(BigDecimal.ZERO);
        target.setAchievementPct(BigDecimal.ZERO);
        SalesTarget saved = targetRepository.save(target);
        log.info("AUDIT: Sales target added: code={}, planCode={}, officer={}, target={}, actor={}",
                saved.getTargetCode(), planCode, target.getOfficerId(), target.getTargetValue(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesTarget recordActual(String targetCode, BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Actual value must be non-negative", "INVALID_ACTUAL_VALUE");
        }
        SalesTarget t = targetRepository.findByTargetCode(targetCode).orElseThrow(() -> new ResourceNotFoundException("SalesTarget", "targetCode", targetCode));

        // Guard against divide-by-zero
        if (t.getTargetValue() == null || t.getTargetValue().compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessException("Target value is zero or null; cannot compute achievement", "ZERO_TARGET_VALUE");
        }

        t.setActualValue(value);
        t.setAchievementPct(value.divide(t.getTargetValue(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));

        // Handle over-achievement and status
        if (t.getAchievementPct().compareTo(new BigDecimal("100")) >= 0) {
            t.setStatus("ACHIEVED");
        }
        if (t.getAchievementPct().compareTo(new BigDecimal("150")) >= 0) {
            t.setStatus("OVER_ACHIEVED");
        }

        SalesTarget saved = targetRepository.save(t);
        log.info("AUDIT: Actual recorded: targetCode={}, actual={}, achievement={}%, actor={}",
                targetCode, value, t.getAchievementPct(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<SalesPlan> getAllPlans() { return planRepository.findAll(); }
    public List<SalesPlan> getByRegion(String region) { return planRepository.findByRegionAndStatusOrderByPeriodStartDesc(region, "ACTIVE"); }
    public List<SalesTarget> getTargetsByOfficer(String officerId) { return targetRepository.findByOfficerIdAndStatusOrderByPeriodStartDesc(officerId, "ACTIVE"); }
    public SalesPlan getPlanByCode(String code) {
        return planRepository.findByPlanCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesPlan", "planCode", code));
    }
}
