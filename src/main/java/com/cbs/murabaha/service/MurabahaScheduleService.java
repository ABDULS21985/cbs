package com.cbs.murabaha.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.service.LatePenaltyService;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.murabaha.dto.EarlySettlementQuote;
import com.cbs.murabaha.dto.EarlySettlementRequest;
import com.cbs.murabaha.dto.MurabahaRepaymentSummary;
import com.cbs.murabaha.dto.ProcessMurabahaRepaymentRequest;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.murabaha.repository.MurabahaInstallmentRepository;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.entity.IncomeType;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MurabahaScheduleService {

    private final MurabahaContractRepository contractRepository;
    private final MurabahaInstallmentRepository installmentRepository;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicPostingRuleService postingRuleService;
    private final AccountRepository accountRepository;
    private final PoolAssetManagementService poolAssetManagementService;
    private final LatePenaltyService latePenaltyService;
    private final AccountPostingService accountPostingService;

    public List<MurabahaInstallment> generateSchedule(Long contractId) {
        MurabahaContract contract = getContract(contractId);
        int totalInstallments = MurabahaSupport.installmentCount(contract.getTenorMonths(), contract.getRepaymentFrequency());
        BigDecimal financedCostPortion = MurabahaSupport.money(contract.getCostPrice().subtract(MurabahaSupport.money(contract.getDownPayment())));
        BigDecimal totalProfit = MurabahaSupport.money(contract.getMarkupAmount());

        List<BigDecimal> profitAllocations = buildProfitAllocations(contract, totalInstallments, financedCostPortion, totalProfit);
        List<BigDecimal> principalAllocations = buildEqualAllocations(financedCostPortion, totalInstallments);

        List<MurabahaInstallment> existing = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        if (!existing.isEmpty()) {
            boolean hasPayments = existing.stream().anyMatch(inst ->
                    inst.getStatus() == MurabahaDomainEnums.InstallmentStatus.PAID
                            || inst.getStatus() == MurabahaDomainEnums.InstallmentStatus.PARTIAL);
            if (hasPayments) {
                throw new BusinessException("Cannot regenerate schedule: installments with payments exist",
                        "SCHEDULE_HAS_PAYMENTS");
            }
            installmentRepository.deleteAll(existing);
        }

        List<MurabahaInstallment> schedule = new ArrayList<>();
        BigDecimal outstanding = financedCostPortion;
        BigDecimal cumulativePrincipal = BigDecimal.ZERO;
        BigDecimal cumulativeProfit = BigDecimal.ZERO;
        LocalDate firstDueDate = contract.getFirstInstallmentDate() != null
                ? contract.getFirstInstallmentDate()
                : MurabahaSupport.addFrequency(contract.getStartDate(), contract.getRepaymentFrequency(), 1);

        for (int i = 0; i < totalInstallments; i++) {
            BigDecimal principal = principalAllocations.get(i);
            BigDecimal profit = profitAllocations.get(i);
            LocalDate dueDate = MurabahaSupport.adjustToBusinessDay(
                    hijriCalendarService,
                    MurabahaSupport.addFrequency(firstDueDate, contract.getRepaymentFrequency(), i));
            BigDecimal outstandingAfter = MurabahaSupport.money(outstanding.subtract(principal));

            MurabahaInstallment installment = MurabahaInstallment.builder()
                    .contractId(contractId)
                    .installmentNumber(i + 1)
                    .dueDate(dueDate)
                    .dueDateHijri(MurabahaSupport.toHijriString(hijriCalendarService, dueDate))
                    .principalComponent(principal)
                    .profitComponent(profit)
                    .totalInstallmentAmount(MurabahaSupport.money(principal.add(profit)))
                    .outstandingPrincipalBefore(MurabahaSupport.money(outstanding))
                    .outstandingPrincipalAfter(outstandingAfter)
                    .cumulativePrincipalPaid(MurabahaSupport.money(cumulativePrincipal))
                    .cumulativeProfitPaid(MurabahaSupport.money(cumulativeProfit))
                    .status(MurabahaDomainEnums.InstallmentStatus.SCHEDULED)
                    .paidAmount(MurabahaSupport.ZERO)
                    .paidPrincipal(MurabahaSupport.ZERO)
                    .paidProfit(MurabahaSupport.ZERO)
                    .daysOverdue(0)
                    .latePenaltyAmount(MurabahaSupport.ZERO)
                    .build();
            schedule.add(installment);

            outstanding = outstandingAfter;
            cumulativePrincipal = cumulativePrincipal.add(principal);
            cumulativeProfit = cumulativeProfit.add(profit);
        }

        validateScheduleConservation(contract, schedule, financedCostPortion, totalProfit);
        return installmentRepository.saveAll(schedule);
    }

    @Transactional(readOnly = true)
    public List<MurabahaInstallment> getSchedule(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
    }

    public MurabahaInstallment getNextDueInstallment(Long contractId) {
        refreshPastDueStatuses(getContract(contractId));
        return installmentRepository.findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
                        contractId,
                        List.of(
                                MurabahaDomainEnums.InstallmentStatus.OVERDUE,
                                MurabahaDomainEnums.InstallmentStatus.DUE,
                                MurabahaDomainEnums.InstallmentStatus.PARTIAL,
                                MurabahaDomainEnums.InstallmentStatus.SCHEDULED))
                .orElse(null);
    }

    public List<MurabahaInstallment> getOverdueInstallments(Long contractId) {
        refreshPastDueStatuses(getContract(contractId));
        return installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(MurabahaDomainEnums.InstallmentStatus.OVERDUE));
    }

    public MurabahaInstallment processRepayment(Long contractId, ProcessMurabahaRepaymentRequest request) {
        MurabahaContract contract = getContract(contractId);
        if (contract.getStatus() != MurabahaDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MurabahaDomainEnums.ContractStatus.EXECUTED) {
            throw new BusinessException("Repayments are only allowed on active Murabaha contracts",
                    "INVALID_CONTRACT_STATUS");
        }

        if (request.getPaymentAmount() == null || request.getPaymentAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Payment amount must be positive", "INVALID_PAYMENT_AMOUNT");
        }

        refreshPastDueStatuses(contract);
        List<MurabahaInstallment> unpaidInstallments = installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(
                        MurabahaDomainEnums.InstallmentStatus.OVERDUE,
                        MurabahaDomainEnums.InstallmentStatus.DUE,
                        MurabahaDomainEnums.InstallmentStatus.PARTIAL,
                        MurabahaDomainEnums.InstallmentStatus.SCHEDULED));
        if (unpaidInstallments.isEmpty()) {
            throw new BusinessException("No unpaid Murabaha installments remain", "NO_UNPAID_INSTALLMENTS");
        }

        BigDecimal remaining = MurabahaSupport.money(request.getPaymentAmount());
        BigDecimal totalPenaltySettled = MurabahaSupport.ZERO;
        BigDecimal totalProfitSettled = MurabahaSupport.ZERO;
        BigDecimal totalPrincipalSettled = MurabahaSupport.ZERO;
        MurabahaInstallment firstTouched = null;
        String generatedRef = request.getExternalRef() != null
                ? request.getExternalRef()
                : "MRB-REPAY-" + contract.getContractRef() + "-" + Instant.now().toEpochMilli();

        // Debit customer settlement account
        Account settlementAccount = resolveReferenceAccount(contract, request.getDebitAccountId());
        if (settlementAccount != null) {
            accountPostingService.postDebitAgainstGl(
                    settlementAccount,
                    TransactionType.DEBIT,
                    request.getPaymentAmount(),
                    "Murabaha repayment for contract " + contract.getContractRef(),
                    TransactionChannel.SYSTEM,
                    generatedRef,
                    "1800-MRB-001",
                    "MURABAHA",
                    contract.getContractRef());
        }

        for (MurabahaInstallment installment : unpaidInstallments) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            if (firstTouched == null) {
                firstTouched = installment;
            }

            BigDecimal penaltyDue = MurabahaSupport.money(installment.getLatePenaltyAmount());
            BigDecimal penaltyApplied = remaining.min(penaltyDue);
            installment.setLatePenaltyAmount(MurabahaSupport.money(penaltyDue.subtract(penaltyApplied)));
            if (penaltyApplied.compareTo(BigDecimal.ZERO) > 0) {
                latePenaltyService.settlePenalty(contract.getId(), "MURABAHA", installment.getId(),
                        penaltyApplied, request.getPaymentDate(), generatedRef);
            }
            remaining = MurabahaSupport.money(remaining.subtract(penaltyApplied));
            totalPenaltySettled = totalPenaltySettled.add(penaltyApplied);

            BigDecimal profitDue = MurabahaSupport.money(installment.getProfitComponent()
                    .subtract(MurabahaSupport.money(installment.getPaidProfit())));
            BigDecimal profitApplied = remaining.min(profitDue.max(BigDecimal.ZERO));
            installment.setPaidProfit(MurabahaSupport.money(MurabahaSupport.money(installment.getPaidProfit()).add(profitApplied)));
            remaining = MurabahaSupport.money(remaining.subtract(profitApplied));
            totalProfitSettled = totalProfitSettled.add(profitApplied);

            BigDecimal principalDue = MurabahaSupport.money(installment.getPrincipalComponent()
                    .subtract(MurabahaSupport.money(installment.getPaidPrincipal())));
            BigDecimal principalApplied = remaining.min(principalDue.max(BigDecimal.ZERO));
            installment.setPaidPrincipal(MurabahaSupport.money(MurabahaSupport.money(installment.getPaidPrincipal()).add(principalApplied)));
            remaining = MurabahaSupport.money(remaining.subtract(principalApplied));
            totalPrincipalSettled = totalPrincipalSettled.add(principalApplied);

            installment.setPaidAmount(MurabahaSupport.money(MurabahaSupport.money(installment.getPaidAmount())
                    .add(penaltyApplied)
                    .add(profitApplied)
                    .add(principalApplied)));
            installment.setPaidDate(request.getPaymentDate());
            installment.setTransactionRef(generatedRef);
            installment.setNotes(request.getNarration());
            updateInstallmentStatus(installment);
            installmentRepository.save(installment);
        }

        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            // Post overpayment to suspense account
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("MURABAHA")
                    .txnType(IslamicTransactionType.FINANCING_REPAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(remaining)
                    .valueDate(request.getPaymentDate())
                    .reference(generatedRef + "-OVERPAY")
                    .narration("Overpayment suspense for contract " + contract.getContractRef())
                    .additionalContext(Map.of("suspenseType", "OVERPAYMENT_SUSPENSE"))
                    .build());
            log.warn("Overpayment of {} detected on contract {}. Posted to suspense account.",
                    remaining, contract.getContractRef());
        }

        if (totalPrincipalSettled.add(totalProfitSettled).compareTo(BigDecimal.ZERO) > 0) {
            var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("MURABAHA")
                    .txnType(IslamicTransactionType.FINANCING_REPAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(MurabahaSupport.money(totalPrincipalSettled.add(totalProfitSettled)))
                    .principal(MurabahaSupport.money(totalPrincipalSettled))
                    .profit(MurabahaSupport.money(totalProfitSettled))
                    .valueDate(request.getPaymentDate())
                    .reference(generatedRef)
                    .narration(request.getNarration())
                    .build());
            propagateJournalRef(contractId, generatedRef, journal.getJournalNumber());
        }

        if (totalPenaltySettled.compareTo(BigDecimal.ZERO) > 0) {
            log.info("AUDIT: Late penalty {} directed to charity fund for contract {} (SHARIAH-MRB-002)",
                    totalPenaltySettled, contractId);
        }

        contract.setRecognisedProfit(MurabahaSupport.money(contract.getRecognisedProfit().add(totalProfitSettled)));
        contract.setUnrecognisedProfit(MurabahaSupport.money(contract.getTotalDeferredProfit().subtract(contract.getRecognisedProfit())));
        if (areAllInstallmentsSettled(contractId)) {
            contract.setStatus(MurabahaDomainEnums.ContractStatus.SETTLED);
        } else if (contract.getStatus() == MurabahaDomainEnums.ContractStatus.EXECUTED) {
            contract.setStatus(MurabahaDomainEnums.ContractStatus.ACTIVE);
        }
        contractRepository.save(contract);

        recordPoolIncomeIfApplicable(contract, totalProfitSettled, request.getPaymentDate(), generatedRef);
        return firstTouched != null ? firstTouched : unpaidInstallments.get(0);
    }

    public void processLatePayments() {
        List<MurabahaInstallment> dueInstallments = installmentRepository.findByStatusInAndDueDateBefore(
                List.of(
                        MurabahaDomainEnums.InstallmentStatus.SCHEDULED,
                        MurabahaDomainEnums.InstallmentStatus.DUE,
                        MurabahaDomainEnums.InstallmentStatus.PARTIAL),
                LocalDate.now());

        for (MurabahaInstallment installment : dueInstallments) {
            MurabahaContract contract = getContract(installment.getContractId());
            refreshSingleInstallment(contract, installment);
            int grace = contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays();
            if (installment.getDaysOverdue() <= grace) {
                installmentRepository.save(installment);
                continue;
            }

            BigDecimal outstanding = MurabahaSupport.money(installment.getTotalInstallmentAmount()
                    .subtract(MurabahaSupport.money(installment.getPaidPrincipal()))
                    .subtract(MurabahaSupport.money(installment.getPaidProfit())));
            BigDecimal penalty = calculateLatePenalty(contract, outstanding, installment.getDaysOverdue());
            if (penalty.compareTo(BigDecimal.ZERO) <= 0) {
                installmentRepository.save(installment);
                continue;
            }

            BigDecimal previousPenalty = MurabahaSupport.money(installment.getLatePenaltyAmount());
            BigDecimal incrementalPenalty = MurabahaSupport.money(penalty.subtract(previousPenalty).max(BigDecimal.ZERO));

            if (incrementalPenalty.compareTo(BigDecimal.ZERO) > 0) {
                latePenaltyService.processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                        .contractId(contract.getId())
                        .contractRef(contract.getContractRef())
                        .contractTypeCode("MURABAHA")
                        .installmentId(installment.getId())
                        .overdueAmount(outstanding)
                        .daysOverdue(installment.getDaysOverdue())
                        .penaltyDate(LocalDate.now())
                        .build());

                contract.setTotalLatePenaltiesCharged(MurabahaSupport.money(
                        contract.getTotalLatePenaltiesCharged().add(incrementalPenalty)));
                if (Boolean.TRUE.equals(contract.getLatePenaltiesToCharity())) {
                    contract.setTotalCharityDonations(MurabahaSupport.money(
                            contract.getTotalCharityDonations().add(incrementalPenalty)));
                }
                contractRepository.save(contract);
            }

            installment.setLatePenaltyAmount(penalty);
            installmentRepository.save(installment);
        }
    }

    @Transactional(readOnly = true)
    public EarlySettlementQuote calculateEarlySettlement(Long contractId, LocalDate settlementDate) {
        MurabahaContract contract = getContract(contractId);
        List<MurabahaInstallment> unpaidInstallments = installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(
                        MurabahaDomainEnums.InstallmentStatus.SCHEDULED,
                        MurabahaDomainEnums.InstallmentStatus.DUE,
                        MurabahaDomainEnums.InstallmentStatus.PARTIAL,
                        MurabahaDomainEnums.InstallmentStatus.OVERDUE));

        BigDecimal outstandingPrincipal = unpaidInstallments.stream()
                .map(inst -> MurabahaSupport.money(inst.getPrincipalComponent().subtract(MurabahaSupport.money(inst.getPaidPrincipal()))))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal remainingBalance = unpaidInstallments.stream()
                .map(inst -> MurabahaSupport.money(inst.getTotalInstallmentAmount()
                        .subtract(MurabahaSupport.money(inst.getPaidPrincipal()))
                        .subtract(MurabahaSupport.money(inst.getPaidProfit()))))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal unrecognisedProfit = MurabahaSupport.money(contract.getUnrecognisedProfit());
        BigDecimal recognisedButUnpaidProfit = MurabahaSupport.money(
                remainingBalance.subtract(outstandingPrincipal).subtract(unrecognisedProfit).max(BigDecimal.ZERO));

        BigDecimal ibra = switch (contract.getEarlySettlementRebateMethod()) {
            case IBRA_MANDATORY -> unrecognisedProfit;
            case IBRA_DISCRETIONARY, NO_REBATE -> MurabahaSupport.ZERO;
        };

        // Enforce Ibra bounds
        if (ibra.compareTo(unrecognisedProfit) > 0) {
            throw new BusinessException("Ibra amount " + ibra + " cannot exceed unrecognised profit " + unrecognisedProfit, "IBRA_EXCEEDS_UNRECOGNISED");
        }
        if (ibra.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Ibra amount cannot be negative", "IBRA_NEGATIVE");
        }

        return EarlySettlementQuote.builder()
                .contractId(contract.getId())
                .contractRef(contract.getContractRef())
                .settlementDate(settlementDate)
                .outstandingPrincipal(outstandingPrincipal)
                .recognisedButUnpaidProfit(recognisedButUnpaidProfit)
                .unrecognisedProfit(unrecognisedProfit)
                .remainingBalance(remainingBalance)
                .ibraAmount(ibra)
                .settlementAmount(MurabahaSupport.money(remainingBalance.subtract(ibra)))
                .rebateMethod(contract.getEarlySettlementRebateMethod().name())
                .build();
    }

    public void processEarlySettlement(Long contractId, EarlySettlementRequest request) {
        MurabahaContract contract = getContract(contractId);
        if (contract.getStatus() != MurabahaDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MurabahaDomainEnums.ContractStatus.EXECUTED) {
            throw new BusinessException("Early settlement is only allowed on active Murabaha contracts",
                    "INVALID_CONTRACT_STATUS");
        }

        EarlySettlementQuote quote = calculateEarlySettlement(contractId, request.getSettlementDate());
        BigDecimal ibra = switch (contract.getEarlySettlementRebateMethod()) {
            case IBRA_MANDATORY -> quote.getUnrecognisedProfit();
            case IBRA_DISCRETIONARY -> MurabahaSupport.money(
                    request.getIbraAmount() != null ? request.getIbraAmount() : BigDecimal.ZERO)
                    .min(quote.getUnrecognisedProfit());
            case NO_REBATE -> MurabahaSupport.ZERO;
        };
        BigDecimal settlementAmount = MurabahaSupport.money(quote.getRemainingBalance().subtract(ibra));

        // Debit customer settlement account
        Account earlySettlementAccount = resolveReferenceAccount(contract, request.getDebitAccountId());
        if (earlySettlementAccount != null) {
            accountPostingService.postDebitAgainstGl(
                    earlySettlementAccount,
                    TransactionType.DEBIT,
                    settlementAmount,
                    "Murabaha early settlement for contract " + contract.getContractRef(),
                    TransactionChannel.SYSTEM,
                    (request.getExternalRef() != null ? request.getExternalRef() : contract.getContractRef()) + "-SETTLE",
                    "1800-MRB-001",
                    "MURABAHA",
                    contract.getContractRef());
        }

        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.FINANCING_REPAYMENT)
                .accountId(contract.getAccountId())
                .amount(settlementAmount)
                .principal(quote.getOutstandingPrincipal())
                .profit(quote.getRecognisedButUnpaidProfit())
                .valueDate(request.getSettlementDate())
                .reference((request.getExternalRef() != null ? request.getExternalRef() : contract.getContractRef()) + "-SETTLE")
                .build());

        if (ibra.compareTo(BigDecimal.ZERO) > 0) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("MURABAHA")
                    .txnType(IslamicTransactionType.EARLY_SETTLEMENT)
                    .accountId(contract.getAccountId())
                    .amount(ibra)
                    .profit(ibra)
                    .valueDate(request.getSettlementDate())
                    .reference(contract.getContractRef() + "-IBRA")
                    .build());
        }

        List<MurabahaInstallment> schedule = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        for (MurabahaInstallment installment : schedule) {
            if (installment.getStatus() != MurabahaDomainEnums.InstallmentStatus.PAID) {
                installment.setStatus(MurabahaDomainEnums.InstallmentStatus.WAIVED);
            }
        }
        installmentRepository.saveAll(schedule);

        contract.setEarlySettledAt(request.getSettlementDate());
        contract.setEarlySettlementAmount(settlementAmount);
        contract.setIbraAmount(ibra);
        contract.setRecognisedProfit(MurabahaSupport.money(contract.getTotalDeferredProfit().subtract(ibra)));
        contract.setUnrecognisedProfit(MurabahaSupport.ZERO);
        contract.setStatus(MurabahaDomainEnums.ContractStatus.EARLY_SETTLED);
        contractRepository.save(contract);
    }

    @Transactional(readOnly = true)
    public MurabahaRepaymentSummary getRepaymentSummary(Long contractId) {
        MurabahaContract contract = getContract(contractId);
        List<MurabahaInstallment> schedule = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        BigDecimal totalPaid = schedule.stream()
                .map(inst -> MurabahaSupport.money(inst.getPaidAmount()))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal principalPaid = schedule.stream()
                .map(inst -> MurabahaSupport.money(inst.getPaidPrincipal()))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal profitPaid = schedule.stream()
                .map(inst -> MurabahaSupport.money(inst.getPaidProfit()))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal latePenaltyOutstanding = schedule.stream()
                .map(inst -> MurabahaSupport.money(inst.getLatePenaltyAmount()))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal remainingBalance = schedule.stream()
                .filter(inst -> inst.getStatus() != MurabahaDomainEnums.InstallmentStatus.WAIVED)
                .map(inst -> MurabahaSupport.money(inst.getTotalInstallmentAmount()
                        .subtract(MurabahaSupport.money(inst.getPaidPrincipal()))
                        .subtract(MurabahaSupport.money(inst.getPaidProfit()))
                        .add(MurabahaSupport.money(inst.getLatePenaltyAmount()))))
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal completionPct = contract.getFinancedAmount().compareTo(BigDecimal.ZERO) > 0
                ? totalPaid.multiply(MurabahaSupport.HUNDRED)
                .divide(contract.getFinancedAmount(), 8, RoundingMode.HALF_UP).min(MurabahaSupport.HUNDRED)
                : BigDecimal.ZERO;

        return MurabahaRepaymentSummary.builder()
                .contractId(contract.getId())
                .contractRef(contract.getContractRef())
                .financedAmount(contract.getFinancedAmount())
                .totalPaid(totalPaid)
                .principalPaid(principalPaid)
                .profitPaid(profitPaid)
                .latePenaltyPaid(MurabahaSupport.money(contract.getTotalLatePenaltiesCharged().subtract(latePenaltyOutstanding)))
                .remainingBalance(remainingBalance)
                .overdueAmount(schedule.stream()
                        .filter(inst -> inst.getStatus() == MurabahaDomainEnums.InstallmentStatus.OVERDUE)
                        .map(inst -> MurabahaSupport.money(inst.getTotalInstallmentAmount()
                                .subtract(MurabahaSupport.money(inst.getPaidPrincipal()))
                                .subtract(MurabahaSupport.money(inst.getPaidProfit()))
                                .add(MurabahaSupport.money(inst.getLatePenaltyAmount()))))
                        .reduce(MurabahaSupport.ZERO, BigDecimal::add))
                .completionPercentage(MurabahaSupport.money(completionPct))
                .nextDueInstallment(getNextDueInstallment(contractId))
                .build();
    }

    private void validateScheduleConservation(MurabahaContract contract,
                                              List<MurabahaInstallment> schedule,
                                              BigDecimal financedCostPortion,
                                              BigDecimal totalProfit) {
        BigDecimal principalTotal = schedule.stream()
                .map(MurabahaInstallment::getPrincipalComponent)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal profitTotal = schedule.stream()
                .map(MurabahaInstallment::getProfitComponent)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal installmentTotal = schedule.stream()
                .map(MurabahaInstallment::getTotalInstallmentAmount)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal expectedTotal = MurabahaSupport.money(financedCostPortion.add(totalProfit));
        if (principalTotal.compareTo(MurabahaSupport.money(financedCostPortion)) != 0
                || profitTotal.compareTo(MurabahaSupport.money(totalProfit)) != 0
                || installmentTotal.compareTo(expectedTotal) != 0) {
            throw new BusinessException("Murabaha installment schedule failed conservation validation for contract "
                    + contract.getContractRef(), "SCHEDULE_CONSERVATION_FAILED");
        }
    }

    private List<BigDecimal> buildEqualAllocations(BigDecimal total, int count) {
        List<BigDecimal> allocations = new ArrayList<>(count);
        BigDecimal running = BigDecimal.ZERO;
        BigDecimal base = total.divide(BigDecimal.valueOf(count), 8, RoundingMode.HALF_UP);
        for (int i = 0; i < count; i++) {
            BigDecimal value = i == count - 1
                    ? MurabahaSupport.money(total.subtract(running))
                    : MurabahaSupport.money(base);
            allocations.add(value);
            running = running.add(value);
        }
        return allocations;
    }

    private List<BigDecimal> buildProfitAllocations(MurabahaContract contract,
                                                    int totalInstallments,
                                                    BigDecimal financedCostPortion,
                                                    BigDecimal totalProfit) {
        if (contract.getProfitRecognitionMethod() == MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_TIME) {
            return buildEqualAllocations(totalProfit, totalInstallments);
        }

        if (contract.getProfitRecognitionMethod() == MurabahaDomainEnums.ProfitRecognitionMethod.SUM_OF_DIGITS) {
            List<BigDecimal> allocations = new ArrayList<>(totalInstallments);
            BigDecimal sumDigits = BigDecimal.valueOf((long) totalInstallments * (totalInstallments + 1) / 2L);
            BigDecimal running = BigDecimal.ZERO;
            for (int i = 1; i <= totalInstallments; i++) {
                BigDecimal weight = BigDecimal.valueOf(totalInstallments - i + 1L);
                BigDecimal value = i == totalInstallments
                        ? MurabahaSupport.money(totalProfit.subtract(running))
                        : MurabahaSupport.money(totalProfit.multiply(weight).divide(sumDigits, 8, RoundingMode.HALF_UP));
                allocations.add(value);
                running = running.add(value);
            }
            return allocations;
        }

        List<BigDecimal> outstandingWeights = new ArrayList<>(totalInstallments);
        BigDecimal equalPrincipal = financedCostPortion.divide(BigDecimal.valueOf(totalInstallments), 8, RoundingMode.HALF_UP);
        BigDecimal outstanding = financedCostPortion;
        BigDecimal totalWeight = BigDecimal.ZERO;
        for (int i = 0; i < totalInstallments; i++) {
            outstandingWeights.add(outstanding);
            totalWeight = totalWeight.add(outstanding);
            outstanding = outstanding.subtract(equalPrincipal);
        }

        List<BigDecimal> allocations = new ArrayList<>(totalInstallments);
        BigDecimal running = BigDecimal.ZERO;
        for (int i = 0; i < totalInstallments; i++) {
            BigDecimal value = i == totalInstallments - 1
                    ? MurabahaSupport.money(totalProfit.subtract(running))
                    : MurabahaSupport.money(totalProfit.multiply(outstandingWeights.get(i))
                    .divide(totalWeight, 8, RoundingMode.HALF_UP));
            allocations.add(value);
            running = running.add(value);
        }
        return allocations;
    }

    private void updateInstallmentStatus(MurabahaInstallment installment) {
        boolean fullyPaid = MurabahaSupport.money(installment.getPrincipalComponent()).compareTo(
                MurabahaSupport.money(installment.getPaidPrincipal())) == 0
                && MurabahaSupport.money(installment.getProfitComponent()).compareTo(
                MurabahaSupport.money(installment.getPaidProfit())) == 0
                && MurabahaSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) == 0;

        if (fullyPaid) {
            installment.setStatus(MurabahaDomainEnums.InstallmentStatus.PAID);
            return;
        }
        installment.setStatus(installment.getPaidAmount() != null
                && installment.getPaidAmount().compareTo(BigDecimal.ZERO) > 0
                ? MurabahaDomainEnums.InstallmentStatus.PARTIAL
                : installment.getStatus());
    }

    private void refreshPastDueStatuses(MurabahaContract contract) {
        List<MurabahaInstallment> installments = installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contract.getId(),
                List.of(
                        MurabahaDomainEnums.InstallmentStatus.SCHEDULED,
                        MurabahaDomainEnums.InstallmentStatus.DUE,
                        MurabahaDomainEnums.InstallmentStatus.PARTIAL));
        for (MurabahaInstallment installment : installments) {
            refreshSingleInstallment(contract, installment);
            installmentRepository.save(installment);
        }
    }

    private void refreshSingleInstallment(MurabahaContract contract, MurabahaInstallment installment) {
        if (installment.getStatus() == MurabahaDomainEnums.InstallmentStatus.PAID
                || installment.getStatus() == MurabahaDomainEnums.InstallmentStatus.WAIVED) {
            return;
        }
        boolean isPartiallyPaid = installment.getPaidAmount() != null
                && installment.getPaidAmount().compareTo(BigDecimal.ZERO) > 0;
        LocalDate today = LocalDate.now();
        if (today.isAfter(installment.getDueDate())) {
            // Preserve PARTIAL status for installments that have partial payments
            if (!isPartiallyPaid) {
                installment.setStatus(MurabahaDomainEnums.InstallmentStatus.OVERDUE);
            }
            installment.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(installment.getDueDate(), today));
        } else if (today.isEqual(installment.getDueDate())) {
            if (!isPartiallyPaid) {
                installment.setStatus(MurabahaDomainEnums.InstallmentStatus.DUE);
            }
            installment.setDaysOverdue(0);
        } else {
            if (!isPartiallyPaid) {
                installment.setStatus(MurabahaDomainEnums.InstallmentStatus.SCHEDULED);
            }
            installment.setDaysOverdue(0);
        }
    }

    private BigDecimal calculateLatePenalty(MurabahaContract contract, BigDecimal overdueAmount, int daysOverdue) {
        BigDecimal rate = contract.getLatePenaltyRate() == null ? BigDecimal.ZERO : contract.getLatePenaltyRate();
        if (contract.getLatePenaltyMethod() == null
                || contract.getLatePenaltyMethod() == MurabahaDomainEnums.LatePenaltyMethod.PERCENTAGE_OF_OVERDUE) {
            return MurabahaSupport.money(overdueAmount.multiply(rate)
                    .divide(MurabahaSupport.HUNDRED, 8, RoundingMode.HALF_UP));
        }
        return switch (contract.getLatePenaltyMethod()) {
            case FLAT_PER_INSTALLMENT -> MurabahaSupport.money(rate);
            case DAILY_RATE -> MurabahaSupport.money(overdueAmount.multiply(rate)
                    .multiply(BigDecimal.valueOf(daysOverdue))
                    .divide(MurabahaSupport.HUNDRED, 8, RoundingMode.HALF_UP));
            case PERCENTAGE_OF_OVERDUE -> MurabahaSupport.money(overdueAmount.multiply(rate)
                    .divide(MurabahaSupport.HUNDRED, 8, RoundingMode.HALF_UP));
        };
    }

    private Account resolveReferenceAccount(MurabahaContract contract, Long explicitAccountId) {
        Long accountId = explicitAccountId != null ? explicitAccountId : contract.getSettlementAccountId();
        if (accountId == null) {
            return null;
        }
        return accountRepository.findByIdWithProduct(accountId).orElse(null);
    }

    private boolean areAllInstallmentsSettled(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .allMatch(inst -> EnumSet.of(
                        MurabahaDomainEnums.InstallmentStatus.PAID,
                        MurabahaDomainEnums.InstallmentStatus.WAIVED).contains(inst.getStatus()));
    }

    private void propagateJournalRef(Long contractId, String transactionRef, String journalNumber) {
        List<MurabahaInstallment> touched = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(inst -> transactionRef.equals(inst.getTransactionRef()) && inst.getJournalRef() == null)
                .peek(inst -> inst.setJournalRef(journalNumber))
                .toList();
        if (!touched.isEmpty()) {
            installmentRepository.saveAll(touched);
        }
    }

    private void recordPoolIncomeIfApplicable(MurabahaContract contract,
                                              BigDecimal profitAmount,
                                              LocalDate incomeDate,
                                              String journalRef) {
        if (profitAmount.compareTo(BigDecimal.ZERO) <= 0
                || contract.getInvestmentPoolId() == null
                || contract.getPoolAssetAssignmentId() == null) {
            return;
        }
        poolAssetManagementService.recordIncome(
                contract.getInvestmentPoolId(),
                RecordPoolIncomeRequest.builder()
                        .poolId(contract.getInvestmentPoolId())
                        .assetAssignmentId(contract.getPoolAssetAssignmentId())
                        .incomeType(IncomeType.MURABAHA_PROFIT.name())
                        .amount(MurabahaSupport.money(profitAmount))
                        .currencyCode(contract.getCurrencyCode())
                        .incomeDate(incomeDate)
                        .periodFrom(incomeDate.withDayOfMonth(1))
                        .periodTo(incomeDate)
                        .journalRef(journalRef)
                        .assetReferenceCode(contract.getContractRef())
                        .contractTypeCode("MURABAHA")
                        .notes("Murabaha repayment profit recognition")
                        .build());
    }

    private MurabahaContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
    }
}
