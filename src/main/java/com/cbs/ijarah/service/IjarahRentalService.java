package com.cbs.ijarah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class IjarahRentalService {

    private final IjarahContractRepository contractRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicPostingRuleService postingRuleService;
    private final AccountRepository accountRepository;
    private final PoolAssetManagementService poolAssetManagementService;

    public List<IjarahRentalInstallment> generateRentalSchedule(Long contractId) {
        IjarahContract contract = getContract(contractId);
        if (contract.getLeaseStartDate() == null) {
            contract.setLeaseStartDate(LocalDate.now());
        }
        int totalPeriods = contract.getTotalLeasePeriods() != null
                ? contract.getTotalLeasePeriods()
                : IjarahSupport.totalPeriods(contract.getTenorMonths(), contract.getRentalFrequency());
        contract.setTotalLeasePeriods(totalPeriods);
        if (contract.getLeaseEndDate() == null) {
            contract.setLeaseEndDate(contract.getLeaseStartDate().plusMonths(contract.getTenorMonths()));
        }

        List<IjarahRentalInstallment> existing = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        if (!existing.isEmpty()) {
            installmentRepository.deleteAll(existing);
        }

        List<IjarahRentalInstallment> schedule = new ArrayList<>();
        BigDecimal totalExpected = BigDecimal.ZERO;
        LocalDate periodStart = contract.getLeaseStartDate();
        int periodsPerYear = switch (contract.getRentalFrequency()) {
            case MONTHLY -> 12;
            case QUARTERLY -> 4;
            case SEMI_ANNUALLY -> 2;
            case ANNUALLY -> 1;
        };

        for (int i = 0; i < totalPeriods; i++) {
            LocalDate dueDate = IjarahSupport.adjustToBusinessDay(
                    hijriCalendarService,
                    IjarahSupport.addFrequency(contract.getLeaseStartDate(), contract.getRentalFrequency(), i));
            LocalDate periodTo = IjarahSupport.addFrequency(periodStart, contract.getRentalFrequency(), 1).minusDays(1);
            BigDecimal rentalAmount = resolveRentalAmount(contract, i, periodsPerYear);
            totalExpected = totalExpected.add(rentalAmount);

            IjarahRentalInstallment installment = IjarahRentalInstallment.builder()
                    .contractId(contractId)
                    .installmentNumber(i + 1)
                    .dueDate(dueDate)
                    .dueDateHijri(IjarahSupport.toHijriString(hijriCalendarService, dueDate))
                    .rentalAmount(rentalAmount)
                    .maintenanceComponent(IjarahSupport.ZERO)
                    .netRentalAmount(rentalAmount)
                    .isAdvanceRental(i < (contract.getAdvanceRentals() != null ? contract.getAdvanceRentals() : 0))
                    .rentalPeriodFrom(periodStart)
                    .rentalPeriodTo(periodTo)
                    .status(IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED)
                    .paidAmount(IjarahSupport.ZERO)
                    .daysOverdue(0)
                    .latePenaltyAmount(IjarahSupport.ZERO)
                    .build();
            schedule.add(installment);
            periodStart = periodTo.plusDays(1);
        }

        contract.setTotalRentalsExpected(IjarahSupport.money(totalExpected));
        contractRepository.save(contract);
        return installmentRepository.saveAll(schedule);
    }

    @Transactional(readOnly = true)
    public List<IjarahRentalInstallment> getSchedule(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
    }

    public IjarahRentalInstallment getNextDueInstallment(Long contractId) {
        refreshPastDueStatuses(getContract(contractId));
        return installmentRepository.findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(
                        IjarahDomainEnums.RentalInstallmentStatus.OVERDUE,
                        IjarahDomainEnums.RentalInstallmentStatus.DUE,
                        IjarahDomainEnums.RentalInstallmentStatus.PARTIAL,
                        IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED))
                .orElse(null);
    }

    public List<IjarahRentalInstallment> getOverdueInstallments(Long contractId) {
        refreshPastDueStatuses(getContract(contractId));
        return installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(IjarahDomainEnums.RentalInstallmentStatus.OVERDUE));
    }

    public IjarahRentalInstallment processRentalPayment(Long contractId, IjarahRequests.ProcessRentalPaymentRequest request) {
        IjarahContract contract = getContract(contractId);
        if (contract.getStatus() != IjarahDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != IjarahDomainEnums.ContractStatus.RENTAL_ARREARS) {
            throw new BusinessException("Rental payments are only allowed on active Ijarah contracts", "INVALID_CONTRACT_STATUS");
        }

        refreshPastDueStatuses(contract);
        List<IjarahRentalInstallment> unpaidInstallments = installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(
                        IjarahDomainEnums.RentalInstallmentStatus.OVERDUE,
                        IjarahDomainEnums.RentalInstallmentStatus.DUE,
                        IjarahDomainEnums.RentalInstallmentStatus.PARTIAL,
                        IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED));
        if (unpaidInstallments.isEmpty()) {
            throw new BusinessException("No unpaid rental installments remain", "NO_UNPAID_RENTALS");
        }

        BigDecimal remaining = IjarahSupport.money(request.getPaymentAmount());
        BigDecimal totalPenaltySettled = IjarahSupport.ZERO;
        BigDecimal totalRentalSettled = IjarahSupport.ZERO;
        IjarahRentalInstallment firstTouched = null;
        String generatedRef = request.getExternalRef() != null
                ? request.getExternalRef()
                : "IJR-RENT-" + contract.getContractRef() + "-" + System.currentTimeMillis();

        for (IjarahRentalInstallment installment : unpaidInstallments) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            if (firstTouched == null) {
                firstTouched = installment;
            }

            BigDecimal penaltyDue = IjarahSupport.money(installment.getLatePenaltyAmount());
            BigDecimal penaltyApplied = remaining.min(penaltyDue);
            installment.setLatePenaltyAmount(IjarahSupport.money(penaltyDue.subtract(penaltyApplied)));
            remaining = IjarahSupport.money(remaining.subtract(penaltyApplied));
            totalPenaltySettled = totalPenaltySettled.add(penaltyApplied);

            BigDecimal rentalDue = IjarahSupport.money(installment.getRentalAmount().subtract(IjarahSupport.money(installment.getPaidAmount())));
            BigDecimal rentalApplied = remaining.min(rentalDue.max(BigDecimal.ZERO));
            installment.setPaidAmount(IjarahSupport.money(IjarahSupport.money(installment.getPaidAmount()).add(rentalApplied)));
            remaining = IjarahSupport.money(remaining.subtract(rentalApplied));
            totalRentalSettled = totalRentalSettled.add(rentalApplied);

            installment.setPaidDate(request.getPaymentDate());
            installment.setTransactionRef(generatedRef);
            installment.setNotes(request.getNarration());
            updateInstallmentStatus(installment);
            installmentRepository.save(installment);
        }

        if (totalRentalSettled.compareTo(BigDecimal.ZERO) > 0) {
            Account debitAccount = resolveDebitAccount(request.getDebitAccountId());
            var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.RENTAL_PAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(totalRentalSettled)
                    .rental(totalRentalSettled)
                    .valueDate(request.getPaymentDate())
                    .reference(generatedRef)
                    .narration(request.getNarration())
                    .additionalContext(debitAccount != null && debitAccount.getProduct() != null
                            ? Map.of("customerAccountGlCode", debitAccount.getProduct().getGlAccountCode())
                            : Map.of("customerAccountGlCode", "1620-IJR-001"))
                    .build());
            propagateJournalRef(contractId, generatedRef, journal.getJournalNumber());
            recordPoolIncomeIfApplicable(contract, totalRentalSettled, request.getPaymentDate(), journal.getJournalNumber());
        }

        if (totalPenaltySettled.compareTo(BigDecimal.ZERO) > 0) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.LATE_PAYMENT_PENALTY)
                    .accountId(contract.getAccountId())
                    .amount(totalPenaltySettled)
                    .penalty(totalPenaltySettled)
                    .valueDate(request.getPaymentDate())
                    .reference(generatedRef + "-LATE")
                    .build());
            contract.setTotalLatePenalties(IjarahSupport.money(contract.getTotalLatePenalties().add(totalPenaltySettled)));
            contract.setTotalCharityFromLatePenalties(IjarahSupport.money(contract.getTotalCharityFromLatePenalties().add(totalPenaltySettled)));
        }

        contract.setTotalRentalsReceived(IjarahSupport.money(contract.getTotalRentalsReceived().add(totalRentalSettled)));
        contract.setTotalRentalArrears(calculateArrears(contractId));
        contract.setStatus(contract.getTotalRentalArrears().compareTo(BigDecimal.ZERO) > 0
                ? IjarahDomainEnums.ContractStatus.RENTAL_ARREARS
                : IjarahDomainEnums.ContractStatus.ACTIVE);
        contractRepository.save(contract);
        return firstTouched != null ? firstTouched : unpaidInstallments.get(0);
    }

    public void processLateRentals() {
        List<IjarahRentalInstallment> dueInstallments = installmentRepository.findByStatusInAndDueDateBefore(
                List.of(
                        IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED,
                        IjarahDomainEnums.RentalInstallmentStatus.DUE,
                        IjarahDomainEnums.RentalInstallmentStatus.PARTIAL),
                LocalDate.now());

        for (IjarahRentalInstallment installment : dueInstallments) {
            IjarahContract contract = getContract(installment.getContractId());
            refreshSingleInstallment(contract, installment);
            int grace = contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays();
            if (installment.getDaysOverdue() <= grace || installment.getLatePenaltyAmount().compareTo(BigDecimal.ZERO) > 0) {
                installmentRepository.save(installment);
                continue;
            }

            BigDecimal outstanding = IjarahSupport.money(installment.getRentalAmount().subtract(IjarahSupport.money(installment.getPaidAmount())));
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal penalty = outstanding.multiply(new BigDecimal("0.01")).setScale(2, BigDecimal.ROUND_HALF_UP);
            var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.LATE_PAYMENT_PENALTY)
                    .accountId(contract.getAccountId())
                    .amount(penalty)
                    .penalty(penalty)
                    .reference(contract.getContractRef() + "-LATE-" + installment.getInstallmentNumber())
                    .valueDate(LocalDate.now())
                    .build());
            installment.setLatePenaltyAmount(IjarahSupport.money(installment.getLatePenaltyAmount().add(penalty)));
            installment.setLatePenaltyCharityJournalRef(journal.getJournalNumber());
            installmentRepository.save(installment);
        }
    }

    public void applyRentalReview(Long contractId, BigDecimal newRentalAmount, LocalDate effectiveDate) {
        IjarahContract contract = getContract(contractId);
        if (contract.getNextRentalReviewDate() == null
                || effectiveDate.isBefore(contract.getNextRentalReviewDate())) {
            throw new BusinessException("Rental review is only allowed on pre-agreed dates", "SHARIAH-IJR-005");
        }
        List<IjarahRentalInstallment> futureInstallments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(installment -> !installment.getDueDate().isBefore(effectiveDate))
                .filter(installment -> installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.PAID
                        && installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.WAIVED
                        && installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.CANCELLED)
                .toList();
        futureInstallments.forEach(installment -> {
            installment.setRentalAmount(IjarahSupport.money(newRentalAmount));
            installment.setNetRentalAmount(IjarahSupport.money(newRentalAmount));
            installmentRepository.save(installment);
        });
        contract.setBaseRentalAmount(IjarahSupport.money(newRentalAmount));
        contract.setNextRentalReviewDate(nextReviewDate(contract, effectiveDate));
        contract.setTotalRentalsExpected(installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .map(IjarahRentalInstallment::getRentalAmount)
                .reduce(IjarahSupport.ZERO, BigDecimal::add));
        contractRepository.save(contract);
    }

    @Transactional(readOnly = true)
    public IjarahResponses.MaintenanceObligationSummary getMaintenanceObligations(Long contractId) {
        IjarahContract contract = getContract(contractId);
        return IjarahResponses.MaintenanceObligationSummary.builder()
                .contractId(contract.getId())
                .assetId(contract.getIjarahAssetId())
                .nextMajorMaintenanceDueDate(contract.getNextMajorMaintenanceDueDate())
                .insuranceExpiryDate(contract.getInsuranceExpiryDate())
                .totalMaintenanceSpend(IjarahSupport.ZERO)
                .obligations(List.of(
                        "Major maintenance remains with the bank",
                        "Insurance must stay active throughout the lease"))
                .build();
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahRentalSummary getRentalSummary(Long contractId) {
        IjarahContract contract = getContract(contractId);
        IjarahRentalInstallment next = getNextDueInstallment(contractId);
        return IjarahResponses.IjarahRentalSummary.builder()
                .contractId(contractId)
                .totalExpected(contract.getTotalRentalsExpected())
                .totalReceived(contract.getTotalRentalsReceived())
                .totalOutstanding(IjarahSupport.money(contract.getTotalRentalsExpected().subtract(contract.getTotalRentalsReceived())))
                .totalOverdue(calculateArrears(contractId))
                .nextDueDate(next != null ? next.getDueDate() : null)
                .nextDueAmount(next != null ? next.getRentalAmount() : BigDecimal.ZERO)
                .build();
    }

    @Transactional(readOnly = true)
    public List<IjarahContract> getContractsWithMaintenanceDue(int daysAhead) {
        return contractRepository.findAll().stream()
                .filter(contract -> contract.getNextMajorMaintenanceDueDate() != null)
                .filter(contract -> !contract.getNextMajorMaintenanceDueDate().isAfter(LocalDate.now().plusDays(daysAhead)))
                .toList();
    }

    IjarahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }

    private BigDecimal resolveRentalAmount(IjarahContract contract, int index, int periodsPerYear) {
        BigDecimal base = IjarahSupport.money(contract.getBaseRentalAmount());
        if (contract.getRentalType() == IjarahDomainEnums.RentalType.STEPPED
                && contract.getRentalEscalationRate() != null
                && contract.getRentalEscalationRate().compareTo(BigDecimal.ZERO) > 0) {
            int yearIndex = index / periodsPerYear;
            BigDecimal factor = BigDecimal.ONE.add(contract.getRentalEscalationRate()
                    .divide(IjarahSupport.HUNDRED, 8, java.math.RoundingMode.HALF_UP))
                    .pow(yearIndex);
            return IjarahSupport.money(base.multiply(factor));
        }
        return base;
    }

    private void refreshPastDueStatuses(IjarahContract contract) {
        installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId())
                .forEach(installment -> {
                    refreshSingleInstallment(contract, installment);
                    installmentRepository.save(installment);
                });
        contract.setTotalRentalArrears(calculateArrears(contract.getId()));
        contractRepository.save(contract);
    }

    private void refreshSingleInstallment(IjarahContract contract, IjarahRentalInstallment installment) {
        if (installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.PAID
                || installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.WAIVED
                || installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.CANCELLED) {
            return;
        }
        LocalDate today = LocalDate.now();
        if (installment.getDueDate().isBefore(today)) {
            installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.OVERDUE);
            installment.setDaysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(installment.getDueDate(), today));
            contract.setStatus(IjarahDomainEnums.ContractStatus.RENTAL_ARREARS);
        } else if (!installment.getDueDate().isAfter(today)) {
            installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.DUE);
        }
    }

    private void updateInstallmentStatus(IjarahRentalInstallment installment) {
        BigDecimal paid = IjarahSupport.money(installment.getPaidAmount());
        if (paid.compareTo(IjarahSupport.money(installment.getRentalAmount())) >= 0
                && installment.getLatePenaltyAmount().compareTo(BigDecimal.ZERO) == 0) {
            installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.PAID);
            installment.setDaysOverdue(0);
        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
            installment.setStatus(IjarahDomainEnums.RentalInstallmentStatus.PARTIAL);
        }
    }

    private BigDecimal calculateArrears(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(installment -> installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.OVERDUE
                        || installment.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.PARTIAL)
                .map(installment -> IjarahSupport.money(installment.getRentalAmount().subtract(IjarahSupport.money(installment.getPaidAmount()))))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
    }

    private LocalDate nextReviewDate(IjarahContract contract, LocalDate effectiveDate) {
        return switch (contract.getRentalReviewFrequency()) {
            case NONE -> null;
            case ANNUAL -> effectiveDate.plusYears(1);
            case BI_ANNUAL -> effectiveDate.plusMonths(6);
            case AS_PER_SCHEDULE -> effectiveDate.plusYears(1);
        };
    }

    private Account resolveDebitAccount(Long debitAccountId) {
        if (debitAccountId == null) {
            return null;
        }
        return accountRepository.findById(debitAccountId).orElse(null);
    }

    private void propagateJournalRef(Long contractId, String transactionRef, String journalRef) {
        installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(installment -> transactionRef.equals(installment.getTransactionRef()))
                .forEach(installment -> {
                    installment.setJournalRef(journalRef);
                    installmentRepository.save(installment);
                });
    }

    private void recordPoolIncomeIfApplicable(IjarahContract contract,
                                              BigDecimal rentalAmount,
                                              LocalDate paymentDate,
                                              String journalRef) {
        if (contract.getInvestmentPoolId() == null || contract.getPoolAssetAssignmentId() == null) {
            return;
        }
        poolAssetManagementService.recordIncome(contract.getInvestmentPoolId(), RecordPoolIncomeRequest.builder()
                .poolId(contract.getInvestmentPoolId())
                .assetAssignmentId(contract.getPoolAssetAssignmentId())
                .incomeType("IJARAH_RENTAL")
                .amount(IjarahSupport.money(rentalAmount))
                .currencyCode(contract.getCurrencyCode())
                .incomeDate(paymentDate)
                .periodFrom(paymentDate)
                .periodTo(paymentDate)
                .journalRef(journalRef)
                .assetReferenceCode(contract.getContractRef())
                .contractTypeCode("IJARAH")
                .notes("Ijarah rental payment")
                .build());
    }
}
