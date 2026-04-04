package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.DistributionRunStepLogResponse;
import com.cbs.profitdistribution.dto.InitiateDistributionRunRequest;
import com.cbs.profitdistribution.dto.ProfitAllocationBatch;
import com.cbs.profitdistribution.dto.ProfitDistributionRunResponse;
import com.cbs.profitdistribution.dto.ReserveExecutionSummary;
import com.cbs.profitdistribution.dto.SsbCertificationRequest;
import com.cbs.profitdistribution.entity.DistributionRunStatus;
import com.cbs.profitdistribution.entity.DistributionRunStepLog;
import com.cbs.profitdistribution.entity.PeriodType;
import com.cbs.profitdistribution.entity.ProfitDistributionRun;
import com.cbs.profitdistribution.entity.StepStatus;
import com.cbs.profitdistribution.repository.DistributionRunStepLogRepository;
import com.cbs.profitdistribution.repository.ProfitDistributionRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProfitDistributionRunService {

    private final ProfitDistributionRunRepository runRepo;
    private final DistributionRunStepLogRepository stepLogRepo;
    private final ProfitCalculationService calculationService;
    private final ProfitAllocationService allocationService;
    private final DistributionReserveService reserveService;
    private final PoolWeightageService weightageService;
    private final InvestmentPoolRepository poolRepo;
    private final CurrentActorProvider actorProvider;

    private static final AtomicLong RUN_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    // ── Lifecycle: Initiation ──────────────────────────────────────────

    /**
     * Initiates a new profit distribution run for a pool and period.
     */
    public ProfitDistributionRunResponse initiateRun(InitiateDistributionRunRequest request) {
        InvestmentPool pool = poolRepo.findById(request.getPoolId())
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", request.getPoolId()));

        if (pool.getStatus() != PoolStatus.ACTIVE) {
            throw new BusinessException(
                    "Pool must be ACTIVE to initiate a distribution run, current status: " + pool.getStatus(),
                    "INVALID_STATE");
        }

        // Check no other run in progress for same pool and period
        Optional<ProfitDistributionRun> existing = runRepo.findByPoolIdAndPeriodFromAndPeriodTo(
                request.getPoolId(), request.getPeriodFrom(), request.getPeriodTo());
        if (existing.isPresent()) {
            throw new BusinessException(
                    "Distribution run already exists for this pool and period: " + existing.get().getRunRef(),
                    "DUPLICATE_RUN");
        }

        String runRef = "PDR-" + pool.getPoolCode() + "-"
                + request.getPeriodFrom().toString().replace("-", "") + "-"
                + String.format("%04d", RUN_SEQ.incrementAndGet());

        ProfitDistributionRun run = ProfitDistributionRun.builder()
                .runRef(runRef)
                .poolId(pool.getId())
                .poolCode(pool.getPoolCode())
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .periodType(PeriodType.valueOf(request.getPeriodType()))
                .currencyCode(pool.getCurrencyCode())
                .status(DistributionRunStatus.INITIATED)
                .initiatedBy(actorProvider.getCurrentActor())
                .initiatedAt(LocalDateTime.now())
                .retryCount(0)
                .build();

        run = runRepo.save(run);

        logStep(run.getId(), 1, "INITIATION", StepStatus.COMPLETED,
                Map.of("poolId", pool.getId()), Map.of("runRef", runRef));

        log.info("Distribution run initiated: ref={}, pool={}, period={}-{}",
                runRef, pool.getPoolCode(), request.getPeriodFrom(), request.getPeriodTo());

        return toResponse(run);
    }

    // ── Lifecycle: Calculation ──────────────────────────────────────────

    /**
     * Step 2: Execute pool profit calculation for the run.
     */
    public ProfitDistributionRunResponse executeCalculation(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.INITIATED);

        logStep(run.getId(), 2, "CALCULATE_POOL_PROFIT", StepStatus.STARTED, null, null);

        try {
            var calcResponse = calculationService.calculatePoolProfit(
                    run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo());

            run.setProfitCalculationId(calcResponse.getId());
            run.setGrossPoolIncome(calcResponse.getGrossIncome());
            run.setCharityIncomeExcluded(calcResponse.getCharityIncome());
            run.setPoolExpenses(calcResponse.getTotalExpenses());
            run.setNetDistributableProfit(calcResponse.getNetDistributableProfit());
            run.setBankMudaribShare(calcResponse.getBankMudaribShare());
            run.setDepositorPoolBeforeReserves(calcResponse.getDepositorPool());
            run.setLoss(calcResponse.isLoss());
            run.setStatus(DistributionRunStatus.CALCULATED);
            run.setCalculatedBy(actorProvider.getCurrentActor());
            run.setCalculatedAt(LocalDateTime.now());
            run = runRepo.save(run);

            completeStep(run.getId(), 2,
                    Map.of("ndp", calcResponse.getNetDistributableProfit()));

            log.info("Calculation completed: run={}, ndp={}, isLoss={}",
                    run.getRunRef(), calcResponse.getNetDistributableProfit(), calcResponse.isLoss());
        } catch (Exception e) {
            failRun(run, "CALCULATE_POOL_PROFIT", e);
            throw e;
        }

        return toResponse(run);
    }

    // ── Lifecycle: Calculation Approval ─────────────────────────────────

    /**
     * Step 3: Approve the pool profit calculation (maker-checker).
     */
    public ProfitDistributionRunResponse approveCalculation(Long runId, String approvedBy) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.CALCULATED);

        // Validate and approve the underlying calculation
        calculationService.validateCalculation(run.getProfitCalculationId(), approvedBy);
        calculationService.approveCalculation(run.getProfitCalculationId(), approvedBy);

        run.setStatus(DistributionRunStatus.CALCULATION_APPROVED);
        run.setCalculationApprovedBy(approvedBy);
        run.setCalculationApprovedAt(LocalDateTime.now());
        run = runRepo.save(run);

        logStep(run.getId(), 3, "APPROVE_CALCULATION", StepStatus.COMPLETED,
                null, Map.of("approvedBy", approvedBy));

        log.info("Calculation approved: run={}, approvedBy={}", run.getRunRef(), approvedBy);

        return toResponse(run);
    }

    // ── Lifecycle: Apply Reserves (PER + IRR) ──────────────────────────

    /**
     * Step 4: Apply PER and IRR reserve adjustments to the depositor pool.
     */
    public ProfitDistributionRunResponse applyReserves(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.CALCULATION_APPROVED);

        logStep(run.getId(), 4, "APPLY_RESERVES", StepStatus.STARTED, null, null);

        try {
            ReserveExecutionSummary summary = reserveService.executeReserves(
                    run.getPoolId(),
                    run.getDepositorPoolBeforeReserves(),
                    run.isLoss(),
                    run.getPeriodFrom(),
                    run.getPeriodTo(),
                    run.getId());

            run.setPerAdjustment(summary.getPerResult().getAdjustmentAmount());
            run.setIrrAdjustment(summary.getIrrResult().getAdjustmentAmount());
            run.setDepositorPoolAfterReserves(summary.getFinalDistributableAmount());
            run.setStatus(DistributionRunStatus.RESERVES_APPLIED);
            run.setReservesAppliedBy(actorProvider.getCurrentActor());
            run.setReservesAppliedAt(LocalDateTime.now());
            run = runRepo.save(run);

            completeStep(run.getId(), 4,
                    Map.of("perAdj", run.getPerAdjustment(), "irrAdj", run.getIrrAdjustment()));

            log.info("Reserves applied: run={}, perAdj={}, irrAdj={}, finalAmount={}",
                    run.getRunRef(), run.getPerAdjustment(), run.getIrrAdjustment(),
                    run.getDepositorPoolAfterReserves());
        } catch (Exception e) {
            failRun(run, "APPLY_RESERVES", e);
            throw e;
        }

        return toResponse(run);
    }

    // ── Lifecycle: Allocation ──────────────────────────────────────────

    /**
     * Step 5: Allocate the post-reserve depositor pool to individual participants.
     */
    public ProfitDistributionRunResponse executeAllocation(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.RESERVES_APPLIED);

        logStep(run.getId(), 5, "ALLOCATE_TO_DEPOSITORS", StepStatus.STARTED, null, null);

        try {
            ProfitAllocationBatch batch = allocationService.allocateProfit(
                    run.getPoolId(), run.getProfitCalculationId());

            run.setParticipantCount(batch.getParticipantCount());
            run.setTotalDistributedToDepositors(batch.getTotalCustomerProfit());
            run.setTotalBankShareFromPsr(batch.getTotalBankProfit());
            run.setAverageEffectiveRate(batch.getAverageEffectiveRate());
            run.setStatus(DistributionRunStatus.ALLOCATED);
            run.setAllocatedBy(actorProvider.getCurrentActor());
            run.setAllocatedAt(LocalDateTime.now());
            run = runRepo.save(run);

            completeStep(run.getId(), 5, Map.of("participants", batch.getParticipantCount()));

            log.info("Allocation completed: run={}, participants={}, customerTotal={}, bankTotal={}",
                    run.getRunRef(), batch.getParticipantCount(),
                    batch.getTotalCustomerProfit(), batch.getTotalBankProfit());
        } catch (Exception e) {
            failRun(run, "ALLOCATE_TO_DEPOSITORS", e);
            throw e;
        }

        return toResponse(run);
    }

    // ── Lifecycle: Allocation Approval ─────────────────────────────────

    /**
     * Step 6: Approve allocations with four-eyes enforcement.
     */
    public ProfitDistributionRunResponse approveAllocation(Long runId, String approvedBy) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.ALLOCATED);

        // Four-eyes: approver must differ from calculator
        if (approvedBy.equals(run.getCalculatedBy())) {
            throw new BusinessException(
                    "Four-eyes principle: approver cannot be the same person who calculated",
                    "FOUR_EYES");
        }
        // Four-eyes: approver must differ from calculation approver
        if (approvedBy.equals(run.getCalculationApprovedBy())) {
            throw new BusinessException(
                    "Four-eyes principle: approver must differ from calculation approver",
                    "FOUR_EYES");
        }

        allocationService.approveAllocations(
                run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo(), approvedBy);

        run.setStatus(DistributionRunStatus.ALLOCATION_APPROVED);
        run.setAllocationApprovedBy(approvedBy);
        run.setAllocationApprovedAt(LocalDateTime.now());
        run = runRepo.save(run);

        logStep(run.getId(), 6, "APPROVE_ALLOCATION", StepStatus.COMPLETED,
                null, Map.of("approvedBy", approvedBy));

        log.info("Allocation approved: run={}, approvedBy={}", run.getRunRef(), approvedBy);

        return toResponse(run);
    }

    // ── Lifecycle: Distribution (Post to Accounts) ─────────────────────

    /**
     * Step 7: Execute the actual profit distribution by crediting depositor accounts.
     */
    public ProfitDistributionRunResponse executeDistribution(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.ALLOCATION_APPROVED);

        run.setStatus(DistributionRunStatus.DISTRIBUTING);
        run = runRepo.save(run);

        logStep(run.getId(), 7, "DISTRIBUTE_PROFIT", StepStatus.STARTED, null, null);

        try {
            // Delegate to the existing weightage service which credits individual accounts
            weightageService.distributeProfit(run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo());

            run.setStatus(DistributionRunStatus.DISTRIBUTED);
            run.setDistributedBy(actorProvider.getCurrentActor());
            run.setDistributedAt(LocalDateTime.now());
            run = runRepo.save(run);

            completeStep(run.getId(), 7, Map.of("status", "DISTRIBUTED"));

            log.info("Distribution completed: run={}", run.getRunRef());
        } catch (Exception e) {
            failRun(run, "DISTRIBUTE_PROFIT", e);
            throw e;
        }

        return toResponse(run);
    }

    // ── Lifecycle: SSB Review & Certification ──────────────────────────

    /**
     * Submit the distributed run for Shariah Supervisory Board review.
     */
    public ProfitDistributionRunResponse submitForSsbReview(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.DISTRIBUTED);

        run.setStatus(DistributionRunStatus.SSB_REVIEW_PENDING);
        run = runRepo.save(run);

        log.info("Run submitted for SSB review: run={}", run.getRunRef());

        return toResponse(run);
    }

    /**
     * Step 8: Record SSB certification for the distribution run.
     */
    public ProfitDistributionRunResponse certifySsb(Long runId, SsbCertificationRequest request) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.SSB_REVIEW_PENDING);

        run.setSsbCertificationRef(request.getSsbCertificationRef());
        run.setSsbComments(request.getSsbComments());
        run.setSsbReviewedBy(request.getReviewedBy());
        run.setSsbReviewedAt(LocalDateTime.now());
        run.setStatus(DistributionRunStatus.SSB_CERTIFIED);
        run = runRepo.save(run);

        logStep(run.getId(), 8, "SSB_CERTIFICATION", StepStatus.COMPLETED,
                null, Map.of("certRef", request.getSsbCertificationRef()));

        log.info("SSB certification recorded: run={}, certRef={}",
                run.getRunRef(), request.getSsbCertificationRef());

        return toResponse(run);
    }

    // ── Lifecycle: Completion ──────────────────────────────────────────

    /**
     * Mark the run as completed. Accepts either DISTRIBUTED or SSB_CERTIFIED status.
     */
    public ProfitDistributionRunResponse completeRun(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);

        if (run.getStatus() != DistributionRunStatus.SSB_CERTIFIED
                && run.getStatus() != DistributionRunStatus.DISTRIBUTED) {
            throw new BusinessException(
                    "Run must be distributed or SSB certified to complete, current status: " + run.getStatus(),
                    "INVALID_STATE");
        }

        run.setStatus(DistributionRunStatus.COMPLETED);
        run.setCompletedAt(LocalDateTime.now());
        run = runRepo.save(run);

        log.info("Distribution run completed: run={}", run.getRunRef());

        return toResponse(run);
    }

    // ── Query Methods ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProfitDistributionRunResponse getRunResponse(Long runId) {
        return toResponse(getRunEntity(runId));
    }

    @Transactional(readOnly = true)
    public ProfitDistributionRunResponse getRunByRef(String runRef) {
        ProfitDistributionRun run = runRepo.findByRunRef(runRef)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ProfitDistributionRun", "runRef", runRef));
        return toResponse(run);
    }

    @Transactional(readOnly = true)
    public List<ProfitDistributionRunResponse> getRunsByPool(Long poolId) {
        return runRepo.findByPoolIdOrderByPeriodFromDesc(poolId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProfitDistributionRunResponse> getRunsByStatus(String status) {
        DistributionRunStatus runStatus = DistributionRunStatus.valueOf(status);
        return runRepo.findByStatus(runStatus).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DistributionRunStepLogResponse> getStepLogs(Long runId) {
        return stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(runId).stream()
                .map(this::toStepLogResponse)
                .collect(Collectors.toList());
    }

    // ── Internal Helpers ───────────────────────────────────────────────

    private ProfitDistributionRun getRunEntity(Long runId) {
        return runRepo.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Distribution run not found: " + runId));
    }

    private void validateStatus(ProfitDistributionRun run, DistributionRunStatus expected) {
        if (run.getStatus() != expected) {
            throw new BusinessException(
                    "Expected status " + expected + " but was " + run.getStatus(),
                    "INVALID_STATE");
        }
    }

    private void failRun(ProfitDistributionRun run, String step, Exception e) {
        run.setStatus(DistributionRunStatus.FAILED);
        run.setFailedAt(LocalDateTime.now());
        run.setFailedStep(step);
        run.setFailureReason(e.getMessage());
        run.setRetryCount(run.getRetryCount() + 1);
        runRepo.save(run);

        failStep(run.getId(), step, e.getMessage());

        log.error("Distribution run failed: run={}, step={}, reason={}",
                run.getRunRef(), step, e.getMessage(), e);
    }

    private void logStep(Long runId, int stepNum, String name, StepStatus status,
                         Map<String, Object> input, Map<String, Object> output) {
        DistributionRunStepLog stepLog = DistributionRunStepLog.builder()
                .distributionRunId(runId)
                .stepNumber(stepNum)
                .stepName(name)
                .stepStatus(status)
                .startedAt(LocalDateTime.now())
                .inputData(input)
                .outputData(output)
                .build();

        if (status == StepStatus.COMPLETED) {
            stepLog.setCompletedAt(LocalDateTime.now());
            stepLog.setDurationMs(0L);
        }

        stepLogRepo.save(stepLog);
    }

    private void completeStep(Long runId, int stepNum, Map<String, Object> output) {
        List<DistributionRunStepLog> logs = stepLogRepo
                .findByDistributionRunIdOrderByStepNumberAsc(runId);

        logs.stream()
                .filter(l -> l.getStepNumber() == stepNum && l.getStepStatus() == StepStatus.STARTED)
                .findFirst()
                .ifPresent(l -> {
                    l.setStepStatus(StepStatus.COMPLETED);
                    l.setCompletedAt(LocalDateTime.now());
                    l.setOutputData(output);
                    if (l.getStartedAt() != null) {
                        l.setDurationMs(Duration.between(l.getStartedAt(), l.getCompletedAt()).toMillis());
                    }
                    stepLogRepo.save(l);
                });
    }

    private void failStep(Long runId, String stepName, String error) {
        List<DistributionRunStepLog> logs = stepLogRepo
                .findByDistributionRunIdOrderByStepNumberAsc(runId);

        logs.stream()
                .filter(l -> l.getStepName().equals(stepName) && l.getStepStatus() == StepStatus.STARTED)
                .findFirst()
                .ifPresent(l -> {
                    l.setStepStatus(StepStatus.FAILED);
                    l.setCompletedAt(LocalDateTime.now());
                    l.setErrorMessage(error);
                    if (l.getStartedAt() != null) {
                        l.setDurationMs(Duration.between(l.getStartedAt(), l.getCompletedAt()).toMillis());
                    }
                    stepLogRepo.save(l);
                });
    }

    private ProfitDistributionRunResponse toResponse(ProfitDistributionRun r) {
        return ProfitDistributionRunResponse.builder()
                .id(r.getId())
                .runRef(r.getRunRef())
                .poolId(r.getPoolId())
                .poolCode(r.getPoolCode())
                .periodFrom(r.getPeriodFrom())
                .periodTo(r.getPeriodTo())
                .periodType(r.getPeriodType())
                .currencyCode(r.getCurrencyCode())
                .profitCalculationId(r.getProfitCalculationId())
                .grossPoolIncome(r.getGrossPoolIncome())
                .charityIncomeExcluded(r.getCharityIncomeExcluded())
                .poolExpenses(r.getPoolExpenses())
                .netDistributableProfit(r.getNetDistributableProfit())
                .bankMudaribShare(r.getBankMudaribShare())
                .depositorPoolBeforeReserves(r.getDepositorPoolBeforeReserves())
                .perAdjustment(r.getPerAdjustment())
                .irrAdjustment(r.getIrrAdjustment())
                .depositorPoolAfterReserves(r.getDepositorPoolAfterReserves())
                .totalDistributedToDepositors(r.getTotalDistributedToDepositors())
                .totalBankShareFromPsr(r.getTotalBankShareFromPsr())
                .participantCount(r.getParticipantCount())
                .averageEffectiveRate(r.getAverageEffectiveRate())
                .minimumRate(r.getMinimumRate())
                .maximumRate(r.getMaximumRate())
                .medianRate(r.getMedianRate())
                .isLoss(r.isLoss())
                .totalLossAmount(r.getTotalLossAmount())
                .lossAbsorbedByIrr(r.getLossAbsorbedByIrr())
                .lossPassedToDepositors(r.getLossPassedToDepositors())
                .status(r.getStatus())
                .initiatedBy(r.getInitiatedBy())
                .initiatedAt(r.getInitiatedAt())
                .calculatedBy(r.getCalculatedBy())
                .calculatedAt(r.getCalculatedAt())
                .calculationApprovedBy(r.getCalculationApprovedBy())
                .calculationApprovedAt(r.getCalculationApprovedAt())
                .reservesAppliedBy(r.getReservesAppliedBy())
                .reservesAppliedAt(r.getReservesAppliedAt())
                .allocatedBy(r.getAllocatedBy())
                .allocatedAt(r.getAllocatedAt())
                .allocationApprovedBy(r.getAllocationApprovedBy())
                .allocationApprovedAt(r.getAllocationApprovedAt())
                .distributedBy(r.getDistributedBy())
                .distributedAt(r.getDistributedAt())
                .ssbReviewedBy(r.getSsbReviewedBy())
                .ssbReviewedAt(r.getSsbReviewedAt())
                .ssbCertificationRef(r.getSsbCertificationRef())
                .ssbComments(r.getSsbComments())
                .completedAt(r.getCompletedAt())
                .failedAt(r.getFailedAt())
                .failureReason(r.getFailureReason())
                .failedStep(r.getFailedStep())
                .retryCount(r.getRetryCount())
                .reversedAt(r.getReversedAt())
                .reversedBy(r.getReversedBy())
                .reversalReason(r.getReversalReason())
                .reversalJournalRef(r.getReversalJournalRef())
                .build();
    }

    private DistributionRunStepLogResponse toStepLogResponse(DistributionRunStepLog l) {
        return DistributionRunStepLogResponse.builder()
                .id(l.getId())
                .distributionRunId(l.getDistributionRunId())
                .stepNumber(l.getStepNumber())
                .stepName(l.getStepName())
                .stepStatus(l.getStepStatus())
                .startedAt(l.getStartedAt())
                .completedAt(l.getCompletedAt())
                .durationMs(l.getDurationMs())
                .inputData(l.getInputData())
                .outputData(l.getOutputData())
                .errorMessage(l.getErrorMessage())
                .errorStackTrace(l.getErrorStackTrace())
                .journalRef(l.getJournalRef())
                .build();
    }
}
