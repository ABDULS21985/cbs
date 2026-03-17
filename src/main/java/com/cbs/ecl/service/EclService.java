package com.cbs.ecl.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.ecl.entity.*;
import com.cbs.ecl.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EclService {

    private final EclModelParameterRepository paramRepository;
    private final EclCalculationRepository calcRepository;

    /**
     * Calculates ECL for a single loan using IFRS 9 methodology:
     * 1. Determine stage (1/2/3) based on DPD and credit deterioration
     * 2. Look up PD (12-month for Stage 1, lifetime for Stage 2/3)
     * 3. Apply LGD and EAD
     * 4. Calculate ECL = PD × LGD × EAD for each macro scenario
     * 5. Weight scenarios (typically Base 50%, Optimistic 25%, Pessimistic 25%)
     * 6. Track movement vs previous calculation
     */
    @Transactional
    public EclCalculation calculateEcl(Long loanAccountId, Long customerId, String segment,
                                         String productCode, BigDecimal outstandingBalance,
                                         BigDecimal offBalanceExposure, int daysPastDue,
                                         boolean significantCreditDeterioration) {
        LocalDate today = LocalDate.now();

        // 1. Staging
        int stage = determineStage(daysPastDue, significantCreditDeterioration);
        String stageReason = stage == 1 ? "Performing (DPD=" + daysPastDue + ")" :
                stage == 2 ? "Significant increase in credit risk" :
                "Credit-impaired (DPD=" + daysPastDue + ")";

        // 2. Get parameters for each scenario
        List<EclModelParameter> params = paramRepository.findActiveParams(segment, stage, today);
        Map<String, List<EclModelParameter>> byScenario = params.stream()
                .collect(Collectors.groupingBy(p -> p.getMacroScenario() != null ? p.getMacroScenario() : "BASE"));

        // 3. EAD
        BigDecimal ead = outstandingBalance;
        if (offBalanceExposure != null && offBalanceExposure.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ccf = params.stream().findFirst().map(EclModelParameter::getEadCcf).orElse(BigDecimal.ONE);
            ead = ead.add(offBalanceExposure.multiply(ccf));
        }

        // 4. Calculate per scenario
        BigDecimal eclBase = calculateScenarioEcl(byScenario.getOrDefault("BASE", List.of()), stage, ead);
        BigDecimal eclOpt = calculateScenarioEcl(byScenario.getOrDefault("OPTIMISTIC", List.of()), stage, ead);
        BigDecimal eclPess = calculateScenarioEcl(byScenario.getOrDefault("PESSIMISTIC", List.of()), stage, ead);

        // 5. Weighted average (default: 50% base, 25% opt, 25% pess)
        BigDecimal wBase = getScenarioWeight(byScenario.getOrDefault("BASE", List.of()), new BigDecimal("0.50"));
        BigDecimal wOpt = getScenarioWeight(byScenario.getOrDefault("OPTIMISTIC", List.of()), new BigDecimal("0.25"));
        BigDecimal wPess = getScenarioWeight(byScenario.getOrDefault("PESSIMISTIC", List.of()), new BigDecimal("0.25"));

        BigDecimal eclWeighted = eclBase.multiply(wBase)
                .add(eclOpt.multiply(wOpt))
                .add(eclPess.multiply(wPess))
                .setScale(2, RoundingMode.HALF_UP);

        // 6. Movement
        BigDecimal previousEcl = calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(loanAccountId)
                .map(EclCalculation::getEclWeighted).orElse(BigDecimal.ZERO);
        Integer previousStage = calcRepository.findTopByLoanAccountIdOrderByCalculationDateDesc(loanAccountId)
                .map(EclCalculation::getCurrentStage).orElse(null);

        EclCalculation calc = EclCalculation.builder()
                .calculationDate(today).loanAccountId(loanAccountId).customerId(customerId)
                .currentStage(stage).previousStage(previousStage).stageReason(stageReason)
                .ead(ead).pdUsed(getPd(byScenario.getOrDefault("BASE", List.of()), stage))
                .lgdUsed(getLgd(byScenario.getOrDefault("BASE", List.of())))
                .eclBase(eclBase).eclOptimistic(eclOpt).eclPessimistic(eclPess)
                .eclWeighted(eclWeighted).previousEcl(previousEcl)
                .eclMovement(eclWeighted.subtract(previousEcl))
                .segment(segment).productCode(productCode).daysPastDue(daysPastDue).build();

        EclCalculation saved = calcRepository.save(calc);
        log.info("ECL calculated: loan={}, stage={}, ead={}, ecl={}, movement={}", loanAccountId, stage, ead, eclWeighted, calc.getEclMovement());
        return saved;
    }

    private int determineStage(int dpd, boolean significantDeterioration) {
        if (dpd > 90) return 3;
        if (dpd > 30 || significantDeterioration) return 2;
        return 1;
    }

    private BigDecimal calculateScenarioEcl(List<EclModelParameter> params, int stage, BigDecimal ead) {
        if (params.isEmpty()) return ead.multiply(new BigDecimal("0.01")).setScale(2, RoundingMode.HALF_UP); // fallback 1%
        EclModelParameter p = params.get(0);
        BigDecimal pd = (stage == 1) ? (p.getPd12Month() != null ? p.getPd12Month() : BigDecimal.ZERO) :
                (p.getPdLifetime() != null ? p.getPdLifetime() : BigDecimal.ZERO);
        BigDecimal lgd = p.getLgdRate() != null ? p.getLgdRate() : new BigDecimal("0.45");
        BigDecimal macro = p.getMacroAdjustment() != null ? BigDecimal.ONE.add(p.getMacroAdjustment()) : BigDecimal.ONE;
        return ead.multiply(pd).multiply(lgd).multiply(macro).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal getPd(List<EclModelParameter> params, int stage) {
        if (params.isEmpty()) return BigDecimal.ZERO;
        EclModelParameter p = params.get(0);
        return stage == 1 ? (p.getPd12Month() != null ? p.getPd12Month() : BigDecimal.ZERO) :
                (p.getPdLifetime() != null ? p.getPdLifetime() : BigDecimal.ZERO);
    }

    private BigDecimal getLgd(List<EclModelParameter> params) {
        return params.isEmpty() ? new BigDecimal("0.45") : (params.get(0).getLgdRate() != null ? params.get(0).getLgdRate() : new BigDecimal("0.45"));
    }

    private BigDecimal getScenarioWeight(List<EclModelParameter> params, BigDecimal defaultWeight) {
        return params.isEmpty() ? defaultWeight : params.get(0).getScenarioWeight();
    }

    // Queries
    public Page<EclCalculation> getCalculationsForDate(LocalDate date, Pageable pageable) {
        return calcRepository.findByCalculationDateOrderByEclWeightedDesc(date, pageable);
    }

    public EclSummary getEclSummary(LocalDate date) {
        return new EclSummary(date,
                calcRepository.totalEclForDate(date),
                calcRepository.totalEclByStage(date, 1),
                calcRepository.totalEclByStage(date, 2),
                calcRepository.totalEclByStage(date, 3));
    }

    @Transactional
    public EclModelParameter saveParameter(EclModelParameter param) { return paramRepository.save(param); }

    public record EclSummary(LocalDate date, BigDecimal totalEcl, BigDecimal stage1, BigDecimal stage2, BigDecimal stage3) {}
}
