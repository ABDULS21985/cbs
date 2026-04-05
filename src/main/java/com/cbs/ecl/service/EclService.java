package com.cbs.ecl.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.ecl.entity.*;
import com.cbs.ecl.repository.*;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.repository.GlBalanceRepository;
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
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EclService {

    private final EclModelParameterRepository paramRepository;
    private final EclCalculationRepository calcRepository;
    private final EclBatchRunRepository batchRunRepository;
    private final EclProvisionMovementRepository provisionMovementRepository;
    private final EclPdTermStructureRepository pdTermStructureRepository;
    private final GlBalanceRepository glBalanceRepository;

    /**
     * GL code prefix for ECL provision accounts.
     * Convention: GL codes starting with "159" are loan-loss provision accounts.
     */
    private static final String ECL_PROVISION_GL_PREFIX = "159";
    /** Tolerance threshold for reconciliation (minor rounding differences). */
    private static final BigDecimal RECONCILIATION_TOLERANCE = new BigDecimal("0.05");

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

    public List<EclModelParameter> getAllParameters() { return paramRepository.findAll(); }

    public record EclSummary(LocalDate date, BigDecimal totalEcl, BigDecimal stage1, BigDecimal stage2, BigDecimal stage3) {}

    // ========================================================================
    // Dashboard aggregation methods
    // ========================================================================

    public List<Map<String, Object>> getStageDistribution() {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = calcRepository.stageDistribution(today);
        BigDecimal grandTotal = rows.stream()
                .map(r -> r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream().map(r -> {
            int stage = (Integer) r[0];
            long count = (Long) r[1];
            BigDecimal amount = r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO;
            BigDecimal pct = grandTotal.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(grandTotal, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return Map.<String, Object>of(
                    "stage", "Stage " + stage, "amount", amount, "count", count, "pct", pct);
        }).toList();
    }

    public List<Map<String, Object>> getStageMigration() {
        List<Object[]> rows = calcRepository.stageMigration(LocalDate.now());
        return rows.stream().map(r -> Map.<String, Object>of(
                "from", "Stage " + r[0], "to", "Stage " + r[1],
                "amount", r[2] != null ? r[2] : BigDecimal.ZERO
        )).toList();
    }

    public List<Map<String, Object>> getProvisionMovement() {
        LocalDate today = LocalDate.now();
        List<EclProvisionMovement> rows = provisionMovementRepository.findByRunDateOrderByIdAsc(today);
        if (!rows.isEmpty()) {
            return rows.stream().map(r -> Map.<String, Object>of(
                    "label", r.getLabel(), "stage1", r.getStage1(), "stage2", r.getStage2(),
                    "stage3", r.getStage3(), "total", r.getTotal(), "isTotal", r.getIsTotalRow()
            )).toList();
        }
        // Fallback: compute from current ECL summary if no provision movement rows exist yet
        EclSummary s = getEclSummary(today);
        BigDecimal s1 = s.stage1() != null ? s.stage1() : BigDecimal.ZERO;
        BigDecimal s2 = s.stage2() != null ? s.stage2() : BigDecimal.ZERO;
        BigDecimal s3 = s.stage3() != null ? s.stage3() : BigDecimal.ZERO;
        BigDecimal total = s1.add(s2).add(s3);
        return List.of(
                Map.of("label", "Opening", "stage1", s1, "stage2", s2, "stage3", s3, "total", total, "isTotal", true),
                Map.of("label", "New loans", "stage1", BigDecimal.ZERO, "stage2", BigDecimal.ZERO, "stage3", BigDecimal.ZERO, "total", BigDecimal.ZERO),
                Map.of("label", "Migrations", "stage1", BigDecimal.ZERO, "stage2", BigDecimal.ZERO, "stage3", BigDecimal.ZERO, "total", BigDecimal.ZERO),
                Map.of("label", "Remeasure", "stage1", BigDecimal.ZERO, "stage2", BigDecimal.ZERO, "stage3", BigDecimal.ZERO, "total", BigDecimal.ZERO),
                Map.of("label", "Write-offs", "stage1", BigDecimal.ZERO, "stage2", BigDecimal.ZERO, "stage3", BigDecimal.ZERO, "total", BigDecimal.ZERO),
                Map.of("label", "Recoveries", "stage1", BigDecimal.ZERO, "stage2", BigDecimal.ZERO, "stage3", BigDecimal.ZERO, "total", BigDecimal.ZERO),
                Map.of("label", "Closing", "stage1", s1, "stage2", s2, "stage3", s3, "total", total, "isTotal", true)
        );
    }

    public List<Map<String, Object>> getPdTermStructure() {
        List<EclPdTermStructure> termStructures = pdTermStructureRepository.findByIsActiveTrueOrderByRatingGradeAsc();
        if (!termStructures.isEmpty()) {
            return termStructures.stream().map(ts -> Map.<String, Object>of(
                    "ratingGrade", ts.getRatingGrade(),
                    "tenor1y", ts.getTenor1y(),
                    "tenor3y", ts.getTenor3y(),
                    "tenor5y", ts.getTenor5y(),
                    "tenor10y", ts.getTenor10y()
            )).toList();
        }
        // Fallback: derive from ECL model parameters if no dedicated term structure rows exist
        List<EclModelParameter> params = paramRepository.findAll();
        Map<String, List<EclModelParameter>> bySegment = params.stream()
                .filter(EclModelParameter::getIsActive)
                .collect(Collectors.groupingBy(EclModelParameter::getSegment));
        return bySegment.entrySet().stream().map(e -> {
            EclModelParameter p = e.getValue().get(0);
            BigDecimal pd12 = p.getPd12Month() != null ? p.getPd12Month() : BigDecimal.ZERO;
            return Map.<String, Object>of(
                    "ratingGrade", e.getKey(),
                    "tenor1y", pd12,
                    "tenor3y", pd12.multiply(BigDecimal.valueOf(2)),
                    "tenor5y", pd12.multiply(BigDecimal.valueOf(3)),
                    "tenor10y", pd12.multiply(BigDecimal.valueOf(5))
            );
        }).toList();
    }

    public List<Map<String, Object>> getLgdByCollateral() {
        List<EclModelParameter> params = paramRepository.findAll().stream()
                .filter(EclModelParameter::getIsActive).toList();
        Map<String, BigDecimal> lgdBySegment = params.stream()
                .collect(Collectors.toMap(EclModelParameter::getSegment,
                        p -> p.getLgdRate() != null ? p.getLgdRate() : new BigDecimal("0.45"),
                        (a, b) -> a));
        return lgdBySegment.entrySet().stream().map(e -> Map.<String, Object>of(
                "collateralType", e.getKey(),
                "lgdPct", e.getValue().multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP),
                "description", e.getKey() + " segment collateral"
        )).toList();
    }

    public List<Map<String, Object>> getEadByProduct() {
        List<Object[]> rows = calcRepository.eadBySegment(LocalDate.now());
        return rows.stream().map(r -> Map.<String, Object>of(
                "product", r[0] != null ? r[0] : "Unknown",
                "outstanding", r[1] != null ? r[1] : BigDecimal.ZERO,
                "undrawn", BigDecimal.ZERO,
                "ccf", BigDecimal.ONE,
                "ead", r[1] != null ? r[1] : BigDecimal.ZERO
        )).toList();
    }

    public List<Map<String, Object>> getMacroScenarios() {
        List<EclModelParameter> params = paramRepository.findAll().stream()
                .filter(EclModelParameter::getIsActive).toList();
        Map<String, List<EclModelParameter>> byScenario = params.stream()
                .collect(Collectors.groupingBy(p -> p.getMacroScenario() != null ? p.getMacroScenario() : "BASE"));

        return List.of("BASE", "OPTIMISTIC", "PESSIMISTIC").stream().map(scenario -> {
            List<EclModelParameter> sp = byScenario.getOrDefault(scenario, List.of());
            BigDecimal weight = sp.isEmpty() ? BigDecimal.ZERO
                    : sp.get(0).getScenarioWeight().multiply(BigDecimal.valueOf(100));
            BigDecimal macroAdj = sp.isEmpty() ? BigDecimal.ZERO
                    : (sp.get(0).getMacroAdjustment() != null ? sp.get(0).getMacroAdjustment() : BigDecimal.ZERO);
            String label = scenario.equals("BASE") ? "Base" : scenario.equals("OPTIMISTIC") ? "Optimistic" : "Pessimistic";
            return Map.<String, Object>of(
                    "name", label, "weight", weight,
                    "gdpGrowth", macroAdj.multiply(BigDecimal.valueOf(100)),
                    "inflation", BigDecimal.ZERO, "ecl", BigDecimal.ZERO
            );
        }).toList();
    }

    /**
     * Reconciles the total ECL provision calculated by the CBS engine against the
     * actual GL provision balance. Returns reconciled=true only if the amounts
     * match within a small tolerance threshold (to allow for rounding).
     */
    public Map<String, Object> getGlReconciliation() {
        LocalDate today = LocalDate.now();

        // 1. Total ECL as calculated by the CBS ECL engine
        BigDecimal totalEcl = calcRepository.totalEclForDate(today);
        if (totalEcl == null) totalEcl = BigDecimal.ZERO;

        // 2. Actual GL provision balance: sum closing balances of all provision GL accounts
        //    Provision accounts are identified by GL codes starting with the provision prefix (e.g., "159x")
        List<GlBalance> provisionBalances = glBalanceRepository.findByBalanceDateOrderByGlCodeAsc(today)
                .stream()
                .filter(b -> b.getGlCode() != null && b.getGlCode().startsWith(ECL_PROVISION_GL_PREFIX))
                .toList();

        BigDecimal glProvisionBalance = provisionBalances.stream()
                .map(GlBalance::getClosingBalance)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .abs(); // Provision balances are typically credit (negative in normal-debit convention)

        // 3. Calculate difference and determine if reconciled within tolerance
        BigDecimal difference = totalEcl.subtract(glProvisionBalance).setScale(2, RoundingMode.HALF_UP);
        boolean reconciled = difference.abs().compareTo(RECONCILIATION_TOLERANCE) <= 0;

        if (!reconciled) {
            log.warn("ECL GL reconciliation mismatch: cbsEcl={}, glProvision={}, difference={}",
                    totalEcl, glProvisionBalance, difference);
        }

        return Map.of(
                "cbsEclTotal", totalEcl,
                "glProvisionBalance", glProvisionBalance,
                "difference", difference,
                "reconciled", reconciled,
                "provisionGlAccounts", provisionBalances.stream().map(GlBalance::getGlCode).distinct().toList(),
                "reconciliationDate", today.toString(),
                "toleranceThreshold", RECONCILIATION_TOLERANCE
        );
    }

    public Page<EclCalculation> getLoansByStage(int stage, Pageable pageable) {
        return calcRepository.findByCurrentStage(stage, pageable);
    }

    @Transactional
    public String triggerBatchRun() {
        String jobId = "ecl-batch-" + System.currentTimeMillis();
        EclBatchRun run = EclBatchRun.builder()
                .jobId(jobId)
                .status("RUNNING")
                .startedAt(java.time.Instant.now())
                .build();
        batchRunRepository.save(run);
        log.info("Batch ECL calculation triggered: jobId={}", jobId);
        return jobId;
    }

    public EclBatchRun getLatestBatchRun() {
        return batchRunRepository.findTopByOrderByCreatedAtDesc().orElse(null);
    }
}
