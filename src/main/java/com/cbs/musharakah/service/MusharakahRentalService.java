package com.cbs.musharakah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.service.LatePenaltyService;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class MusharakahRentalService {

    private final MusharakahContractRepository contractRepository;
    private final MusharakahOwnershipUnitRepository ownershipUnitRepository;
    private final MusharakahRentalInstallmentRepository installmentRepository;
    private final MusharakahBuyoutInstallmentRepository buyoutInstallmentRepository;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;
    private final LatePenaltyService latePenaltyService;

    public List<MusharakahRentalInstallment> generateRentalSchedule(Long contractId) {
        MusharakahContract contract = getContract(contractId);
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contractId));
        List<MusharakahBuyoutInstallment> buyoutSchedule = buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        List<MusharakahRentalInstallment> existing = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        if (!existing.isEmpty()) {
            installmentRepository.deleteAll(existing);
        }

        LocalDate firstPaymentDate = contract.getFirstPaymentDate() != null ? contract.getFirstPaymentDate() : LocalDate.now().plusMonths(1);
        BigDecimal simulatedBankUnits = ownership.getBankUnits();
        BigDecimal totalUnits = BigDecimal.valueOf(ownership.getTotalUnits());
        BigDecimal currentUnitValue = ownership.getCurrentUnitValue();
        int totalPeriods = MusharakahSupport.totalPeriods(contract.getTenorMonths(), contract.getRentalFrequency());
        List<MusharakahRentalInstallment> schedule = new ArrayList<>();
        BigDecimal totalExpected = MusharakahSupport.ZERO;

        for (int index = 0; index < totalPeriods; index++) {
            LocalDate dueDate = MusharakahSupport.adjustToBusinessDay(
                    hijriCalendarService,
                    MusharakahSupport.addFrequency(firstPaymentDate, contract.getRentalFrequency(), index));
            LocalDate periodStart = index == 0
                    ? contract.getStartDate()
                    : schedule.get(index - 1).getRentalPeriodTo().plusDays(1);
            LocalDate periodEnd = MusharakahSupport.addFrequency(periodStart, contract.getRentalFrequency(), 1).minusDays(1);
            BigDecimal bankPercentage = MusharakahSupport.percentage(simulatedBankUnits, totalUnits);
            BigDecimal bankShareValue = MusharakahSupport.money(simulatedBankUnits.multiply(currentUnitValue));
            BigDecimal rentalAmount = MusharakahSupport.deriveMonthlyRental(bankShareValue, contract.getBaseRentalRate(), contract.getRentalFrequency());

            MusharakahRentalInstallment installment = MusharakahRentalInstallment.builder()
                    .contractId(contractId)
                    .installmentNumber(index + 1)
                    .dueDate(dueDate)
                    .dueDateHijri(MusharakahSupport.toHijriString(hijriCalendarService, dueDate))
                    .rentalPeriodFrom(periodStart)
                    .rentalPeriodTo(periodEnd)
                    .bankOwnershipAtPeriodStart(bankPercentage)
                    .bankShareValueAtPeriodStart(bankShareValue)
                    .applicableRentalRate(contract.getBaseRentalRate())
                    .daysInPeriod((int) ChronoUnit.DAYS.between(periodStart, periodEnd.plusDays(1)))
                    .rentalAmount(rentalAmount)
                    .calculationMethod("bank share value x annual rental rate / period basis")
                    .status(MusharakahDomainEnums.InstallmentStatus.SCHEDULED)
                    .paidAmount(MusharakahSupport.ZERO)
                    .daysOverdue(0)
                    .latePenaltyAmount(MusharakahSupport.ZERO)
                    .build();
            schedule.add(installment);
            totalExpected = totalExpected.add(rentalAmount);

            if (index < buyoutSchedule.size()) {
                simulatedBankUnits = MusharakahSupport.units(simulatedBankUnits.subtract(buyoutSchedule.get(index).getUnitsToTransfer()));
            }
        }

        contract.setTotalRentalExpected(MusharakahSupport.money(totalExpected));
        contractRepository.save(contract);
        return installmentRepository.saveAll(schedule);
    }

    @Transactional(readOnly = true)
    public List<MusharakahRentalInstallment> getSchedule(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
    }

    public MusharakahRentalInstallment getNextDueInstallment(Long contractId) {
        refreshPastDueStatuses(getContract(contractId));
        return installmentRepository.findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
                        contractId,
                        List.of(
                                MusharakahDomainEnums.InstallmentStatus.OVERDUE,
                                MusharakahDomainEnums.InstallmentStatus.DUE,
                                MusharakahDomainEnums.InstallmentStatus.PARTIAL,
                                MusharakahDomainEnums.InstallmentStatus.SCHEDULED))
                .orElse(null);
    }

    public List<MusharakahRentalInstallment> getOverdueInstallments(Long contractId) {
        refreshPastDueStatuses(getContract(contractId));
        return installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(
                contractId,
                List.of(MusharakahDomainEnums.InstallmentStatus.OVERDUE));
    }

    public MusharakahRentalInstallment processRentalPayment(Long contractId, MusharakahRequests.ProcessRentalPaymentRequest request) {
        MusharakahContract contract = getContract(contractId);
        if (contract.getStatus() != MusharakahDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.BUYOUT_ARREARS) {
            throw new BusinessException("Rental payments are only allowed on active Musharakah contracts", "INVALID_CONTRACT_STATUS");
        }

        refreshPastDueStatuses(contract);
        // Use optimistic locking to prevent concurrent payment processing on the same installments
        List<MusharakahRentalInstallment> unpaid = installmentRepository.findUnpaidWithLock(
                contractId,
                List.of(
                        MusharakahDomainEnums.InstallmentStatus.OVERDUE,
                        MusharakahDomainEnums.InstallmentStatus.DUE,
                        MusharakahDomainEnums.InstallmentStatus.PARTIAL,
                        MusharakahDomainEnums.InstallmentStatus.SCHEDULED));
        if (unpaid.isEmpty()) {
            throw new BusinessException("No unpaid rental installments remain", "NO_UNPAID_RENTALS");
        }

        BigDecimal remaining = MusharakahSupport.money(request.getPaymentAmount());
        BigDecimal totalPenaltySettled = MusharakahSupport.ZERO;
        BigDecimal totalRentalSettled = MusharakahSupport.ZERO;
        MusharakahRentalInstallment firstTouched = null;
        String reference = request.getExternalRef() != null
                ? request.getExternalRef()
                : "MSH-RENT-" + contract.getContractRef() + "-" + System.currentTimeMillis();

        for (MusharakahRentalInstallment installment : unpaid) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            if (firstTouched == null) {
                firstTouched = installment;
            }

            BigDecimal penaltyDue = MusharakahSupport.money(installment.getLatePenaltyAmount());
            BigDecimal penaltyApplied = remaining.min(penaltyDue);
            installment.setLatePenaltyAmount(MusharakahSupport.money(penaltyDue.subtract(penaltyApplied)));
            if (penaltyApplied.compareTo(BigDecimal.ZERO) > 0) {
                latePenaltyService.settlePenalty(contract.getId(), "MUSHARAKAH", installment.getId(),
                        penaltyApplied, request.getPaymentDate(), reference);
            }
            remaining = MusharakahSupport.money(remaining.subtract(penaltyApplied));
            totalPenaltySettled = totalPenaltySettled.add(penaltyApplied);
            if (penaltyApplied.compareTo(BigDecimal.ZERO) > 0 && Boolean.TRUE.equals(contract.getLatePenaltyToCharity())) {
                postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                        .contractTypeCode("MUSHARAKAH")
                        .txnType(IslamicTransactionType.CHARITY_DISTRIBUTION)
                        .accountId(contract.getAccountId())
                        .amount(penaltyApplied)
                        .valueDate(request.getPaymentDate())
                        .reference(reference + "-CHARITY")
                        .narration("Late penalty routed to charity per Shariah requirement")
                        .build());
                contract.setTotalCharityDonations(MusharakahSupport.money(
                        MusharakahSupport.money(contract.getTotalCharityDonations()).add(penaltyApplied)));
            }

            BigDecimal rentalDue = MusharakahSupport.money(installment.getRentalAmount().subtract(MusharakahSupport.money(installment.getPaidAmount())));
            BigDecimal rentalApplied = remaining.min(rentalDue.max(BigDecimal.ZERO));
            installment.setPaidAmount(MusharakahSupport.money(MusharakahSupport.money(installment.getPaidAmount()).add(rentalApplied)));
            remaining = MusharakahSupport.money(remaining.subtract(rentalApplied));
            totalRentalSettled = totalRentalSettled.add(rentalApplied);

            installment.setPaidDate(request.getPaymentDate());
            installment.setTransactionRef(reference);
            updateInstallmentStatus(installment);
            installmentRepository.save(installment);
        }

        if (totalRentalSettled.compareTo(BigDecimal.ZERO) > 0) {
            var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("MUSHARAKAH")
                    .txnType(IslamicTransactionType.RENTAL_PAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(totalRentalSettled)
                    .rental(totalRentalSettled)
                    .valueDate(request.getPaymentDate())
                    .reference(reference)
                    .narration(request.getNarration())
                    .build());
            propagateJournalRef(contractId, reference, journal != null ? journal.getJournalNumber() : null);
            if (contract.getInvestmentPoolId() != null) {
                poolAssetManagementService.recordIncome(contract.getInvestmentPoolId(), RecordPoolIncomeRequest.builder()
                        .poolId(contract.getInvestmentPoolId())
                        .assetAssignmentId(contract.getPoolAssetAssignmentId())
                        .incomeType("MUSHARAKAH_PROFIT")
                        .amount(totalRentalSettled)
                        .currencyCode(contract.getCurrencyCode())
                        .incomeDate(request.getPaymentDate())
                        .periodFrom(request.getPaymentDate().withDayOfMonth(1))
                        .periodTo(request.getPaymentDate())
                        .journalRef(journal != null ? journal.getJournalNumber() : null)
                        .assetReferenceCode(contract.getContractRef())
                        .contractTypeCode("MUSHARAKAH")
                        .notes("Musharakah rental income")
                        .build());
            }
        }

        contract.setTotalRentalReceived(MusharakahSupport.money(MusharakahSupport.money(contract.getTotalRentalReceived()).add(totalRentalSettled)));
        BigDecimal arrears = calculateArrears(contractId);
        contract.setStatus(arrears.compareTo(BigDecimal.ZERO) > 0
                ? MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS
                : MusharakahDomainEnums.ContractStatus.ACTIVE);
        contractRepository.save(contract);
        return firstTouched != null ? firstTouched : unpaid.get(0);
    }

    public void recalculateRemainingRentals(Long contractId) {
        MusharakahContract contract = getContract(contractId);
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contractId));
        List<MusharakahRentalInstallment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        List<MusharakahBuyoutInstallment> buyoutInstallments = buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        BigDecimal runningBankUnits = ownership.getBankUnits();
        BigDecimal totalUnits = BigDecimal.valueOf(ownership.getTotalUnits());
        BigDecimal unitValue = ownership.getCurrentUnitValue();
        int buyoutCursor = nextOutstandingBuyoutIndex(buyoutInstallments);

        for (MusharakahRentalInstallment installment : installments) {
            if (installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.PAID
                    || installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.WAIVED
                    || installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.CANCELLED) {
                continue;
            }
            BigDecimal bankPercentage = MusharakahSupport.percentage(runningBankUnits, totalUnits);
            BigDecimal bankShareValue = MusharakahSupport.money(runningBankUnits.multiply(unitValue));
            BigDecimal rentalAmount = MusharakahSupport.deriveMonthlyRental(bankShareValue, contract.getBaseRentalRate(), contract.getRentalFrequency());
            installment.setBankOwnershipAtPeriodStart(bankPercentage);
            installment.setBankShareValueAtPeriodStart(bankShareValue);
            installment.setApplicableRentalRate(contract.getBaseRentalRate());
            installment.setRentalAmount(rentalAmount);
            installmentRepository.save(installment);

            if (buyoutCursor < buyoutInstallments.size()) {
                MusharakahBuyoutInstallment buyout = buyoutInstallments.get(buyoutCursor);
                if (buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID
                        && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.WAIVED
                        && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.CANCELLED) {
                    runningBankUnits = MusharakahSupport.units(runningBankUnits.subtract(buyout.getUnitsToTransfer()));
                }
                buyoutCursor++;
            }
        }

        contract.setTotalRentalExpected(MusharakahSupport.money(installments.stream()
                .map(MusharakahRentalInstallment::getRentalAmount)
                .map(MusharakahSupport::money)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add)));
        contractRepository.save(contract);
    }

    public void applyRentalReview(Long contractId, BigDecimal newRate, LocalDate effectiveDate) {
        MusharakahContract contract = getContract(contractId);
        if (contract.getNextRentalReviewDate() != null && !contract.getNextRentalReviewDate().equals(effectiveDate)) {
            throw new BusinessException("Rental review can only be applied on the pre-agreed review date", "SHARIAH-MSH-004");
        }
        BigDecimal maxAllowedRate = MusharakahSupport.rate(contract.getBaseRentalRate())
                .multiply(new BigDecimal("1.50"));
        BigDecimal minAllowedRate = MusharakahSupport.rate(contract.getBaseRentalRate())
                .multiply(new BigDecimal("0.50"));
        BigDecimal proposedRate = MusharakahSupport.rate(newRate);
        if (proposedRate.compareTo(maxAllowedRate) > 0 || proposedRate.compareTo(minAllowedRate) < 0) {
            throw new BusinessException(
                    "SHARIAH-MSH-005: Rental rate adjustment exceeds permitted bounds (50%-150% of current rate). Current: "
                            + contract.getBaseRentalRate().toPlainString() + "%, proposed: " + newRate.toPlainString() + "%",
                    "SHARIAH-MSH-005");
        }
        contract.setBaseRentalRate(MusharakahSupport.rate(newRate));
        contract.setNextRentalReviewDate(contract.getRentalReviewFrequency() == MusharakahDomainEnums.RentalReviewFrequency.ANNUAL
                ? effectiveDate.plusYears(1)
                : effectiveDate.plusMonths(6));
        contractRepository.save(contract);
        recalculateRemainingRentals(contractId);
    }

    public void processLateRentals() {
        List<MusharakahRentalInstallment> candidates = installmentRepository.findByStatusInAndDueDateBefore(
                List.of(MusharakahDomainEnums.InstallmentStatus.SCHEDULED, MusharakahDomainEnums.InstallmentStatus.DUE, MusharakahDomainEnums.InstallmentStatus.PARTIAL),
                LocalDate.now());
        List<MusharakahRentalInstallment> touchedInstallments = new ArrayList<>();
        Map<Long, MusharakahContract> touchedContracts = new java.util.LinkedHashMap<>();
        for (MusharakahRentalInstallment installment : candidates) {
            MusharakahContract contract = getContract(installment.getContractId());
            long overdue = ChronoUnit.DAYS.between(installment.getDueDate(), LocalDate.now());
            boolean changed = false;
            if (overdue > (contract.getGracePeriodDays() != null ? contract.getGracePeriodDays() : 0)) {
                if (installment.getStatus() != MusharakahDomainEnums.InstallmentStatus.OVERDUE) {
                    installment.setStatus(MusharakahDomainEnums.InstallmentStatus.OVERDUE);
                    changed = true;
                }
                if (!Objects.equals(installment.getDaysOverdue(), (int) overdue)) {
                    installment.setDaysOverdue((int) overdue);
                    changed = true;
                }
                if (MusharakahSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) == 0) {
                    IslamicFeeResponses.LatePenaltyResult penaltyResult = latePenaltyService.processLatePenalty(
                            IslamicFeeResponses.LatePenaltyRequest.builder()
                                    .contractId(contract.getId())
                                    .contractRef(contract.getContractRef())
                                    .contractTypeCode("MUSHARAKAH")
                                    .installmentId(installment.getId())
                                    .overdueAmount(MusharakahSupport.money(
                                            installment.getRentalAmount().subtract(MusharakahSupport.money(installment.getPaidAmount()))))
                                    .daysOverdue((int) overdue)
                                    .penaltyDate(LocalDate.now())
                                    .build());
                    if (penaltyResult.isPenaltyCharged() && penaltyResult.getPenaltyAmount() != null) {
                        installment.setLatePenaltyAmount(MusharakahSupport.money(penaltyResult.getPenaltyAmount()));
                        changed = true;
                    }
                }
                contract.setStatus(MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS);
                touchedContracts.put(contract.getId(), contract);
            } else if (installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.SCHEDULED) {
                installment.setStatus(MusharakahDomainEnums.InstallmentStatus.DUE);
                installment.setDaysOverdue(0);
                changed = true;
            }
            if (changed) {
                touchedInstallments.add(installment);
            }
        }
        if (!touchedInstallments.isEmpty()) {
            installmentRepository.saveAll(touchedInstallments);
        }
        if (!touchedContracts.isEmpty()) {
            contractRepository.saveAll(touchedContracts.values());
        }
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahRentalSummary getRentalSummary(Long contractId) {
        List<MusharakahRentalInstallment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        BigDecimal totalExpected = installments.stream()
                .map(MusharakahRentalInstallment::getRentalAmount)
                .map(MusharakahSupport::money)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
        BigDecimal totalReceived = installments.stream()
                .map(MusharakahRentalInstallment::getPaidAmount)
                .map(MusharakahSupport::money)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
        BigDecimal totalOverdue = installments.stream()
                .filter(i -> i.getStatus() == MusharakahDomainEnums.InstallmentStatus.OVERDUE)
                .map(i -> MusharakahSupport.money(i.getRentalAmount().subtract(MusharakahSupport.money(i.getPaidAmount()))))
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
        MusharakahRentalInstallment nextDue = getNextDueInstallment(contractId);
        return MusharakahResponses.MusharakahRentalSummary.builder()
                .contractId(contractId)
                .totalExpected(totalExpected)
                .totalReceived(totalReceived)
                .totalOutstanding(MusharakahSupport.money(totalExpected.subtract(totalReceived)))
                .totalOverdue(totalOverdue)
                .nextDueDate(nextDue != null ? nextDue.getDueDate() : null)
                .nextDueAmount(nextDue != null ? MusharakahSupport.money(nextDue.getRentalAmount().subtract(MusharakahSupport.money(nextDue.getPaidAmount()))) : null)
                .build();
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahCombinedSchedule getCombinedSchedule(Long contractId) {
        List<MusharakahRentalInstallment> rentals = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        List<MusharakahBuyoutInstallment> buyouts = buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        List<MusharakahResponses.CombinedInstallment> combined = new ArrayList<>();
        BigDecimal cumulativePaid = MusharakahSupport.ZERO;

        // Merge by due date to handle different rental and buyout frequencies
        int rentalIdx = 0;
        int buyoutIdx = 0;
        int installmentNum = 0;
        while (rentalIdx < rentals.size() || buyoutIdx < buyouts.size()) {
            MusharakahRentalInstallment rental = rentalIdx < rentals.size() ? rentals.get(rentalIdx) : null;
            MusharakahBuyoutInstallment buyout = buyoutIdx < buyouts.size() ? buyouts.get(buyoutIdx) : null;

            LocalDate rentalDate = rental != null ? rental.getDueDate() : null;
            LocalDate buyoutDate = buyout != null ? buyout.getDueDate() : null;

            boolean includeRental;
            boolean includeBuyout;
            LocalDate dueDate;
            if (rentalDate != null && buyoutDate != null) {
                if (rentalDate.equals(buyoutDate)) {
                    includeRental = true;
                    includeBuyout = true;
                    dueDate = rentalDate;
                } else if (rentalDate.isBefore(buyoutDate)) {
                    includeRental = true;
                    includeBuyout = false;
                    dueDate = rentalDate;
                } else {
                    includeRental = false;
                    includeBuyout = true;
                    dueDate = buyoutDate;
                }
            } else if (rentalDate != null) {
                includeRental = true;
                includeBuyout = false;
                dueDate = rentalDate;
            } else {
                includeRental = false;
                includeBuyout = true;
                dueDate = buyoutDate;
            }

                BigDecimal rentalPortion = includeRental && rental != null
                    ? MusharakahSupport.money(rental.getRentalAmount())
                    : MusharakahSupport.ZERO;
                BigDecimal buyoutPortion = includeBuyout && buyout != null
                    ? MusharakahSupport.money(buyout.getTotalBuyoutAmount())
                    : MusharakahSupport.ZERO;
            BigDecimal totalPayment = MusharakahSupport.money(rentalPortion.add(buyoutPortion));
            cumulativePaid = cumulativePaid.add(totalPayment);
            installmentNum++;
            combined.add(MusharakahResponses.CombinedInstallment.builder()
                    .installmentNumber(installmentNum)
                    .dueDate(dueDate)
                    .rentalPortion(rentalPortion)
                    .buyoutPortion(buyoutPortion)
                    .totalPayment(totalPayment)
                    .bankOwnershipBefore(includeRental && rental != null ? rental.getBankOwnershipAtPeriodStart() : null)
                    .bankOwnershipAfter(includeBuyout && buyout != null ? buyout.getBankPercentageAfter() : null)
                    .cumulativeTotalPaid(cumulativePaid)
                    .build());

            if (includeRental) rentalIdx++;
            if (includeBuyout) buyoutIdx++;
        }

        BigDecimal totalRental = combined.stream().map(MusharakahResponses.CombinedInstallment::getRentalPortion)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
        BigDecimal totalBuyout = combined.stream().map(MusharakahResponses.CombinedInstallment::getBuyoutPortion)
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
        return MusharakahResponses.MusharakahCombinedSchedule.builder()
                .installments(combined)
                .totalRentalOverLifetime(totalRental)
                .totalBuyoutOverLifetime(totalBuyout)
                .totalPaymentOverLifetime(totalRental.add(totalBuyout))
                .firstPayment(combined.isEmpty() ? MusharakahSupport.ZERO : combined.getFirst().getTotalPayment())
                .lastPayment(combined.isEmpty() ? MusharakahSupport.ZERO : combined.getLast().getTotalPayment())
                .build();
    }

    private MusharakahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
    }

    private void refreshPastDueStatuses(MusharakahContract contract) {
        List<MusharakahRentalInstallment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        List<MusharakahRentalInstallment> touchedInstallments = new ArrayList<>();
        boolean contractChanged = false;
        for (MusharakahRentalInstallment installment : installments) {
            if (installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.PAID
                    || installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.WAIVED
                    || installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.CANCELLED) {
                continue;
            }
            if (!installment.getDueDate().isAfter(LocalDate.now())) {
                long overdue = ChronoUnit.DAYS.between(installment.getDueDate(), LocalDate.now());
                if (overdue > (contract.getGracePeriodDays() != null ? contract.getGracePeriodDays() : 0)) {
                    installment.setStatus(MusharakahDomainEnums.InstallmentStatus.OVERDUE);
                    installment.setDaysOverdue((int) overdue);
                    if (MusharakahSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) == 0) {
                        IslamicFeeResponses.LatePenaltyResult penaltyResult = latePenaltyService.processLatePenalty(
                                IslamicFeeResponses.LatePenaltyRequest.builder()
                                        .contractId(contract.getId())
                                        .contractRef(contract.getContractRef())
                                        .contractTypeCode("MUSHARAKAH")
                                        .installmentId(installment.getId())
                                        .overdueAmount(MusharakahSupport.money(
                                                installment.getRentalAmount().subtract(MusharakahSupport.money(installment.getPaidAmount()))))
                                        .daysOverdue((int) overdue)
                                        .penaltyDate(LocalDate.now())
                                        .build());
                        if (penaltyResult.isPenaltyCharged() && penaltyResult.getPenaltyAmount() != null) {
                            installment.setLatePenaltyAmount(MusharakahSupport.money(penaltyResult.getPenaltyAmount()));
                        }
                    }
                    contract.setStatus(MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS);
                    contractChanged = true;
                } else if (installment.getStatus() == MusharakahDomainEnums.InstallmentStatus.SCHEDULED) {
                    installment.setStatus(MusharakahDomainEnums.InstallmentStatus.DUE);
                    installment.setDaysOverdue(0);
                }
                touchedInstallments.add(installment);
            }
        }
        if (!touchedInstallments.isEmpty()) {
            installmentRepository.saveAll(touchedInstallments);
        }
        if (contractChanged) {
            contractRepository.save(contract);
        }
    }

    private void updateInstallmentStatus(MusharakahRentalInstallment installment) {
        BigDecimal remainingRental = MusharakahSupport.money(installment.getRentalAmount())
                .subtract(MusharakahSupport.money(installment.getPaidAmount()));
        if (remainingRental.compareTo(BigDecimal.ZERO) <= 0
                && MusharakahSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) <= 0) {
            installment.setStatus(MusharakahDomainEnums.InstallmentStatus.PAID);
        } else if (MusharakahSupport.money(installment.getPaidAmount()).compareTo(BigDecimal.ZERO) > 0) {
            installment.setStatus(MusharakahDomainEnums.InstallmentStatus.PARTIAL);
        }
    }

    private BigDecimal calculateArrears(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(i -> i.getStatus() == MusharakahDomainEnums.InstallmentStatus.OVERDUE
                        || i.getStatus() == MusharakahDomainEnums.InstallmentStatus.PARTIAL)
                .map(i -> MusharakahSupport.money(i.getRentalAmount().subtract(MusharakahSupport.money(i.getPaidAmount()))))
                .reduce(MusharakahSupport.ZERO, BigDecimal::add);
    }

    private void propagateJournalRef(Long contractId, String transactionRef, String journalRef) {
        if (journalRef == null) {
            return;
        }
        installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(installment -> transactionRef.equals(installment.getTransactionRef()))
                .forEach(installment -> installment.setJournalRef(journalRef));
    }

    private int nextOutstandingBuyoutIndex(List<MusharakahBuyoutInstallment> buyouts) {
        for (int index = 0; index < buyouts.size(); index++) {
            MusharakahBuyoutInstallment buyout = buyouts.get(index);
            if (buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID
                    && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.WAIVED
                    && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.CANCELLED) {
                return index;
            }
        }
        return buyouts.size();
    }
}
