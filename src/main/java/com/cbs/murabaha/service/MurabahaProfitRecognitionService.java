package com.cbs.murabaha.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.murabaha.dto.MurabahaProfitRecognitionReport;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.murabaha.repository.MurabahaInstallmentRepository;
import com.cbs.profitdistribution.dto.RecordPoolExpenseRequest;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.entity.ExpenseAllocationMethod;
import com.cbs.profitdistribution.entity.ExpenseType;
import com.cbs.profitdistribution.entity.IncomeType;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MurabahaProfitRecognitionService {

    private final MurabahaContractRepository contractRepository;
    private final MurabahaInstallmentRepository installmentRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;

    public void recogniseProfitForPeriod(Long contractId, LocalDate fromDate, LocalDate toDate) {
        MurabahaContract contract = getContract(contractId);
        if (contract.getStatus() != MurabahaDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MurabahaDomainEnums.ContractStatus.EXECUTED
                && contract.getStatus() != MurabahaDomainEnums.ContractStatus.EARLY_SETTLED) {
            throw new BusinessException("Murabaha profit recognition requires an executed contract",
                    "INVALID_CONTRACT_STATUS");
        }
        if (Boolean.TRUE.equals(contract.getProfitRecognitionSuspended())) {
            log.warn("Profit recognition is suspended for contract {}. Skipping.", contract.getContractRef());
            return;
        }

        // Idempotency: skip if profit was already recognised for this exact period
        if (contract.getLastProfitRecognitionDate() != null
                && !contract.getLastProfitRecognitionDate().isBefore(toDate)) {
            log.debug("Profit already recognised up to {} for contract {}. Skipping.",
                    contract.getLastProfitRecognitionDate(), contract.getContractRef());
            return;
        }

        BigDecimal targetCumulative = calculateTargetCumulativeRecognition(contract, toDate);
        BigDecimal amountToRecognise = MurabahaSupport.money(targetCumulative.subtract(contract.getRecognisedProfit()));
        if (amountToRecognise.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (amountToRecognise.compareTo(contract.getUnrecognisedProfit()) > 0) {
            amountToRecognise = MurabahaSupport.money(contract.getUnrecognisedProfit());
        }

        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.PROFIT_RECOGNITION)
                .accountId(contract.getAccountId())
                .amount(amountToRecognise)
                .profit(amountToRecognise)
                .valueDate(toDate)
                .reference(contract.getContractRef() + "-PROF-" + toDate)
                .build());

        contract.setRecognisedProfit(MurabahaSupport.money(contract.getRecognisedProfit().add(amountToRecognise)));
        contract.setUnrecognisedProfit(MurabahaSupport.money(contract.getTotalDeferredProfit().subtract(contract.getRecognisedProfit())));
        contract.setLastProfitRecognitionDate(toDate);
        contractRepository.save(contract);

        recordPoolIncome(contract, amountToRecognise, fromDate, toDate, journal.getJournalNumber());
    }

    public void recogniseProfitBatch(LocalDate fromDate, LocalDate toDate) {
        List<MurabahaContract> activeContracts = contractRepository.findByStatus(MurabahaDomainEnums.ContractStatus.ACTIVE);
        List<MurabahaContract> executedContracts = contractRepository.findByStatus(MurabahaDomainEnums.ContractStatus.EXECUTED);
        List<MurabahaContract> earlySettledContracts = contractRepository.findByStatus(MurabahaDomainEnums.ContractStatus.EARLY_SETTLED);
        java.util.stream.Stream.of(activeContracts.stream(), executedContracts.stream(), earlySettledContracts.stream())
                .flatMap(s -> s)
                .forEach(contract -> {
                    try {
                        recogniseProfitForPeriod(contract.getId(), fromDate, toDate);
                    } catch (Exception ex) {
                        log.error("Failed to recognise profit for contract {} (id={}): {}",
                                contract.getContractRef(), contract.getId(), ex.getMessage(), ex);
                    }
                });
    }

    public void recogniseProfitOnRepayment(Long contractId, BigDecimal profitPaid, String journalRef) {
        MurabahaContract contract = getContract(contractId);
        if (profitPaid == null || profitPaid.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        // Fix #13: Idempotency guard — if this journal ref was already used for recognition, skip
        if (journalRef != null && contract.getLastProfitRecognitionRef() != null
                && contract.getLastProfitRecognitionRef().equals(journalRef)) {
            log.info("Profit recognition already recorded for contract {} with ref {} — skipping duplicate",
                    contract.getContractRef(), journalRef);
            return;
        }
        BigDecimal capped = MurabahaSupport.money(profitPaid).min(contract.getUnrecognisedProfit());

        // Post GL journal for profit recognition on repayment
        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.PROFIT_RECOGNITION)
                .accountId(contract.getAccountId())
                .amount(capped)
                .profit(capped)
                .valueDate(LocalDate.now())
                .reference(journalRef != null ? journalRef : contract.getContractRef() + "-PROF-REPAY")
                .build());

        contract.setRecognisedProfit(MurabahaSupport.money(contract.getRecognisedProfit().add(capped)));
        contract.setUnrecognisedProfit(MurabahaSupport.money(contract.getTotalDeferredProfit().subtract(contract.getRecognisedProfit())));
        contractRepository.save(contract);
        recordPoolIncome(contract, capped, LocalDate.now().withDayOfMonth(1), LocalDate.now(),
                journal.getJournalNumber() != null ? journal.getJournalNumber() : journalRef);
    }

    public void recogniseProfitOnEarlySettlement(Long contractId, BigDecimal ibraAmount) {
        MurabahaContract contract = getContract(contractId);
        BigDecimal ibra = MurabahaSupport.money(ibraAmount);
        if (ibra.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Ibra amount cannot be negative", "INVALID_IBRA_AMOUNT");
        }

        BigDecimal unrecognisedBefore = MurabahaSupport.money(contract.getUnrecognisedProfit());
        if (ibra.compareTo(unrecognisedBefore) > 0) {
            throw new BusinessException("Ibra amount exceeds unrecognised profit", "IBRA_EXCEEDS_UNRECOGNISED");
        }

        BigDecimal earnedPortion = MurabahaSupport.money(unrecognisedBefore.subtract(ibra));
        if (ibra.compareTo(BigDecimal.ZERO) > 0) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("MURABAHA")
                    .txnType(IslamicTransactionType.EARLY_SETTLEMENT)
                    .accountId(contract.getAccountId())
                    .amount(ibra)
                    .profit(ibra)
                    .valueDate(LocalDate.now())
                    .reference(contract.getContractRef() + "-IBRA")
                    .build());
        }
        if (earnedPortion.compareTo(BigDecimal.ZERO) > 0) {
            var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("MURABAHA")
                    .txnType(IslamicTransactionType.PROFIT_RECOGNITION)
                    .accountId(contract.getAccountId())
                    .amount(earnedPortion)
                    .profit(earnedPortion)
                    .valueDate(LocalDate.now())
                    .reference(contract.getContractRef() + "-PROF-EARLY")
                    .build());
            recordPoolIncome(contract, earnedPortion, LocalDate.now().withDayOfMonth(1), LocalDate.now(), journal.getJournalNumber());
        }

        contract.setIbraAmount(ibra);
        contract.setRecognisedProfit(MurabahaSupport.money(contract.getRecognisedProfit().add(earnedPortion)));
        contract.setUnrecognisedProfit(MurabahaSupport.ZERO);
        contract.setLastProfitRecognitionDate(LocalDate.now());
        contractRepository.save(contract);
    }

    public void recogniseImpairment(Long contractId, BigDecimal impairmentAmount, String reason) {
        MurabahaContract contract = getContract(contractId);
        BigDecimal amount = MurabahaSupport.money(impairmentAmount);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Impairment amount must be positive", "INVALID_IMPAIRMENT_AMOUNT");
        }
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.IMPAIRMENT_PROVISION)
                .accountId(contract.getAccountId())
                .amount(amount)
                .valueDate(LocalDate.now())
                .reference(contract.getContractRef() + "-IMPAIR")
                .narration(reason)
                .build());
        contract.setImpairmentProvisionBalance(MurabahaSupport.money(contract.getImpairmentProvisionBalance().add(amount)));
        contractRepository.save(contract);
        recordPoolExpense(contract, amount, reason);
    }

    public void reverseImpairment(Long contractId, BigDecimal reversalAmount, String reason) {
        MurabahaContract contract = getContract(contractId);
        BigDecimal amount = MurabahaSupport.money(reversalAmount);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Impairment reversal amount must be positive", "INVALID_IMPAIRMENT_REVERSAL");
        }
        if (amount.compareTo(contract.getImpairmentProvisionBalance()) > 0) {
            throw new BusinessException("Reversal amount exceeds booked impairment provision",
                    "REVERSAL_EXCEEDS_PROVISION");
        }

        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.IMPAIRMENT_REVERSAL)
                .accountId(contract.getAccountId())
                .amount(amount)
                .valueDate(LocalDate.now())
                .reference(contract.getContractRef() + "-IMPAIR-REV")
                .narration(reason)
                .build());

        contract.setImpairmentProvisionBalance(MurabahaSupport.money(contract.getImpairmentProvisionBalance().subtract(amount)));
        contractRepository.save(contract);

        // Record pool income entry to reverse the original impairment expense
        if (contract.getInvestmentPoolId() != null && contract.getPoolAssetAssignmentId() != null) {
            poolAssetManagementService.recordIncome(
                    contract.getInvestmentPoolId(),
                    RecordPoolIncomeRequest.builder()
                            .poolId(contract.getInvestmentPoolId())
                            .assetAssignmentId(contract.getPoolAssetAssignmentId())
                            .incomeType(IncomeType.MURABAHA_PROFIT.name())
                            .amount(MurabahaSupport.money(amount))
                            .currencyCode(contract.getCurrencyCode())
                            .incomeDate(LocalDate.now())
                            .periodFrom(LocalDate.now().withDayOfMonth(1))
                            .periodTo(LocalDate.now())
                            .journalRef(contract.getContractRef() + "-IMPAIR-REV")
                            .assetReferenceCode(contract.getContractRef())
                            .contractTypeCode("MURABAHA")
                            .notes("Impairment provision reversal: " + reason)
                            .build());
        }
    }

    @Transactional(readOnly = true)
    public MurabahaProfitRecognitionReport getProfitRecognitionReport(LocalDate fromDate, LocalDate toDate) {
        Collection<MurabahaDomainEnums.ContractStatus> allReportingStatuses = EnumSet.of(
                MurabahaDomainEnums.ContractStatus.ACTIVE,
                MurabahaDomainEnums.ContractStatus.EXECUTED,
                MurabahaDomainEnums.ContractStatus.EARLY_SETTLED,
                MurabahaDomainEnums.ContractStatus.SETTLED,
                MurabahaDomainEnums.ContractStatus.DEFAULTED,
                MurabahaDomainEnums.ContractStatus.WRITTEN_OFF);

        // Sum profit recognised during the period: contracts whose lastProfitRecognitionDate falls within [fromDate, toDate]
        BigDecimal recognisedThisPeriod = contractRepository.sumRecognisedProfitInPeriod(fromDate, toDate, allReportingStatuses);

        // Aggregate byType and byMethod using DB GROUP BY queries
        Map<String, BigDecimal> byType = contractRepository.sumRecognisedProfitGroupByMurabahahType(allReportingStatuses).stream()
                .collect(Collectors.toMap(
                        row -> ((MurabahaDomainEnums.MurabahahType) row[0]).name(),
                        row -> MurabahaSupport.money((BigDecimal) row[1])));

        Map<String, BigDecimal> byMethod = contractRepository.sumRecognisedProfitGroupByRecognitionMethod(allReportingStatuses).stream()
                .collect(Collectors.toMap(
                        row -> ((MurabahaDomainEnums.ProfitRecognitionMethod) row[0]).name(),
                        row -> MurabahaSupport.money((BigDecimal) row[1])));

        BigDecimal totalIbra = contractRepository.sumIbraAmountByStatuses(allReportingStatuses);
        BigDecimal totalProvision = contractRepository.sumImpairmentProvisionByStatuses(allReportingStatuses);

        return MurabahaProfitRecognitionReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .recognisedThisPeriod(MurabahaSupport.money(recognisedThisPeriod))
                .totalDeferredProfit(getTotalDeferredProfit())
                .totalRecognisedProfit(getTotalRecognisedProfit(fromDate, toDate))
                .totalIbraExpense(MurabahaSupport.money(totalIbra))
                .totalImpairmentProvision(MurabahaSupport.money(totalProvision))
                .byMurabahaType(byType)
                .byRecognitionMethod(byMethod)
                .build();
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalDeferredProfit() {
        BigDecimal total = MurabahaSupport.ZERO;
        for (MurabahaDomainEnums.ContractStatus status : List.of(
                MurabahaDomainEnums.ContractStatus.ACTIVE,
                MurabahaDomainEnums.ContractStatus.EXECUTED)) {
            total = total.add(contractRepository.sumUnrecognisedProfitByStatus(status));
        }
        return MurabahaSupport.money(total);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalRecognisedProfit(LocalDate fromDate, LocalDate toDate) {
        Collection<MurabahaDomainEnums.ContractStatus> statuses = EnumSet.of(
                MurabahaDomainEnums.ContractStatus.ACTIVE,
                MurabahaDomainEnums.ContractStatus.EXECUTED,
                MurabahaDomainEnums.ContractStatus.EARLY_SETTLED,
                MurabahaDomainEnums.ContractStatus.SETTLED);
        return MurabahaSupport.money(contractRepository.sumRecognisedProfitInPeriod(fromDate, toDate, statuses));
    }

    private BigDecimal calculateTargetCumulativeRecognition(MurabahaContract contract, LocalDate toDate) {
        if (contract.getStartDate() == null || contract.getMaturityDate() == null) {
            return contract.getRecognisedProfit();
        }
        if (toDate.isBefore(contract.getStartDate())) {
            return MurabahaSupport.ZERO;
        }

        List<MurabahaInstallment> schedule = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        if (schedule.isEmpty()) {
            return calculateTimeBasedTarget(contract, toDate);
        }

        if (contract.getProfitRecognitionMethod() == MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_TIME) {
            return calculateTimeBasedTarget(contract, toDate);
        }

        BigDecimal dueProfit = schedule.stream()
                .filter(inst -> !inst.getDueDate().isAfter(toDate))
                .map(MurabahaInstallment::getProfitComponent)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        return MurabahaSupport.money(dueProfit.min(contract.getTotalDeferredProfit()));
    }

    private BigDecimal calculateTimeBasedTarget(MurabahaContract contract, LocalDate toDate) {
        long totalDays = MurabahaSupport.elapsedDays(contract.getStartDate(), contract.getMaturityDate());
        long elapsedDays = Math.min(totalDays, MurabahaSupport.elapsedDays(contract.getStartDate(), toDate));
        if (totalDays <= 0) {
            return MurabahaSupport.ZERO;
        }
        return MurabahaSupport.money(contract.getTotalDeferredProfit()
                .multiply(BigDecimal.valueOf(elapsedDays))
                .divide(BigDecimal.valueOf(totalDays), 8, RoundingMode.HALF_UP));
    }

    private void recordPoolIncome(MurabahaContract contract,
                                  BigDecimal amount,
                                  LocalDate fromDate,
                                  LocalDate toDate,
                                  String journalRef) {
        if (contract.getInvestmentPoolId() == null
                || contract.getPoolAssetAssignmentId() == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        poolAssetManagementService.recordIncome(
                contract.getInvestmentPoolId(),
                RecordPoolIncomeRequest.builder()
                        .poolId(contract.getInvestmentPoolId())
                        .assetAssignmentId(contract.getPoolAssetAssignmentId())
                        .incomeType(IncomeType.MURABAHA_PROFIT.name())
                        .amount(MurabahaSupport.money(amount))
                        .currencyCode(contract.getCurrencyCode())
                        .incomeDate(toDate)
                        .periodFrom(fromDate)
                        .periodTo(toDate)
                        .journalRef(journalRef)
                        .assetReferenceCode(contract.getContractRef())
                        .contractTypeCode("MURABAHA")
                        .notes("Murabaha deferred profit recognition")
                        .build());
    }

    private void recordPoolExpense(MurabahaContract contract, BigDecimal amount, String reason) {
        if (contract.getInvestmentPoolId() == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        poolAssetManagementService.recordExpense(
                contract.getInvestmentPoolId(),
                RecordPoolExpenseRequest.builder()
                        .poolId(contract.getInvestmentPoolId())
                        .expenseType(ExpenseType.IMPAIRMENT_PROVISION.name())
                        .amount(MurabahaSupport.money(amount))
                        .currencyCode(contract.getCurrencyCode())
                        .expenseDate(LocalDate.now())
                        .periodFrom(LocalDate.now().withDayOfMonth(1))
                        .periodTo(LocalDate.now())
                        .description(reason)
                        .allocationMethod(ExpenseAllocationMethod.DIRECT.name())
                        .allocationBasis("Murabaha impairment")
                        .build());
    }

    private MurabahaContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
    }
}
