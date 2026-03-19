package com.cbs.salesplan.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.salesplan.entity.SalesPlan;
import com.cbs.salesplan.entity.SalesTarget;
import com.cbs.salesplan.repository.SalesPlanRepository;
import com.cbs.salesplan.repository.SalesTargetRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SalesPlanService {
    private final SalesPlanRepository planRepository;
    private final SalesTargetRepository targetRepository;

    @Transactional
    public SalesPlan createPlan(SalesPlan plan) {
        plan.setPlanCode("SP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        plan.setStatus("DRAFT");
        return planRepository.save(plan);
    }
    @Transactional
    public SalesTarget addTarget(String planCode, SalesTarget target) {
        SalesPlan plan = getPlanByCode(planCode);
        target.setTargetCode("ST-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        target.setPlanId(plan.getId());
        target.setStatus("ACTIVE");
        return targetRepository.save(target);
    }
    @Transactional
    public SalesTarget recordActual(String targetCode, BigDecimal value) {
        SalesTarget t = targetRepository.findByTargetCode(targetCode).orElseThrow(() -> new ResourceNotFoundException("SalesTarget", "targetCode", targetCode));
        t.setActualValue(value);
        t.setAchievementPct(value.divide(t.getTargetValue(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        if (t.getAchievementPct().compareTo(new BigDecimal("100")) >= 0) t.setStatus("ACHIEVED");
        return targetRepository.save(t);
    }
    public List<SalesPlan> getAllPlans() { return planRepository.findAll(); }
    public List<SalesPlan> getByRegion(String region) { return planRepository.findByRegionAndStatusOrderByPeriodStartDesc(region, "ACTIVE"); }
    public List<SalesTarget> getTargetsByOfficer(String officerId) { return targetRepository.findByOfficerIdAndStatusOrderByPeriodStartDesc(officerId, "ACTIVE"); }
    public SalesPlan getPlanByCode(String code) {
        return planRepository.findByPlanCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesPlan", "planCode", code));
    }
}
