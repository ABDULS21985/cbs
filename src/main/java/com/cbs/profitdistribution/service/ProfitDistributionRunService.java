package com.cbs.profitdistribution.service;

import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.DistributionDashboard;
import com.cbs.profitdistribution.dto.DistributionRunStepLogResponse;
import com.cbs.profitdistribution.dto.InitiateDistributionRunRequest;
import com.cbs.profitdistribution.dto.PoolProfitCalculationResponse;
import com.cbs.profitdistribution.dto.ProfitAllocationBatch;
import com.cbs.profitdistribution.dto.ProfitDistributionRunResponse;
import com.cbs.profitdistribution.dto.ReserveExecutionResult;
import com.cbs.profitdistribution.dto.ReserveExecutionSummary;
import com.cbs.profitdistribution.dto.SsbCertificationPackage;
import com.cbs.profitdistribution.dto.SsbCertificationRequest;
import com.cbs.profitdistribution.entity.CalculationStatus;
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
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
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
    private final PoolWeightageRecordRepository weightageRecordRepository;
    private final PoolProfitAllocationRepository allocationRepository;
    private final InvestmentPoolRepository poolRepo;
    private final PoolAssetManagementService poolAssetManagementService;
    private final TransactionJournalRepository transactionJournalRepository;
    private final AccountPostingService accountPostingService;
    private final GeneralLedgerService generalLedgerService;
    private final JournalEntryRepository journalEntryRepository;
    private final CurrentActorProvider actorProvider;
    private final com.cbs.gl.islamic.service.IslamicGLMetadataService islamicGLMetadataService;

    private static final AtomicLong RUN_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    public ProfitDistributionRunResponse initiateRun(InitiateDistributionRunRequest request) {
        InvestmentPool pool = getActivePool(request.getPoolId());
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

        long expectedDays = Math.max(Duration.between(
                request.getPeriodFrom().atStartOfDay(),
                request.getPeriodTo().plusDays(1).atStartOfDay()).toDays(), 1);
        long recordedDays = weightageRecordRepository.countDistinctRecordDates(
                request.getPoolId(), request.getPeriodFrom(), request.getPeriodTo());

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
                .tenantId(pool.getTenantId())
                .build();

        run = runRepo.save(run);
        logStep(run.getId(), 1, "INITIATION", StepStatus.COMPLETED,
                Map.of("poolId", pool.getId(), "expectedWeightageDays", expectedDays, "recordedWeightageDays", recordedDays),
                Map.of("runRef", runRef));
        return toResponse(run);
    }

    public ProfitDistributionRunResponse executeCalculation(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.INITIATED);
        logStep(run.getId(), 2, "CALCULATE_POOL_PROFIT", StepStatus.STARTED, null, null);

        try {
            PoolProfitCalculationResponse calcResponse = calculationService.calculatePoolProfit(
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

            completeStep(run.getId(), 2, Map.of(
                    "profitCalculationId", calcResponse.getId(),
                    "netDistributableProfit", calcResponse.getNetDistributableProfit()));
            return toResponse(run);
        } catch (Exception exception) {
            failRun(run, "CALCULATE_POOL_PROFIT", exception);
            throw exception;
        }
    }

    public ProfitDistributionRunResponse approveCalculation(Long runId, String approvedBy) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.CALCULATED);

        PoolProfitCalculationResponse calculation = calculationService.getCalculation(run.getProfitCalculationId());
        String validator = actorProvider.getCurrentActor();
        if (calculation.getCalculationStatus() == CalculationStatus.DRAFT) {
            if (approvedBy.equals(run.getCalculatedBy())) {
                throw new BusinessException(
                        "Calculation approver must differ from the calculator",
                        "FOUR_EYES_VIOLATION");
            }
            if (approvedBy.equals(validator)) {
                throw new BusinessException(
                        "Calculation approval requires a separate validator before approval",
                        "VALIDATION_REQUIRED");
            }
            calculationService.validateCalculation(run.getProfitCalculationId(), validator);
        }

        calculationService.approveCalculation(run.getProfitCalculationId(), approvedBy);
        run.setStatus(DistributionRunStatus.CALCULATION_APPROVED);
        run.setCalculationApprovedBy(approvedBy);
        run.setCalculationApprovedAt(LocalDateTime.now());
        run = runRepo.save(run);

        logStep(run.getId(), 3, "APPROVE_CALCULATION", StepStatus.COMPLETED,
                Map.of("validator", validator), Map.of("approvedBy", approvedBy));
        return toResponse(run);
    }

    public ProfitDistributionRunResponse applyReserves(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.CALCULATION_APPROVED);
        logStep(run.getId(), 4, "APPLY_RESERVES", StepStatus.STARTED, null, null);

        try {
            ReserveExecutionSummary summary = reserveService.executeReserves(
                    run.getPoolId(),
                    defaultAmount(run.getDepositorPoolBeforeReserves()),
                    run.isLoss(),
                    run.getPeriodFrom(),
                    run.getPeriodTo(),
                    run.getId());

            BigDecimal signedPer = signedAdjustment(summary.getPerResult());
            BigDecimal signedIrr = signedAdjustment(summary.getIrrResult());
            run.setPerAdjustment(signedPer);
            run.setIrrAdjustment(signedIrr);
            run.setDepositorPoolAfterReserves(summary.getFinalDistributableAmount());
            run.setStatus(DistributionRunStatus.RESERVES_APPLIED);
            run.setReservesAppliedBy(actorProvider.getCurrentActor());
            run.setReservesAppliedAt(LocalDateTime.now());
            if (run.isLoss()) {
                run.setTotalLossAmount(defaultAmount(run.getNetDistributableProfit()).abs());
                run.setLossAbsorbedByIrr(signedIrr.signum() < 0 ? signedIrr.abs() : ZERO);
                run.setLossPassedToDepositors(summary.getFinalDistributableAmount().abs());
            }
            run = runRepo.save(run);

            completeStep(run.getId(), 4, Map.of(
                    "perAdjustment", signedPer,
                    "irrAdjustment", signedIrr,
                    "finalDistributableAmount", summary.getFinalDistributableAmount()));
            return toResponse(run);
        } catch (Exception exception) {
            failRun(run, "APPLY_RESERVES", exception);
            throw exception;
        }
    }

    public ProfitDistributionRunResponse executeAllocation(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.RESERVES_APPLIED);
        logStep(run.getId(), 5, "ALLOCATE_TO_DEPOSITORS", StepStatus.STARTED, null, null);

        try {
            ProfitAllocationBatch batch = allocationService.allocateProfit(
                    run.getPoolId(),
                    run.getProfitCalculationId(),
                    defaultAmount(run.getDepositorPoolAfterReserves()),
                    defaultAmount(run.getPerAdjustment()),
                    defaultAmount(run.getIrrAdjustment()));

            run.setAllocationBatchId(batch.getBatchId());
            run.setParticipantCount(batch.getParticipantCount());
            run.setTotalDistributedToDepositors(batch.getTotalCustomerProfit());
            run.setTotalBankShareFromPsr(batch.getTotalBankProfit());
            run.setAverageEffectiveRate(batch.getAverageEffectiveRate());
            run.setMinimumRate(batch.getMinimumEffectiveRate());
            run.setMaximumRate(batch.getMaximumEffectiveRate());
            run.setMedianRate(calculateMedian(batch.getAllocations().stream()
                    .map(allocation -> allocation.getEffectiveProfitRate())
                    .filter(java.util.Objects::nonNull)
                    .toList()));
            run.setStatus(DistributionRunStatus.ALLOCATED);
            run.setAllocatedBy(actorProvider.getCurrentActor());
            run.setAllocatedAt(LocalDateTime.now());
            run = runRepo.save(run);

            completeStep(run.getId(), 5, Map.of(
                    "allocationBatchId", batch.getBatchId(),
                    "participantCount", batch.getParticipantCount(),
                    "conservationStatus", batch.getConservationCheck().getStatus()));
            return toResponse(run);
        } catch (Exception exception) {
            failRun(run, "ALLOCATE_TO_DEPOSITORS", exception);
            throw exception;
        }
    }

    public ProfitDistributionRunResponse approveAllocation(Long runId, String approvedBy) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.ALLOCATED);

        if (approvedBy.equals(run.getCalculatedBy())) {
            throw new BusinessException("Allocation approver must differ from calculator", "FOUR_EYES");
        }
        if (approvedBy.equals(run.getCalculationApprovedBy())) {
            throw new BusinessException("Allocation approver must differ from calculation approver", "FOUR_EYES");
        }
        if (approvedBy.equals(run.getAllocatedBy())) {
            throw new BusinessException("Allocation approver must differ from allocator", "FOUR_EYES");
        }

        allocationService.approveAllocations(run.getAllocationBatchId(), approvedBy);
        run.setStatus(DistributionRunStatus.ALLOCATION_APPROVED);
        run.setAllocationApprovedBy(approvedBy);
        run.setAllocationApprovedAt(LocalDateTime.now());
        run = runRepo.save(run);

        logStep(run.getId(), 6, "APPROVE_ALLOCATION", StepStatus.COMPLETED,
                null, Map.of("approvedBy", approvedBy));
        return toResponse(run);
    }

    public ProfitDistributionRunResponse executeDistribution(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.ALLOCATION_APPROVED);

        run.setStatus(DistributionRunStatus.DISTRIBUTING);
        run = runRepo.save(run);
        logStep(run.getId(), 7, "DISTRIBUTE_PROFIT", StepStatus.STARTED, null, null);

        try {
            weightageService.distributeProfit(run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo());
            JournalEntry bankShareJournal = postBankShareIfNeeded(run);

            List<PoolProfitAllocation> distributed = allocationRepository
                    .findByPoolIdAndPeriodFromAndPeriodToAndDistributionStatus(
                            run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo(), ProfitAllocationStatus.DISTRIBUTED);

            run.setTotalDistributedToDepositors(distributed.stream()
                    .map(PoolProfitAllocation::getCustomerProfitShare)
                    .reduce(ZERO, BigDecimal::add));
            run.setTotalBankShareFromPsr(distributed.stream()
                    .map(PoolProfitAllocation::getBankProfitShare)
                    .reduce(ZERO, BigDecimal::add));
            run.setStatus(DistributionRunStatus.DISTRIBUTED);
            run.setDistributedBy(actorProvider.getCurrentActor());
            run.setDistributedAt(LocalDateTime.now());
            run = runRepo.save(run);

            Map<String, Object> distributionOutput = new LinkedHashMap<>();
            distributionOutput.put("distributedAllocations", distributed.size());
            distributionOutput.put("bankShareJournal", bankShareJournal != null ? bankShareJournal.getJournalNumber() : null);
            completeStep(run.getId(), 7, distributionOutput);
            if (bankShareJournal != null) {
                attachJournalToLatestStep(run.getId(), 7, bankShareJournal.getJournalNumber());
            }
            log.info("AUDIT: Profit distribution completed - runRef={}, pool={}, participants={}, totalDistributed={}, actor={}",
                    run.getRunRef(), run.getPoolCode(), run.getParticipantCount(),
                    run.getTotalDistributedToDepositors(), actorProvider.getCurrentActor());
            return toResponse(run);
        } catch (Exception exception) {
            failRun(run, "DISTRIBUTE_PROFIT", exception);
            throw exception;
        }
    }

    public ProfitDistributionRunResponse submitForSsbReview(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.DISTRIBUTED);
        run.setStatus(DistributionRunStatus.SSB_REVIEW_PENDING);
        run = runRepo.save(run);
        logStep(run.getId(), 8, "SUBMIT_SSB_REVIEW", StepStatus.COMPLETED, null, Map.of("status", run.getStatus().name()));
        return toResponse(run);
    }

    public ProfitDistributionRunResponse certifySsb(Long runId, SsbCertificationRequest request) {
        ProfitDistributionRun run = getRunEntity(runId);
        validateStatus(run, DistributionRunStatus.SSB_REVIEW_PENDING);
        run.setSsbCertificationRef(request.getSsbCertificationRef());
        run.setSsbComments(request.getSsbComments());
        run.setSsbReviewedBy(request.getReviewedBy());
        run.setSsbReviewedAt(LocalDateTime.now());
        run.setStatus(DistributionRunStatus.SSB_CERTIFIED);
        run = runRepo.save(run);
        logStep(run.getId(), 9, "SSB_CERTIFICATION", StepStatus.COMPLETED,
                null, Map.of("ssbCertificationRef", request.getSsbCertificationRef()));
        return toResponse(run);
    }

    public ProfitDistributionRunResponse completeRun(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        if (run.getStatus() != DistributionRunStatus.DISTRIBUTED
                && run.getStatus() != DistributionRunStatus.SSB_CERTIFIED) {
            throw new BusinessException(
                    "Run must be distributed or SSB certified to complete, current status: " + run.getStatus(),
                    "INVALID_STATE");
        }
        run.setStatus(DistributionRunStatus.COMPLETED);
        run.setCompletedAt(LocalDateTime.now());
        run = runRepo.save(run);
        logStep(run.getId(), 10, "COMPLETE_RUN", StepStatus.COMPLETED, null, Map.of("completed", true));
        return toResponse(run);
    }

    public ProfitDistributionRunResponse executeFullRun(Long poolId, LocalDate periodFrom, LocalDate periodTo, boolean autoApprove) {
        ProfitDistributionRunResponse initiated = initiateRun(InitiateDistributionRunRequest.builder()
                .poolId(poolId)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .periodType(resolvePeriodType(periodFrom, periodTo).name())
                .build());
        ProfitDistributionRunResponse calculated = executeCalculation(initiated.getId());
        ProfitDistributionRunResponse current = calculated;
        if (autoApprove) {
            current = approveCalculation(current.getId(), nonBlank(actorProvider.getCurrentActor() + "_APPROVER", "AUTO_CALC_APPROVER"));
            current = applyReserves(current.getId());
            current = executeAllocation(current.getId());
            current = approveAllocation(current.getId(), nonBlank(actorProvider.getCurrentActor() + "_ALLOC_APPROVER", "AUTO_ALLOC_APPROVER"));
            current = executeDistribution(current.getId());
        }
        return current;
    }

    public ProfitDistributionRunResponse reverseDistribution(Long runId, String reason, String authorisedBy) {
        ProfitDistributionRun run = getRunEntity(runId);
        if (run.getStatus() != DistributionRunStatus.DISTRIBUTED
                && run.getStatus() != DistributionRunStatus.COMPLETED
                && run.getStatus() != DistributionRunStatus.SSB_CERTIFIED) {
            throw new BusinessException("Only distributed or completed runs can be reversed", "INVALID_STATE");
        }

        List<String> reversalRefs = new ArrayList<>();
        List<PoolProfitAllocation> allocations = allocationRepository.findByPoolIdAndPeriodFromAndPeriodTo(
                run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo());
        for (PoolProfitAllocation allocation : allocations) {
            if (!StringUtils.hasText(allocation.getJournalRef())) {
                continue;
            }
            TransactionJournal journal = transactionJournalRepository.findByTransactionRef(allocation.getJournalRef())
                    .orElse(null);
            if (journal != null && !Boolean.TRUE.equals(journal.getIsReversed())) {
                AccountPostingService.ReversalResult result = accountPostingService.reverseTransaction(journal.getId(), reason);
                reversalRefs.add(result.reversalGroupRef());
            }
        }

        reserveService.getReserveTransactions(runId).stream()
                .map(transaction -> transaction.getJournalRef())
                .filter(StringUtils::hasText)
                .forEach(journalNumber -> journalEntryRepository.findByJournalNumber(journalNumber)
                        .filter(journal -> !"REVERSED".equals(journal.getStatus()))
                        .ifPresent(journal -> reversalRefs.add(generalLedgerService.reverseJournal(journal.getId(), authorisedBy).getJournalNumber())));

        stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(runId).stream()
                .map(DistributionRunStepLog::getJournalRef)
                .filter(StringUtils::hasText)
                .forEach(journalNumber -> journalEntryRepository.findByJournalNumber(journalNumber)
                        .filter(journal -> !"REVERSED".equals(journal.getStatus()))
                        .ifPresent(journal -> reversalRefs.add(generalLedgerService.reverseJournal(journal.getId(), authorisedBy).getJournalNumber())));

        run.setStatus(DistributionRunStatus.REVERSED);
        run.setReversedAt(LocalDateTime.now());
        run.setReversedBy(authorisedBy);
        run.setReversalReason(reason);
        run.setReversalJournalRef(reversalRefs.isEmpty() ? null : String.join(",", reversalRefs));
        run = runRepo.save(run);
        logStep(run.getId(), 11, "REVERSE_DISTRIBUTION", StepStatus.COMPLETED,
                Map.of("reason", reason), Map.of("reversalRefs", reversalRefs));
        return toResponse(run);
    }

    @Transactional(readOnly = true)
    public ProfitDistributionRunResponse getRunResponse(Long runId) {
        return toResponse(getRunEntity(runId));
    }

    @Transactional(readOnly = true)
    public ProfitDistributionRunResponse getRunByRef(String runRef) {
        ProfitDistributionRun run = runRepo.findByRunRef(runRef)
                .orElseThrow(() -> new ResourceNotFoundException("ProfitDistributionRun", "runRef", runRef));
        return toResponse(run);
    }

    @Transactional(readOnly = true)
    public List<ProfitDistributionRunResponse> getRunsByPool(Long poolId) {
        return runRepo.findByPoolIdOrderByPeriodFromDesc(poolId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfitDistributionRunResponse> getRunsByStatus(String status) {
        return runRepo.findByStatus(DistributionRunStatus.valueOf(status)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProfitDistributionRunResponse getLatestCompletedRun(Long poolId) {
        return runRepo.findTopByPoolIdAndStatusOrderByCompletedAtDesc(poolId, DistributionRunStatus.COMPLETED)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<DistributionRunStepLogResponse> getStepLogs(Long runId) {
        return stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(runId).stream()
                .map(this::toStepLogResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SsbCertificationPackage getSsbCertificationPackage(Long runId) {
        ProfitDistributionRun run = getRunEntity(runId);
        PoolProfitCalculationResponse calculation = calculationService.getCalculation(run.getProfitCalculationId());
        List<PoolProfitAllocation> allocations = allocationRepository.findByPoolIdAndPeriodFromAndPeriodTo(
                run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo());
        var segregation = poolAssetManagementService.validatePoolSegregation(run.getPoolId());
        var reserveTransactions = reserveService.getReserveTransactions(runId);

        List<String> complianceNotes = new ArrayList<>();
        if (!segregation.isSegregated()) {
            complianceNotes.add("Pool segregation mismatch detected");
        }
        if (defaultAmount(run.getCharityIncomeExcluded()).compareTo(ZERO) > 0) {
            complianceNotes.add("Charity income excluded from depositor distribution");
        }

        BigDecimal perMovement = reserveTransactions.stream()
                .filter(tx -> "PER".equals(tx.getReserveType().name()))
                .map(tx -> tx.getTransactionType().name().equals("RETENTION") ? tx.getAmount() : tx.getAmount().negate())
                .reduce(ZERO, BigDecimal::add);
        BigDecimal irrMovement = reserveTransactions.stream()
                .filter(tx -> "IRR".equals(tx.getReserveType().name()))
                .map(tx -> tx.getTransactionType().name().equals("RETENTION") ? tx.getAmount() : tx.getAmount().negate())
                .reduce(ZERO, BigDecimal::add);

        boolean lossAllocatedToCapitalProviders = !run.isLoss() || allocations.stream()
                .allMatch(allocation -> allocation.getBankProfitShare().compareTo(ZERO) == 0);

        return SsbCertificationPackage.builder()
                .runRef(run.getRunRef())
                .poolCode(run.getPoolCode())
                .periodFrom(run.getPeriodFrom())
                .periodTo(run.getPeriodTo())
                .grossIncome(calculation.getGrossIncome())
                .incomeBySource(calculation.getIncomeBreakdown())
                .charityIncomeExcluded(calculation.getCharityIncome())
                .charityProperlySegregated(defaultAmount(calculation.getCharityIncome()).compareTo(ZERO) >= 0)
                .totalExpenses(calculation.getTotalExpenses())
                .expenseByType(calculation.getExpenseBreakdown())
                .perBalance(reserveTransactions.stream()
                        .filter(tx -> "PER".equals(tx.getReserveType().name()))
                        .map(tx -> tx.getBalanceAfter())
                        .reduce((first, second) -> second)
                        .orElse(ZERO))
                .perMovement(perMovement)
                .perPolicyReference("POOL_PER_POLICY")
                .irrBalance(reserveTransactions.stream()
                        .filter(tx -> "IRR".equals(tx.getReserveType().name()))
                        .map(tx -> tx.getBalanceAfter())
                        .reduce((first, second) -> second)
                        .orElse(ZERO))
                .irrMovement(irrMovement)
                .irrPolicyReference("POOL_IRR_POLICY")
                .netDistributableProfit(run.getNetDistributableProfit())
                .bankMudaribShare(run.getBankMudaribShare())
                .depositorPool(defaultAmount(run.getDepositorPoolAfterReserves()))
                .participantCount(defaultInt(run.getParticipantCount()))
                .averageRate(run.getAverageEffectiveRate())
                .minRate(run.getMinimumRate())
                .maxRate(run.getMaximumRate())
                .psrAppliedAsContracted(allocations.stream().allMatch(allocation -> allocation.getCustomerPsr() != null))
                .noFixedReturnGuaranteed(true)
                .lossAllocatedToCapitalProviders(lossAllocatedToCapitalProviders)
                .charityIncomeExcludedFromPool(defaultAmount(run.getCharityIncomeExcluded()).compareTo(ZERO) >= 0)
                .poolGenuinelySegregated(segregation.isSegregated())
                .reservesWithinApprovedLimits(true)
                .complianceNotes(complianceNotes)
                .build();
    }

    @Transactional(readOnly = true)
    public DistributionDashboard getDistributionDashboard() {
        Map<String, Long> activeRuns = runRepo.findAll().stream()
                .filter(run -> run.getStatus() != DistributionRunStatus.COMPLETED
                        && run.getStatus() != DistributionRunStatus.REVERSED)
                .collect(Collectors.groupingBy(run -> run.getStatus().name(), LinkedHashMap::new, Collectors.counting()));

        LocalDateTime monthStart = YearMonth.now().atDay(1).atStartOfDay();
        LocalDateTime yearStart = LocalDate.now().withDayOfYear(1).atStartOfDay();
        BigDecimal totalDistributedMonthToDate = runRepo.findByDistributedAtBetween(monthStart, LocalDateTime.now()).stream()
                .map(ProfitDistributionRun::getTotalDistributedToDepositors)
                .filter(java.util.Objects::nonNull)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal totalDistributedYearToDate = runRepo.findByDistributedAtBetween(yearStart, LocalDateTime.now()).stream()
                .map(ProfitDistributionRun::getTotalDistributedToDepositors)
                .filter(java.util.Objects::nonNull)
                .reduce(ZERO, BigDecimal::add);

        List<DistributionDashboard.LatestCompletedRun> latestCompletedRuns = poolRepo.findByStatus(PoolStatus.ACTIVE).stream()
                .map(pool -> runRepo.findTopByPoolIdAndStatusOrderByCompletedAtDesc(pool.getId(), DistributionRunStatus.COMPLETED)
                        .map(run -> DistributionDashboard.LatestCompletedRun.builder()
                                .poolId(pool.getId())
                                .poolCode(pool.getPoolCode())
                                .runRef(run.getRunRef())
                                .periodFrom(run.getPeriodFrom())
                                .periodTo(run.getPeriodTo())
                                .totalDistributed(run.getTotalDistributedToDepositors())
                                .averageRate(run.getAverageEffectiveRate())
                                .build())
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();

        return DistributionDashboard.builder()
                .activeRunsByStatus(activeRuns)
                .latestCompletedRuns(latestCompletedRuns)
                .totalDistributedMonthToDate(totalDistributedMonthToDate)
                .totalDistributedYearToDate(totalDistributedYearToDate)
                .nextMonthlyRunDate(YearMonth.now().plusMonths(1).atDay(1))
                .build();
    }

    private InvestmentPool getActivePool(Long poolId) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
        if (pool.getStatus() != PoolStatus.ACTIVE) {
            throw new BusinessException(
                    "Pool must be ACTIVE to initiate a distribution run, current status: " + pool.getStatus(),
                    "INVALID_STATE");
        }
        return pool;
    }

    private JournalEntry postBankShareIfNeeded(ProfitDistributionRun run) {
        BigDecimal bankShare = allocationRepository.findByPoolIdAndPeriodFromAndPeriodTo(
                        run.getPoolId(), run.getPeriodFrom(), run.getPeriodTo()).stream()
                .map(PoolProfitAllocation::getBankProfitShare)
                .reduce(ZERO, BigDecimal::add);
        if (bankShare.compareTo(ZERO) <= 0) {
            return null;
        }

        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                "Bank mudarib share for " + run.getRunRef(),
                "PROFIT_DISTRIBUTION",
                run.getRunRef(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(
                                PROFIT_DISTRIBUTION_GL,
                                bankShare,
                                ZERO,
                                run.getCurrencyCode(),
                                BigDecimal.ONE,
                                "Bank mudarib share expense",
                                null,
                                "HEAD",
                                null,
                                null
                        ),
                        new GeneralLedgerService.JournalLineRequest(
                                BANK_MUDARIB_INCOME_GL,
                                ZERO,
                                bankShare,
                                run.getCurrencyCode(),
                                BigDecimal.ONE,
                                "Bank mudarib share income",
                                null,
                                "HEAD",
                                null,
                                null
                        )
                )
        );
        return journal;
    }

    private ProfitDistributionRun getRunEntity(Long runId) {
        return runRepo.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("ProfitDistributionRun", "id", runId));
    }

    private void validateStatus(ProfitDistributionRun run, DistributionRunStatus expected) {
        if (run.getStatus() != expected) {
            throw new BusinessException("Expected status " + expected + " but was " + run.getStatus(), "INVALID_STATE");
        }
    }

    private void failRun(ProfitDistributionRun run, String step, Exception exception) {
        run.setStatus(DistributionRunStatus.FAILED);
        run.setFailedAt(LocalDateTime.now());
        run.setFailedStep(step);
        run.setFailureReason(exception.getMessage());
        run.setRetryCount(run.getRetryCount() + 1);
        runRepo.save(run);
        failStep(run.getId(), step, exception.getMessage());
        log.error("Profit distribution run failed: run={}, step={}, error={}",
                run.getRunRef(), step, exception.getMessage(), exception);
    }

    private BigDecimal signedAdjustment(ReserveExecutionResult result) {
        if (result == null || !StringUtils.hasText(result.getTransactionType())
                || "NONE".equalsIgnoreCase(result.getTransactionType())) {
            return ZERO;
        }
        return "RELEASE".equalsIgnoreCase(result.getTransactionType())
                ? defaultAmount(result.getAdjustmentAmount()).negate()
                : defaultAmount(result.getAdjustmentAmount());
    }

    private PeriodType resolvePeriodType(LocalDate periodFrom, LocalDate periodTo) {
        long days = Math.max(Duration.between(periodFrom.atStartOfDay(), periodTo.plusDays(1).atStartOfDay()).toDays(), 1);
        if (days <= 31) {
            return PeriodType.MONTHLY;
        }
        if (days <= 92) {
            return PeriodType.QUARTERLY;
        }
        if (days <= 183) {
            return PeriodType.SEMI_ANNUAL;
        }
        if (days <= 366) {
            return PeriodType.ANNUAL;
        }
        return PeriodType.CUSTOM;
    }

    private BigDecimal calculateMedian(List<BigDecimal> values) {
        if (values == null || values.isEmpty()) {
            return ZERO;
        }
        List<BigDecimal> sorted = values.stream()
                .sorted(Comparator.naturalOrder())
                .toList();
        int midpoint = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(midpoint);
        }
        return sorted.get(midpoint - 1).add(sorted.get(midpoint))
                .divide(new BigDecimal("2"), 4, RoundingMode.HALF_UP);
    }

    private void logStep(Long runId, int stepNumber, String stepName, StepStatus status,
                         Map<String, Object> input, Map<String, Object> output) {
        DistributionRunStepLog stepLog = DistributionRunStepLog.builder()
                .distributionRunId(runId)
                .stepNumber(stepNumber)
                .stepName(stepName)
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

    private void completeStep(Long runId, int stepNumber, Map<String, Object> output) {
        stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(runId).stream()
                .filter(step -> step.getStepNumber() == stepNumber && step.getStepStatus() == StepStatus.STARTED)
                .findFirst()
                .ifPresent(step -> {
                    step.setStepStatus(StepStatus.COMPLETED);
                    step.setCompletedAt(LocalDateTime.now());
                    step.setOutputData(output);
                    step.setDurationMs(step.getStartedAt() != null
                            ? Duration.between(step.getStartedAt(), step.getCompletedAt()).toMillis()
                            : 0L);
                    stepLogRepo.save(step);
                });
    }

    private void attachJournalToLatestStep(Long runId, int stepNumber, String journalRef) {
        stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(runId).stream()
                .filter(step -> step.getStepNumber() == stepNumber)
                .reduce((first, second) -> second)
                .ifPresent(step -> {
                    step.setJournalRef(journalRef);
                    stepLogRepo.save(step);
                });
    }

    private void failStep(Long runId, String stepName, String errorMessage) {
        stepLogRepo.findByDistributionRunIdOrderByStepNumberAsc(runId).stream()
                .filter(step -> stepName.equals(step.getStepName()) && step.getStepStatus() == StepStatus.STARTED)
                .findFirst()
                .ifPresent(step -> {
                    step.setStepStatus(StepStatus.FAILED);
                    step.setCompletedAt(LocalDateTime.now());
                    step.setErrorMessage(errorMessage);
                    step.setDurationMs(step.getStartedAt() != null
                            ? Duration.between(step.getStartedAt(), step.getCompletedAt()).toMillis()
                            : 0L);
                    stepLogRepo.save(step);
                });
    }

    private ProfitDistributionRunResponse toResponse(ProfitDistributionRun run) {
        return ProfitDistributionRunResponse.builder()
                .id(run.getId())
                .runRef(run.getRunRef())
                .poolId(run.getPoolId())
                .poolCode(run.getPoolCode())
                .periodFrom(run.getPeriodFrom())
                .periodTo(run.getPeriodTo())
                .periodType(run.getPeriodType())
                .currencyCode(run.getCurrencyCode())
                .profitCalculationId(run.getProfitCalculationId())
                .allocationBatchId(run.getAllocationBatchId())
                .grossPoolIncome(run.getGrossPoolIncome())
                .charityIncomeExcluded(run.getCharityIncomeExcluded())
                .poolExpenses(run.getPoolExpenses())
                .netDistributableProfit(run.getNetDistributableProfit())
                .bankMudaribShare(run.getBankMudaribShare())
                .depositorPoolBeforeReserves(run.getDepositorPoolBeforeReserves())
                .perAdjustment(run.getPerAdjustment())
                .irrAdjustment(run.getIrrAdjustment())
                .depositorPoolAfterReserves(run.getDepositorPoolAfterReserves())
                .totalDistributedToDepositors(run.getTotalDistributedToDepositors())
                .totalBankShareFromPsr(run.getTotalBankShareFromPsr())
                .participantCount(run.getParticipantCount())
                .averageEffectiveRate(run.getAverageEffectiveRate())
                .minimumRate(run.getMinimumRate())
                .maximumRate(run.getMaximumRate())
                .medianRate(run.getMedianRate())
                .isLoss(run.isLoss())
                .totalLossAmount(run.getTotalLossAmount())
                .lossAbsorbedByIrr(run.getLossAbsorbedByIrr())
                .lossPassedToDepositors(run.getLossPassedToDepositors())
                .status(run.getStatus())
                .initiatedBy(run.getInitiatedBy())
                .initiatedAt(run.getInitiatedAt())
                .calculatedBy(run.getCalculatedBy())
                .calculatedAt(run.getCalculatedAt())
                .calculationApprovedBy(run.getCalculationApprovedBy())
                .calculationApprovedAt(run.getCalculationApprovedAt())
                .reservesAppliedBy(run.getReservesAppliedBy())
                .reservesAppliedAt(run.getReservesAppliedAt())
                .allocatedBy(run.getAllocatedBy())
                .allocatedAt(run.getAllocatedAt())
                .allocationApprovedBy(run.getAllocationApprovedBy())
                .allocationApprovedAt(run.getAllocationApprovedAt())
                .distributedBy(run.getDistributedBy())
                .distributedAt(run.getDistributedAt())
                .ssbReviewedBy(run.getSsbReviewedBy())
                .ssbReviewedAt(run.getSsbReviewedAt())
                .ssbCertificationRef(run.getSsbCertificationRef())
                .ssbComments(run.getSsbComments())
                .completedAt(run.getCompletedAt())
                .failedAt(run.getFailedAt())
                .failureReason(run.getFailureReason())
                .failedStep(run.getFailedStep())
                .retryCount(run.getRetryCount())
                .reversedAt(run.getReversedAt())
                .reversedBy(run.getReversedBy())
                .reversalReason(run.getReversalReason())
                .reversalJournalRef(run.getReversalJournalRef())
                .tenantId(run.getTenantId())
                .build();
    }

    private DistributionRunStepLogResponse toStepLogResponse(DistributionRunStepLog stepLog) {
        return DistributionRunStepLogResponse.builder()
                .id(stepLog.getId())
                .distributionRunId(stepLog.getDistributionRunId())
                .stepNumber(stepLog.getStepNumber())
                .stepName(stepLog.getStepName())
                .stepStatus(stepLog.getStepStatus())
                .startedAt(stepLog.getStartedAt())
                .completedAt(stepLog.getCompletedAt())
                .durationMs(stepLog.getDurationMs())
                .inputData(stepLog.getInputData())
                .outputData(stepLog.getOutputData())
                .errorMessage(stepLog.getErrorMessage())
                .errorStackTrace(stepLog.getErrorStackTrace())
                .journalRef(stepLog.getJournalRef())
                .build();
    }

    private BigDecimal defaultAmount(BigDecimal value) {
        return value != null ? value : ZERO;
    }

    private int defaultInt(Integer value) {
        return value != null ? value : 0;
    }

    private String nonBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private static final BigDecimal ZERO = BigDecimal.ZERO;
}
