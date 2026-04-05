package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.profitdistribution.dto.AssignAssetToPoolRequest;
import com.cbs.profitdistribution.dto.PoolAssetAssignmentResponse;
import com.cbs.profitdistribution.dto.PoolExpenseRecordResponse;
import com.cbs.profitdistribution.dto.PoolIncomeRecordResponse;
import com.cbs.profitdistribution.dto.PoolPortfolio;
import com.cbs.profitdistribution.dto.RecordPoolExpenseRequest;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.dto.SegregationValidationResult;
import com.cbs.profitdistribution.entity.AssetType;
import com.cbs.profitdistribution.entity.AssignmentStatus;
import com.cbs.profitdistribution.entity.ExpenseAllocationMethod;
import com.cbs.profitdistribution.entity.ExpenseType;
import com.cbs.profitdistribution.entity.IncomeType;
import com.cbs.profitdistribution.entity.PoolAssetAssignment;
import com.cbs.profitdistribution.entity.PoolExpenseRecord;
import com.cbs.profitdistribution.entity.PoolIncomeRecord;
import com.cbs.profitdistribution.repository.PoolAssetAssignmentRepository;
import com.cbs.profitdistribution.repository.PoolExpenseRecordRepository;
import com.cbs.profitdistribution.repository.PoolIncomeRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PoolAssetManagementService {

    private final PoolAssetAssignmentRepository assetRepo;
    private final PoolIncomeRecordRepository incomeRepo;
    private final PoolExpenseRecordRepository expenseRepo;
    private final InvestmentPoolRepository poolRepo;
    private final InvestmentPoolParticipantRepository participantRepo;
    private final CurrentActorProvider actorProvider;

    // ── Asset Assignment ───────────────────────────────────────────────

    public PoolAssetAssignmentResponse assignAssetToPool(Long poolId, AssignAssetToPoolRequest request) {
        InvestmentPool pool = findActivePool(poolId);

        // Currency matching: asset currency must match pool currency
        if (request.getCurrencyCode() != null && pool.getCurrencyCode() != null
                && !request.getCurrencyCode().equalsIgnoreCase(pool.getCurrencyCode())) {
            throw new BusinessException(
                    "Asset currency (" + request.getCurrencyCode()
                            + ") does not match pool currency (" + pool.getCurrencyCode() + ")",
                    "ASSET_CURRENCY_MISMATCH");
        }

        // Segregation check: total assigned across all pools for this asset must not exceed outstanding
        if (request.getAssetReferenceId() != null) {
            if (assetRepo.existsByPoolIdAndAssetReferenceIdAndAssignmentStatus(
                    poolId, request.getAssetReferenceId(), AssignmentStatus.ACTIVE)) {
                throw new BusinessException("Asset is already actively assigned to this pool", "DUPLICATE_ACTIVE_ASSIGNMENT");
            }
            List<PoolAssetAssignment> existing = assetRepo.findByAssetReferenceId(request.getAssetReferenceId());
            BigDecimal totalAssigned = existing.stream()
                    .filter(a -> a.getAssignmentStatus() == AssignmentStatus.ACTIVE)
                    .map(PoolAssetAssignment::getAssignedAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalAssigned.add(request.getAssignedAmount()).compareTo(request.getCurrentOutstanding()) > 0) {
                throw new BusinessException(
                        "Asset over-assigned: total assigned across pools ("
                                + totalAssigned.add(request.getAssignedAmount()).toPlainString()
                                + ") exceeds current outstanding ("
                                + request.getCurrentOutstanding().toPlainString() + ")",
                        "ASSET_OVER_ASSIGNED");
            }
        }

        PoolAssetAssignment assignment = PoolAssetAssignment.builder()
                .poolId(poolId)
                .assetType(AssetType.valueOf(request.getAssetType()))
                .assetReferenceId(request.getAssetReferenceId())
                .assetReferenceCode(request.getAssetReferenceCode())
                .assetDescription(request.getAssetDescription())
                .assignedAmount(request.getAssignedAmount())
                .currentOutstanding(request.getCurrentOutstanding())
                .currencyCode(request.getCurrencyCode())
                .assignedDate(LocalDate.now())
                .assignmentStatus(AssignmentStatus.ACTIVE)
                .expectedReturnRate(request.getExpectedReturnRate())
                .contractTypeCode(request.getContractTypeCode())
                .maturityDate(request.getMaturityDate())
                .tenantId(pool.getTenantId())
                .build();

        assignment = assetRepo.save(assignment);
        refreshPoolBalance(poolId);
        log.info("Asset assigned to pool {}: assignmentId={}, assetRef={}, amount={}",
                pool.getPoolCode(), assignment.getId(), request.getAssetReferenceCode(), request.getAssignedAmount());

        return toAssetResponse(assignment);
    }

    public void unassignAssetFromPool(Long assignmentId, String reason) {
        PoolAssetAssignment assignment = assetRepo.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolAssetAssignment", "id", assignmentId));

        if (assignment.getAssignmentStatus() != AssignmentStatus.ACTIVE) {
            throw new BusinessException(
                    "Cannot unassign asset with status " + assignment.getAssignmentStatus(),
                    "INVALID_ASSIGNMENT_STATUS");
        }

        assignment.setAssignmentStatus(AssignmentStatus.UNASSIGNED);
        assignment.setUnassignedDate(LocalDate.now());
        assetRepo.save(assignment);
        refreshPoolBalance(assignment.getPoolId());

        log.info("Asset unassigned from pool: assignmentId={}, reason={}", assignmentId, reason);
    }

    public void transferAssetBetweenPools(Long assignmentId, Long newPoolId, BigDecimal transferAmount, String reason) {
        PoolAssetAssignment original = assetRepo.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("PoolAssetAssignment", "id", assignmentId));

        if (original.getAssignmentStatus() != AssignmentStatus.ACTIVE) {
            throw new BusinessException(
                    "Cannot transfer asset with status " + original.getAssignmentStatus(),
                    "INVALID_ASSIGNMENT_STATUS");
        }

        if (transferAmount.compareTo(original.getAssignedAmount()) > 0) {
            throw new BusinessException(
                    "Transfer amount (" + transferAmount.toPlainString()
                            + ") exceeds assigned amount (" + original.getAssignedAmount().toPlainString() + ")",
                    "TRANSFER_EXCEEDS_ASSIGNED");
        }

        InvestmentPool targetPool = findActivePool(newPoolId);

        // Validate currency compatibility between source asset and target pool
        InvestmentPool sourcePool = findActivePool(original.getPoolId());
        if (original.getCurrencyCode() != null && targetPool.getCurrencyCode() != null
                && !original.getCurrencyCode().equals(targetPool.getCurrencyCode())) {
            throw new BusinessException(
                    "Asset currency (" + original.getCurrencyCode()
                            + ") does not match target pool currency (" + targetPool.getCurrencyCode() + ")",
                    "CURRENCY_MISMATCH");
        }
        if (sourcePool.getCurrencyCode() != null && targetPool.getCurrencyCode() != null
                && !sourcePool.getCurrencyCode().equals(targetPool.getCurrencyCode())) {
            throw new BusinessException(
                    "Source pool currency (" + sourcePool.getCurrencyCode()
                            + ") does not match target pool currency (" + targetPool.getCurrencyCode() + ")",
                    "POOL_CURRENCY_MISMATCH");
        }

        // Reduce or mark original assignment
        BigDecimal remaining = original.getAssignedAmount().subtract(transferAmount);
        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            original.setAssignmentStatus(AssignmentStatus.TRANSFERRED);
            original.setUnassignedDate(LocalDate.now());
        } else {
            original.setAssignedAmount(remaining);
        }
        assetRepo.save(original);

        // Create new assignment on target pool
        PoolAssetAssignment newAssignment = PoolAssetAssignment.builder()
                .poolId(newPoolId)
                .assetType(original.getAssetType())
                .assetReferenceId(original.getAssetReferenceId())
                .assetReferenceCode(original.getAssetReferenceCode())
                .assetDescription(original.getAssetDescription())
                .assignedAmount(transferAmount)
                .currentOutstanding(original.getCurrentOutstanding())
                .currencyCode(original.getCurrencyCode())
                .assignedDate(LocalDate.now())
                .assignmentStatus(AssignmentStatus.ACTIVE)
                .expectedReturnRate(original.getExpectedReturnRate())
                .riskWeight(original.getRiskWeight())
                .contractTypeCode(original.getContractTypeCode())
                .maturityDate(original.getMaturityDate())
                .tenantId(targetPool.getTenantId())
                .build();

        newAssignment = assetRepo.save(newAssignment);
        refreshPoolBalance(original.getPoolId());
        refreshPoolBalance(newPoolId);

        log.info("AUDIT: Asset transfer - assignmentId={}, fromPool={}, toPool={}, amount={}, "
                        + "newAssignmentId={}, reason={}, actor={}",
                assignmentId, original.getPoolId(), targetPool.getPoolCode(), transferAmount,
                newAssignment.getId(), reason, actorProvider.getCurrentActor());
    }

    // ── Segregation Validation ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public SegregationValidationResult validatePoolSegregation(Long poolId) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));

        BigDecimal totalAssets = assetRepo.sumAssignedAmountByPoolId(poolId);
        BigDecimal totalLiabilities = participantRepo.sumParticipationBalanceByPoolId(poolId);
        BigDecimal mismatch = totalAssets.subtract(totalLiabilities);
        BigDecimal mismatchPct = totalAssets.compareTo(BigDecimal.ZERO) > 0
                ? mismatch.multiply(new BigDecimal("100")).divide(totalAssets, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Check for over-assigned assets across pools
        boolean hasOverAssigned = false;
        List<SegregationValidationResult.OverAssignmentAlert> overAssignments = new ArrayList<>();
        List<PoolAssetAssignment> activeAssignments = assetRepo
                .findByPoolIdAndAssignmentStatus(poolId, AssignmentStatus.ACTIVE);
        for (PoolAssetAssignment assignment : activeAssignments) {
            if (assignment.getAssetReferenceId() != null) {
                BigDecimal totalAcrossPools = assetRepo
                        .sumAssignedAmountByAssetReferenceId(assignment.getAssetReferenceId());
                if (totalAcrossPools.compareTo(assignment.getCurrentOutstanding()) > 0) {
                    hasOverAssigned = true;
                    overAssignments.add(SegregationValidationResult.OverAssignmentAlert.builder()
                            .assetReferenceId(assignment.getAssetReferenceId())
                            .assetReferenceCode(assignment.getAssetReferenceCode())
                            .assignedAcrossPools(totalAcrossPools)
                            .currentOutstanding(assignment.getCurrentOutstanding())
                            .excessAmount(totalAcrossPools.subtract(assignment.getCurrentOutstanding()))
                            .build());
                }
            }
        }

        // Currency validation: all assets must match pool currency
        String poolCurrency = pool.getCurrencyCode();
        List<String> currencyMismatches = activeAssignments.stream()
                .filter(a -> a.getCurrencyCode() != null && !a.getCurrencyCode().equals(poolCurrency))
                .map(a -> a.getAssetReferenceCode() + " (" + a.getCurrencyCode() + ")")
                .toList();
        boolean hasCurrencyMismatch = !currencyMismatches.isEmpty();
        if (hasCurrencyMismatch) {
            log.warn("Pool {} has {} assets with currency mismatch: {}", poolId, currencyMismatches.size(), currencyMismatches);
        }

        // Maturity check: flag assets matured but still marked ACTIVE
        List<String> overdueAssets = activeAssignments.stream()
                .filter(a -> a.getMaturityDate() != null && a.getMaturityDate().isBefore(LocalDate.now()))
                .map(PoolAssetAssignment::getAssetReferenceCode)
                .toList();
        boolean hasOverdueAssets = !overdueAssets.isEmpty();
        if (hasOverdueAssets) {
            log.warn("Pool {} has {} overdue (matured but still ACTIVE) assets: {}", poolId, overdueAssets.size(), overdueAssets);
        }

        // Defaulted asset check - query ALL assignments (not just ACTIVE) to find DEFAULTED ones
        List<PoolAssetAssignment> allAssignments = assetRepo.findByPoolId(poolId);
        long defaultedCount = allAssignments.stream()
                .filter(a -> a.getAssignmentStatus() == AssignmentStatus.DEFAULTED)
                .count();
        if (defaultedCount > 0) {
            log.warn("Pool {} has {} defaulted assets", poolId, defaultedCount);
        }

        boolean isSegregated = mismatchPct.abs().compareTo(new BigDecimal("5.0000")) <= 0 && !hasOverAssigned && !hasCurrencyMismatch;

        return SegregationValidationResult.builder()
                .poolId(poolId)
                .poolCode(pool.getPoolCode())
                .isSegregated(isSegregated)
                .totalAssignedAssets(totalAssets)
                .totalParticipantBalances(totalLiabilities)
                .mismatchAmount(mismatch)
                .mismatchPercentage(mismatchPct)
                .hasOverAssignedAssets(hasOverAssigned)
                .overAssignments(overAssignments)
                .hasCurrencyMismatch(hasCurrencyMismatch)
                .currencyMismatches(currencyMismatches)
                .hasOverdueAssets(hasOverdueAssets)
                .overdueAssets(overdueAssets)
                .defaultedAssetCount(defaultedCount)
                .validatedAt(LocalDateTime.now().toString())
                .build();
    }

    @Transactional(readOnly = true)
    public List<SegregationValidationResult> validateAllPoolSegregation() {
        return poolRepo.findByStatus(PoolStatus.ACTIVE).stream()
                .map(InvestmentPool::getId)
                .map(this::validatePoolSegregation)
                .toList();
    }

    // ── Income Recording ───────────────────────────────────────────────

    public PoolIncomeRecordResponse recordIncome(Long poolId, RecordPoolIncomeRequest request) {
        InvestmentPool pool = findActivePool(poolId);

        PoolAssetAssignment assignment = null;
        if (request.getAssetAssignmentId() != null) {
            assignment = assetRepo.findById(request.getAssetAssignmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "PoolAssetAssignment", "id", request.getAssetAssignmentId()));
            if (!poolId.equals(assignment.getPoolId())) {
                throw new BusinessException("Asset assignment does not belong to the specified pool", "ASSIGNMENT_POOL_MISMATCH");
            }
            if (assignment.getAssignmentStatus() != AssignmentStatus.ACTIVE) {
                throw new BusinessException("Income can only be recorded on ACTIVE asset assignments", "INVALID_ASSIGNMENT_STATUS");
            }
        }

        IncomeType type = IncomeType.valueOf(request.getIncomeType());
        boolean isCharity = type == IncomeType.LATE_PAYMENT_CHARITY;

        PoolIncomeRecord record = PoolIncomeRecord.builder()
                .poolId(poolId)
                .assetAssignmentId(request.getAssetAssignmentId())
                .incomeType(type)
                .amount(request.getAmount())
                .currencyCode(request.getCurrencyCode())
                .incomeDate(request.getIncomeDate())
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .journalRef(request.getJournalRef())
                .assetReferenceCode(request.getAssetReferenceCode() != null
                        ? request.getAssetReferenceCode()
                        : assignment != null ? assignment.getAssetReferenceCode() : null)
                .contractTypeCode(request.getContractTypeCode() != null
                        ? request.getContractTypeCode()
                        : assignment != null ? assignment.getContractTypeCode() : null)
                .isCharityIncome(isCharity)
                .notes(request.getNotes())
                .createdBy(actorProvider.getCurrentActor())
                .tenantId(pool.getTenantId())
                .build();

        record = incomeRepo.save(record);
        if (assignment != null) {
            assignment.setLastIncomeDate(request.getIncomeDate());
            assetRepo.save(assignment);
        }

        // GL integration: if no journal reference was provided, log a warning for manual reconciliation
        if (request.getJournalRef() == null || request.getJournalRef().isBlank()) {
            log.warn("Income record {} for pool {} has no GL journal reference. "
                    + "Ensure a corresponding GL entry is posted for amount={}, type={}, currency={}",
                    record.getId(), pool.getPoolCode(), request.getAmount(), type, request.getCurrencyCode());
        }

        log.info("Income recorded for pool {}: type={}, amount={}, charity={}",
                pool.getPoolCode(), type, request.getAmount(), isCharity);

        return toIncomeResponse(record);
    }

    // ── Expense Recording ──────────────────────────────────────────────

    public PoolExpenseRecordResponse recordExpense(Long poolId, RecordPoolExpenseRequest request) {
        InvestmentPool pool = findActivePool(poolId);

        // Validate that expenseDate falls within the specified period
        if (request.getExpenseDate() != null && request.getPeriodFrom() != null && request.getPeriodTo() != null) {
            if (request.getExpenseDate().isBefore(request.getPeriodFrom())
                    || request.getExpenseDate().isAfter(request.getPeriodTo())) {
                throw new BusinessException(
                        "Expense date (" + request.getExpenseDate()
                                + ") must fall within the period " + request.getPeriodFrom()
                                + " to " + request.getPeriodTo(),
                        "EXPENSE_DATE_OUT_OF_PERIOD");
            }
        }

        ExpenseType expenseType = ExpenseType.valueOf(request.getExpenseType());
        ExpenseAllocationMethod allocationMethod = request.getAllocationMethod() != null
                ? ExpenseAllocationMethod.valueOf(request.getAllocationMethod())
                : ExpenseAllocationMethod.DIRECT;
        BigDecimal amount = resolveExpenseAmount(poolId, request.getAmount(), request.getPeriodFrom(), request.getPeriodTo(), allocationMethod);

        PoolExpenseRecord record = PoolExpenseRecord.builder()
                .poolId(poolId)
                .expenseType(expenseType)
                .amount(amount)
                .currencyCode(request.getCurrencyCode())
                .expenseDate(request.getExpenseDate())
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .journalRef(request.getJournalRef())
                .description(request.getDescription())
                .allocationMethod(allocationMethod)
                .allocationBasis(resolveAllocationBasis(poolId, allocationMethod, request.getAllocationBasis()))
                .createdBy(actorProvider.getCurrentActor())
                .tenantId(pool.getTenantId())
                .build();

        record = expenseRepo.save(record);

        // GL integration: if no journal reference was provided, log a warning for manual reconciliation
        if (request.getJournalRef() == null || request.getJournalRef().isBlank()) {
            log.warn("Expense record {} for pool {} has no GL journal reference. "
                    + "Ensure a corresponding GL entry is posted for amount={}, type={}, currency={}",
                    record.getId(), pool.getPoolCode(), amount, expenseType, request.getCurrencyCode());
        }

        log.info("Expense recorded for pool {}: type={}, amount={}",
                pool.getPoolCode(), expenseType, amount);

        return toExpenseResponse(record);
    }

    // ── Portfolio ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PoolPortfolio getPoolPortfolio(Long poolId) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));

        List<PoolAssetAssignment> activeAssets = assetRepo
                .findByPoolIdAndAssignmentStatus(poolId, AssignmentStatus.ACTIVE);
        List<PoolAssetAssignmentResponse> assetResponses = activeAssets.stream()
                .map(this::toAssetResponse)
                .toList();

        BigDecimal totalAssigned = activeAssets.stream()
                .map(PoolAssetAssignment::getAssignedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Composition by contract type
        Map<String, BigDecimal> compositionByType = activeAssets.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getContractTypeCode() != null ? a.getContractTypeCode() : a.getAssetType().name(),
                        Collectors.reducing(BigDecimal.ZERO, PoolAssetAssignment::getAssignedAmount, BigDecimal::add)));

        // Composition percentage
        Map<String, BigDecimal> compositionPercentage = new HashMap<>();
        if (totalAssigned.compareTo(BigDecimal.ZERO) > 0) {
            compositionByType.forEach((key, value) ->
                    compositionPercentage.put(key,
                            value.multiply(new BigDecimal("100"))
                                    .divide(totalAssigned, 4, RoundingMode.HALF_UP)));
        }

        return PoolPortfolio.builder()
                .poolId(poolId)
                .poolCode(pool.getPoolCode())
                .assets(assetResponses)
                .totalAssigned(totalAssigned)
                .compositionByType(compositionByType)
                .compositionPercentage(compositionPercentage)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PoolAssetAssignmentResponse> getPoolAssets(Long poolId) {
        return assetRepo.findByPoolId(poolId).stream()
                .map(this::toAssetResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PoolIncomeRecordResponse> getPoolIncome(Long poolId, LocalDate from, LocalDate to) {
        return incomeRepo.findByPoolIdAndIncomeDateBetween(poolId, from, to).stream()
                .map(this::toIncomeResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PoolExpenseRecordResponse> getPoolExpenses(Long poolId, LocalDate from, LocalDate to) {
        return expenseRepo.findByPoolIdAndExpenseDateBetween(poolId, from, to).stream()
                .map(this::toExpenseResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BigDecimal getPoolAssetBalance(Long poolId) {
        return assetRepo.sumAssignedAmountByPoolId(poolId);
    }

    @Transactional(readOnly = true)
    public Map<String, BigDecimal> getPoolAssetComposition(Long poolId) {
        return assetRepo.findByPoolIdAndAssignmentStatus(poolId, AssignmentStatus.ACTIVE).stream()
                .collect(Collectors.groupingBy(
                        assignment -> assignment.getContractTypeCode() != null
                                ? assignment.getContractTypeCode()
                                : assignment.getAssetType().name(),
                        Collectors.reducing(BigDecimal.ZERO, PoolAssetAssignment::getAssignedAmount, BigDecimal::add)
                ));
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private InvestmentPool findActivePool(Long poolId) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
        if (pool.getStatus() != PoolStatus.ACTIVE) {
            throw new BusinessException(
                    "Pool " + pool.getPoolCode() + " is not active (status: " + pool.getStatus() + ")",
                    "POOL_NOT_ACTIVE");
        }
        return pool;
    }

    private void refreshPoolBalance(Long poolId) {
        InvestmentPool pool = poolRepo.findById(poolId)
                .orElseThrow(() -> new ResourceNotFoundException("InvestmentPool", "id", poolId));
        pool.setTotalPoolBalance(assetRepo.sumAssignedAmountByPoolId(poolId));
        poolRepo.save(pool);
    }

    private BigDecimal resolveExpenseAmount(Long poolId, BigDecimal requestedAmount,
                                            LocalDate periodFrom, LocalDate periodTo,
                                            ExpenseAllocationMethod method) {
        if (requestedAmount == null || method == ExpenseAllocationMethod.DIRECT || method == ExpenseAllocationMethod.FIXED) {
            return requestedAmount;
        }

        List<InvestmentPool> activePools = poolRepo.findByStatus(PoolStatus.ACTIVE);
        if (activePools.size() <= 1) {
            return requestedAmount;
        }

        BigDecimal poolBasis;
        BigDecimal totalBasis;
        if (method == ExpenseAllocationMethod.PRO_RATA_BY_INCOME) {
            poolBasis = incomeRepo.sumDistributableIncome(poolId, periodFrom, periodTo);
            totalBasis = activePools.stream()
                    .map(InvestmentPool::getId)
                    .map(id -> incomeRepo.sumDistributableIncome(id, periodFrom, periodTo))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            poolBasis = assetRepo.sumAssignedAmountByPoolId(poolId);
            totalBasis = activePools.stream()
                    .map(InvestmentPool::getId)
                    .map(assetRepo::sumAssignedAmountByPoolId)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        if (totalBasis.compareTo(BigDecimal.ZERO) <= 0) {
            return requestedAmount;
        }

        return requestedAmount.multiply(poolBasis)
                .divide(totalBasis, 4, RoundingMode.HALF_UP);
    }

    private String resolveAllocationBasis(Long poolId, ExpenseAllocationMethod method, String requestedBasis) {
        if (requestedBasis != null && !requestedBasis.isBlank()) {
            return requestedBasis;
        }
        return switch (method) {
            case PRO_RATA_BY_ASSET_SIZE -> "Allocated pro-rata by active pool asset balance for pool " + poolId;
            case PRO_RATA_BY_INCOME -> "Allocated pro-rata by distributable income for pool " + poolId;
            case FIXED -> "Fixed allocation";
            case DIRECT -> "Direct charge to pool";
        };
    }

    private PoolAssetAssignmentResponse toAssetResponse(PoolAssetAssignment a) {
        return PoolAssetAssignmentResponse.builder()
                .id(a.getId())
                .poolId(a.getPoolId())
                .assetType(a.getAssetType())
                .assetReferenceId(a.getAssetReferenceId())
                .assetReferenceCode(a.getAssetReferenceCode())
                .assetDescription(a.getAssetDescription())
                .assignedAmount(a.getAssignedAmount())
                .currentOutstanding(a.getCurrentOutstanding())
                .currencyCode(a.getCurrencyCode())
                .assignedDate(a.getAssignedDate())
                .unassignedDate(a.getUnassignedDate())
                .assignmentStatus(a.getAssignmentStatus())
                .expectedReturnRate(a.getExpectedReturnRate())
                .riskWeight(a.getRiskWeight())
                .contractTypeCode(a.getContractTypeCode())
                .maturityDate(a.getMaturityDate())
                .lastIncomeDate(a.getLastIncomeDate())
                .tenantId(a.getTenantId())
                .build();
    }

    private PoolIncomeRecordResponse toIncomeResponse(PoolIncomeRecord r) {
        return PoolIncomeRecordResponse.builder()
                .id(r.getId())
                .poolId(r.getPoolId())
                .assetAssignmentId(r.getAssetAssignmentId())
                .incomeType(r.getIncomeType())
                .amount(r.getAmount())
                .currencyCode(r.getCurrencyCode())
                .incomeDate(r.getIncomeDate())
                .periodFrom(r.getPeriodFrom())
                .periodTo(r.getPeriodTo())
                .journalRef(r.getJournalRef())
                .assetReferenceCode(r.getAssetReferenceCode())
                .contractTypeCode(r.getContractTypeCode())
                .isCharityIncome(r.isCharityIncome())
                .notes(r.getNotes())
                .tenantId(r.getTenantId())
                .createdAt(r.getCreatedAt())
                .createdBy(r.getCreatedBy())
                .build();
    }

    private PoolExpenseRecordResponse toExpenseResponse(PoolExpenseRecord e) {
        return PoolExpenseRecordResponse.builder()
                .id(e.getId())
                .poolId(e.getPoolId())
                .expenseType(e.getExpenseType())
                .amount(e.getAmount())
                .currencyCode(e.getCurrencyCode())
                .expenseDate(e.getExpenseDate())
                .periodFrom(e.getPeriodFrom())
                .periodTo(e.getPeriodTo())
                .journalRef(e.getJournalRef())
                .description(e.getDescription())
                .allocationMethod(e.getAllocationMethod())
                .allocationBasis(e.getAllocationBasis())
                .approvedBy(e.getApprovedBy())
                .tenantId(e.getTenantId())
                .createdAt(e.getCreatedAt())
                .createdBy(e.getCreatedBy())
                .build();
    }
}
