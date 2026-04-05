package com.cbs.econcapital.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.econcapital.entity.EconomicCapital;
import com.cbs.econcapital.repository.EconomicCapitalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EconomicCapitalService {

    private static final List<String> VALID_RISK_TYPES = List.of(
            "CREDIT", "MARKET", "OPERATIONAL", "LIQUIDITY", "INTEREST_RATE", "FX", "AGGREGATE");

    private final EconomicCapitalRepository capitalRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Calculate Economic Capital ──────────────────────────────────────────

    @Transactional
    public EconomicCapital calculate(EconomicCapital ec) {
        // Validation
        if (ec.getCalcDate() == null) {
            throw new BusinessException("Calculation date is required", "MISSING_CALC_DATE");
        }
        if (!StringUtils.hasText(ec.getRiskType())) {
            throw new BusinessException("Risk type is required", "MISSING_RISK_TYPE");
        }
        if (!VALID_RISK_TYPES.contains(ec.getRiskType())) {
            throw new BusinessException("Invalid risk type: " + ec.getRiskType() + ". Valid: " + VALID_RISK_TYPES,
                    "INVALID_RISK_TYPE");
        }
        if (ec.getEconomicCapital() == null || ec.getEconomicCapital().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Economic capital amount must be non-negative", "INVALID_ECONOMIC_CAPITAL");
        }

        // Compute surplus/deficit
        if (ec.getAvailableCapital() != null) {
            ec.setCapitalSurplusDeficit(ec.getAvailableCapital().subtract(ec.getEconomicCapital()));
        }

        // Compute RAROC (Risk-Adjusted Return on Capital)
        if (ec.getAllocatedCapital() != null && ec.getAllocatedCapital().signum() > 0 && ec.getUnexpectedLoss() != null) {
            ec.setRarocPct(ec.getUnexpectedLoss()
                    .divide(ec.getAllocatedCapital(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
        }

        // Include stress add-on in total if provided
        if (ec.getStressCapitalAddOn() != null && ec.getStressCapitalAddOn().compareTo(BigDecimal.ZERO) > 0) {
            // Economic capital inclusive of stress is the base economic capital + stress add-on
            // (stored separately; total can be computed by callers)
            log.info("Stress capital add-on applied: base={}, stressAddOn={}, total={}",
                    ec.getEconomicCapital(), ec.getStressCapitalAddOn(),
                    ec.getEconomicCapital().add(ec.getStressCapitalAddOn()));
        }

        if (ec.getCreatedAt() == null) {
            ec.setCreatedAt(Instant.now());
        }

        EconomicCapital saved = capitalRepository.save(ec);
        log.info("Economic capital calculated: date={}, type={}, ecap={}, surplus={}, raroc={}, bu={}, actor={}",
                ec.getCalcDate(), ec.getRiskType(), ec.getEconomicCapital(),
                ec.getCapitalSurplusDeficit(), ec.getRarocPct(), ec.getBusinessUnit(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Aggregate Across Risk Types ─────────────────────────────────────────

    @Transactional
    public EconomicCapital calculateAggregate(LocalDate calcDate, String businessUnit) {
        List<EconomicCapital> components;
        if (StringUtils.hasText(businessUnit)) {
            components = capitalRepository.findByCalcDateAndBusinessUnitOrderByRiskTypeAsc(calcDate, businessUnit);
        } else {
            components = capitalRepository.findByCalcDateOrderByRiskTypeAsc(calcDate);
        }

        // Filter out any existing AGGREGATE entries to avoid double-counting
        List<EconomicCapital> riskComponents = components.stream()
                .filter(c -> !"AGGREGATE".equals(c.getRiskType()))
                .toList();

        if (riskComponents.isEmpty()) {
            throw new BusinessException(
                    "No risk component calculations found for date " + calcDate, "NO_COMPONENTS");
        }

        BigDecimal totalEconomicCapital = BigDecimal.ZERO;
        BigDecimal totalExpectedLoss = BigDecimal.ZERO;
        BigDecimal totalUnexpectedLoss = BigDecimal.ZERO;
        BigDecimal totalStressAddOn = BigDecimal.ZERO;
        BigDecimal totalAllocated = BigDecimal.ZERO;
        BigDecimal totalAvailable = BigDecimal.ZERO;
        BigDecimal totalRegulatory = BigDecimal.ZERO;

        for (EconomicCapital c : riskComponents) {
            totalEconomicCapital = totalEconomicCapital.add(safeZero(c.getEconomicCapital()));
            totalExpectedLoss = totalExpectedLoss.add(safeZero(c.getExpectedLoss()));
            totalUnexpectedLoss = totalUnexpectedLoss.add(safeZero(c.getUnexpectedLoss()));
            totalStressAddOn = totalStressAddOn.add(safeZero(c.getStressCapitalAddOn()));
            totalAllocated = totalAllocated.add(safeZero(c.getAllocatedCapital()));
            if (c.getAvailableCapital() != null) totalAvailable = c.getAvailableCapital(); // Use latest
            if (c.getRegulatoryCapital() != null) totalRegulatory = totalRegulatory.add(c.getRegulatoryCapital());
        }

        // Apply diversification benefit (simple correlation-based reduction ~10%)
        BigDecimal diversificationBenefit = totalEconomicCapital.multiply(new BigDecimal("0.10"));
        BigDecimal diversifiedCapital = totalEconomicCapital.subtract(diversificationBenefit);

        EconomicCapital aggregate = EconomicCapital.builder()
                .calcDate(calcDate)
                .riskType("AGGREGATE")
                .businessUnit(businessUnit)
                .economicCapital(diversifiedCapital)
                .expectedLoss(totalExpectedLoss)
                .unexpectedLoss(totalUnexpectedLoss)
                .stressCapitalAddOn(totalStressAddOn)
                .allocatedCapital(totalAllocated)
                .availableCapital(totalAvailable)
                .regulatoryCapital(totalRegulatory)
                .confidenceLevel(new BigDecimal("99.90"))
                .timeHorizonDays(365)
                .createdAt(Instant.now())
                .build();

        return calculate(aggregate);
    }

    // ── Stress Scenario Analysis ────────────────────────────────────────────

    public Map<String, Object> runStressScenario(LocalDate calcDate, String scenarioName, BigDecimal shockPct) {
        if (shockPct == null || shockPct.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Shock percentage must be greater than zero", "INVALID_SHOCK_PCT");
        }

        List<EconomicCapital> baseCalcs = capitalRepository.findByCalcDateOrderByRiskTypeAsc(calcDate);
        if (baseCalcs.isEmpty()) {
            throw new BusinessException("No base calculations found for date " + calcDate, "NO_BASE_CALCULATIONS");
        }

        BigDecimal shockMultiplier = BigDecimal.ONE.add(shockPct.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        List<Map<String, Object>> stressedComponents = new ArrayList<>();
        BigDecimal totalBaseCapital = BigDecimal.ZERO;
        BigDecimal totalStressedCapital = BigDecimal.ZERO;

        for (EconomicCapital base : baseCalcs) {
            BigDecimal stressed = base.getEconomicCapital().multiply(shockMultiplier).setScale(2, RoundingMode.HALF_UP);
            BigDecimal additionalRequired = stressed.subtract(base.getEconomicCapital());

            Map<String, Object> component = new LinkedHashMap<>();
            component.put("riskType", base.getRiskType());
            component.put("baseCapital", base.getEconomicCapital());
            component.put("stressedCapital", stressed);
            component.put("additionalRequired", additionalRequired);
            component.put("businessUnit", base.getBusinessUnit());
            stressedComponents.add(component);

            totalBaseCapital = totalBaseCapital.add(base.getEconomicCapital());
            totalStressedCapital = totalStressedCapital.add(stressed);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("scenario", scenarioName);
        result.put("calcDate", calcDate.toString());
        result.put("shockPct", shockPct);
        result.put("totalBaseCapital", totalBaseCapital);
        result.put("totalStressedCapital", totalStressedCapital);
        result.put("additionalCapitalRequired", totalStressedCapital.subtract(totalBaseCapital));
        result.put("components", stressedComponents);
        result.put("runBy", currentActorProvider.getCurrentActor());
        result.put("runAt", Instant.now().toString());

        log.info("Stress scenario completed: scenario={}, shock={}%, baseCapital={}, stressedCapital={}, actor={}",
                scenarioName, shockPct, totalBaseCapital, totalStressedCapital,
                currentActorProvider.getCurrentActor());
        return result;
    }

    // ── Regulatory Capital Comparison ────────────────────────────────────────

    public Map<String, Object> compareToRegulatoryCapital(LocalDate calcDate) {
        List<EconomicCapital> calcs = capitalRepository.findByCalcDateOrderByRiskTypeAsc(calcDate);
        if (calcs.isEmpty()) {
            throw new BusinessException("No calculations found for date " + calcDate, "NO_CALCULATIONS");
        }

        List<Map<String, Object>> comparisons = new ArrayList<>();
        BigDecimal totalEconomic = BigDecimal.ZERO;
        BigDecimal totalRegulatory = BigDecimal.ZERO;

        for (EconomicCapital ec : calcs) {
            Map<String, Object> comp = new LinkedHashMap<>();
            comp.put("riskType", ec.getRiskType());
            comp.put("economicCapital", ec.getEconomicCapital());
            comp.put("regulatoryCapital", ec.getRegulatoryCapital());
            if (ec.getRegulatoryCapital() != null && ec.getRegulatoryCapital().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal ratio = ec.getEconomicCapital()
                        .divide(ec.getRegulatoryCapital(), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"));
                comp.put("economicToRegulatoryPct", ratio);
                comp.put("bindingConstraint", ratio.compareTo(new BigDecimal("100")) > 0 ? "ECONOMIC" : "REGULATORY");
                totalRegulatory = totalRegulatory.add(ec.getRegulatoryCapital());
            }
            totalEconomic = totalEconomic.add(safeZero(ec.getEconomicCapital()));
            comparisons.add(comp);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("calcDate", calcDate.toString());
        result.put("totalEconomicCapital", totalEconomic);
        result.put("totalRegulatoryCapital", totalRegulatory);
        result.put("overallBindingConstraint",
                totalEconomic.compareTo(totalRegulatory) > 0 ? "ECONOMIC" : "REGULATORY");
        result.put("components", comparisons);
        return result;
    }

    // ── Capital Allocation Optimization ─────────────────────────────────────

    public Map<String, Object> optimizeAllocation(LocalDate calcDate, BigDecimal totalAvailableCapital) {
        if (totalAvailableCapital == null || totalAvailableCapital.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Total available capital must be greater than zero", "INVALID_AVAILABLE_CAPITAL");
        }

        List<EconomicCapital> calcs = capitalRepository.findByCalcDateOrderByRiskTypeAsc(calcDate);
        List<EconomicCapital> components = calcs.stream()
                .filter(c -> !"AGGREGATE".equals(c.getRiskType()))
                .toList();

        if (components.isEmpty()) {
            throw new BusinessException("No risk components found for date " + calcDate, "NO_COMPONENTS");
        }

        // Allocate capital proportionally to economic capital requirements
        BigDecimal totalRequired = components.stream()
                .map(c -> safeZero(c.getEconomicCapital()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> allocations = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;

        for (EconomicCapital comp : components) {
            BigDecimal weight = totalRequired.compareTo(BigDecimal.ZERO) > 0
                    ? comp.getEconomicCapital().divide(totalRequired, 6, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal alloc = totalAvailableCapital.multiply(weight).setScale(2, RoundingMode.HALF_UP);

            BigDecimal excess = alloc.subtract(comp.getEconomicCapital());

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("riskType", comp.getRiskType());
            entry.put("businessUnit", comp.getBusinessUnit());
            entry.put("economicCapitalRequired", comp.getEconomicCapital());
            entry.put("allocationWeight", weight.multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP));
            entry.put("allocatedCapital", alloc);
            entry.put("excessDeficit", excess);
            allocations.add(entry);
            allocated = allocated.add(alloc);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("calcDate", calcDate.toString());
        result.put("totalAvailableCapital", totalAvailableCapital);
        result.put("totalRequired", totalRequired);
        result.put("totalAllocated", allocated);
        result.put("unallocated", totalAvailableCapital.subtract(allocated));
        result.put("allocations", allocations);
        result.put("optimizedBy", currentActorProvider.getCurrentActor());

        log.info("Capital allocation optimized: date={}, available={}, required={}, components={}, actor={}",
                calcDate, totalAvailableCapital, totalRequired, components.size(),
                currentActorProvider.getCurrentActor());
        return result;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public List<EconomicCapital> getByDate(LocalDate date) {
        return capitalRepository.findByCalcDateOrderByRiskTypeAsc(date);
    }

    public List<EconomicCapital> getByBusinessUnit(LocalDate date, String bu) {
        return capitalRepository.findByCalcDateAndBusinessUnitOrderByRiskTypeAsc(date, bu);
    }

    public List<EconomicCapital> getByRiskType(String riskType) {
        return capitalRepository.findByRiskTypeOrderByCalcDateDesc(riskType);
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private BigDecimal safeZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
