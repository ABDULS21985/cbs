package com.cbs.ijarah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.service.LatePenaltyService;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.repository.IjarahAssetMaintenanceRecordRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahRentalService {

    private final IjarahContractRepository contractRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicPostingRuleService postingRuleService;
    private final AccountRepository accountRepository;
    private final PoolAssetManagementService poolAssetManagementService;
    private final LatePenaltyService latePenaltyService;
    private final IjarahAssetMaintenanceRecordRepository maintenanceRecordRepository;

    /** Tracks externalRefs already processed. DB-level check is the primary guard (cluster-safe);
     *  in-memory LRU is a fast-path cache to reduce DB queries on the same node. */
    private static final Map<String, Boolean> PROCESSED_REFS_CACHE = Collections.synchronizedMap(
            new LinkedHashMap<String, Boolean>(10000, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
                    return size() > 10000;
                }
            });

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
            boolean hasPaidInstallments = existing.stream().anyMatch(i ->
                    i.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.PAID
                            || i.getStatus() == IjarahDomainEnums.RentalInstallmentStatus.PARTIAL);
            if (hasPaidInstallments) {
                throw new BusinessException("IJARAH_SCHEDULE_HAS_PAYMENTS",
                        "Cannot regenerate schedule with paid installments");
            }
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

        // Idempotency check on externalRef
        if (request.getExternalRef() != null) {
            boolean alreadyUsed = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                    .anyMatch(inst -> request.getExternalRef().equals(inst.getTransactionRef()));
            if (alreadyUsed || PROCESSED_REFS_CACHE.putIfAbsent(request.getExternalRef(), Boolean.TRUE) != null) {
                throw new BusinessException("Duplicate payment detected for externalRef: " + request.getExternalRef(), "DUPLICATE_PAYMENT");
            }
        }

        // Account balance check before processing payment
        if (request.getDebitAccountId() != null) {
            Account debitAccount = resolveDebitAccount(request.getDebitAccountId());
            if (debitAccount != null && debitAccount.getAvailableBalance() != null
                    && debitAccount.getAvailableBalance().compareTo(request.getPaymentAmount()) < 0) {
                throw new BusinessException("Insufficient account balance for rental payment", "INSUFFICIENT_BALANCE");
            }
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
            if (penaltyApplied.compareTo(BigDecimal.ZERO) > 0) {
                latePenaltyService.settlePenalty(contract.getId(), "IJARAH", installment.getId(),
                        penaltyApplied, request.getPaymentDate(), generatedRef);
            }
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

        // CRITICAL: Route late penalty amounts to charity GL account
        if (totalPenaltySettled.compareTo(BigDecimal.ZERO) > 0 && Boolean.TRUE.equals(contract.getLatePenaltyToCharity())) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.FEE_CHARGE)
                    .accountId(contract.getAccountId())
                    .amount(totalPenaltySettled)
                    .valueDate(request.getPaymentDate())
                    .reference(generatedRef + "-CHARITY")
                    .narration("Late penalty routed to charity per Shariah compliance")
                    .additionalContext(Map.of("feeType", "LATE_PENALTY_CHARITY", "charityRouting", true))
                    .build());
            contract.setTotalCharityFromLatePenalties(
                    IjarahSupport.money(IjarahSupport.nvl(contract.getTotalCharityFromLatePenalties()).add(totalPenaltySettled)));
        }
        if (totalPenaltySettled.compareTo(BigDecimal.ZERO) > 0) {
            contract.setTotalLatePenalties(
                    IjarahSupport.money(IjarahSupport.nvl(contract.getTotalLatePenalties()).add(totalPenaltySettled)));
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

        // CRITICAL: Handle overpayments - post excess to suspense account pending resolution
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.RENTAL_PAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(remaining)
                    .valueDate(request.getPaymentDate())
                    .reference(generatedRef + "-OVERPAY")
                    .narration("Overpayment suspense for contract " + contract.getContractRef())
                    .additionalContext(Map.of("suspenseType", "OVERPAYMENT_SUSPENSE"))
                    .build());
            log.warn("Overpayment of {} detected on Ijarah contract {}. Posted to suspense account.",
                    remaining, contract.getContractRef());
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
            if (installment.getDaysOverdue() <= grace) {
                installmentRepository.save(installment);
                continue;
            }

            BigDecimal outstanding = IjarahSupport.money(installment.getRentalAmount().subtract(IjarahSupport.money(installment.getPaidAmount())));
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // For non-DAILY_RATE penalty methods, skip if a penalty has already been accrued on this
            // installment — re-accrual would constitute prohibited compounding. For DAILY_RATE, the
            // penalty must continue to accrue on each daily run regardless of any existing balance.
            boolean isDailyRate = contract.getLatePenaltyMethod() == IjarahDomainEnums.LatePenaltyMethod.DAILY_RATE;
            if (!isDailyRate && IjarahSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) > 0) {
                continue;
            }

            latePenaltyService.processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                    .contractId(contract.getId())
                    .contractRef(contract.getContractRef())
                    .contractTypeCode("IJARAH")
                    .installmentId(installment.getId())
                    .overdueAmount(outstanding)
                    .daysOverdue(installment.getDaysOverdue())
                    .penaltyDate(LocalDate.now())
                    .build());
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
        // Query actual maintenance records for total spend instead of hardcoded ZERO
        BigDecimal totalMaintenanceSpend = IjarahSupport.ZERO;
        if (contract.getIjarahAssetId() != null) {
            totalMaintenanceSpend = maintenanceRecordRepository
                    .findByAssetIdOrderByMaintenanceDateDesc(contract.getIjarahAssetId()).stream()
                    .map(record -> IjarahSupport.money(record.getCost()))
                    .reduce(IjarahSupport.ZERO, BigDecimal::add);
        }
        return IjarahResponses.MaintenanceObligationSummary.builder()
                .contractId(contract.getId())
                .assetId(contract.getIjarahAssetId())
                .nextMajorMaintenanceDueDate(contract.getNextMajorMaintenanceDueDate())
                .insuranceExpiryDate(contract.getInsuranceExpiryDate())
                .totalMaintenanceSpend(totalMaintenanceSpend)
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
        // Use targeted repository query to avoid loading all contracts into memory.
        // Only fetch contracts with a maintenance due date on or before the look-ahead window.
        return contractRepository.findByNextMajorMaintenanceDueDateBetween(
                LocalDate.now(), LocalDate.now().plusDays(daysAhead));
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
        if (contract.getRentalReviewFrequency() == null) {
            return null;
        }
        return switch (contract.getRentalReviewFrequency()) {
            case NONE -> null;
            case ANNUAL -> effectiveDate.plusYears(1);
            case BI_ANNUAL -> effectiveDate.plusMonths(6);
            case AS_PER_SCHEDULE -> effectiveDate.plusYears(1);
            case AS_PER_CONTRACT -> null;
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
