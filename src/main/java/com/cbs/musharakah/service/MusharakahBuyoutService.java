package com.cbs.musharakah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahUnitTransfer;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MusharakahBuyoutService {

    private final MusharakahContractRepository contractRepository;
    private final MusharakahOwnershipUnitRepository ownershipUnitRepository;
    private final MusharakahBuyoutInstallmentRepository installmentRepository;
    private final MusharakahUnitService unitService;
    private final MusharakahRentalService rentalService;
    private final HijriCalendarService hijriCalendarService;

    public List<MusharakahBuyoutInstallment> generateBuyoutSchedule(Long contractId) {
        MusharakahContract contract = getContract(contractId);
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contractId));

        List<MusharakahBuyoutInstallment> existing = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        if (!existing.isEmpty()) {
            installmentRepository.deleteAll(existing);
        }

        LocalDate firstPaymentDate = contract.getFirstPaymentDate() != null ? contract.getFirstPaymentDate() : LocalDate.now().plusMonths(1);
        int totalPeriods = MusharakahSupport.totalPeriods(contract.getTenorMonths(), contract.getBuyoutFrequency());
        BigDecimal remainingUnits = ownership.getBankUnits();
        BigDecimal unitsPerPeriod = contract.getUnitsPerBuyoutDecimal() != null
                ? MusharakahSupport.units(contract.getUnitsPerBuyoutDecimal())
                : MusharakahSupport.units(remainingUnits.divide(BigDecimal.valueOf(totalPeriods), 8, RoundingMode.HALF_UP));
        BigDecimal pricePerUnit = ownership.getCurrentUnitValue() != null
                ? ownership.getCurrentUnitValue()
                : ownership.getUnitValueAtInception();
        BigDecimal cumulative = MusharakahSupport.ZERO_UNITS;
        List<MusharakahBuyoutInstallment> schedule = new ArrayList<>();

        for (int index = 0; index < totalPeriods; index++) {
            LocalDate dueDate = MusharakahSupport.adjustToBusinessDay(
                    hijriCalendarService,
                    MusharakahSupport.addFrequency(firstPaymentDate, contract.getBuyoutFrequency(), index));
            BigDecimal unitsToTransfer = index == totalPeriods - 1
                    ? remainingUnits
                    : unitsPerPeriod.min(remainingUnits);
            BigDecimal totalAmount = MusharakahSupport.money(unitsToTransfer.multiply(pricePerUnit));
            cumulative = MusharakahSupport.units(cumulative.add(unitsToTransfer));
            remainingUnits = MusharakahSupport.units(remainingUnits.subtract(unitsToTransfer));

            schedule.add(MusharakahBuyoutInstallment.builder()
                    .contractId(contractId)
                    .installmentNumber(index + 1)
                    .dueDate(dueDate)
                    .dueDateHijri(MusharakahSupport.toHijriString(hijriCalendarService, dueDate))
                    .unitsToTransfer(unitsToTransfer)
                    .pricePerUnit(pricePerUnit)
                    .totalBuyoutAmount(totalAmount)
                    .cumulativeUnitsBought(cumulative)
                    .bankUnitsAfterThisInstallment(remainingUnits)
                    .bankPercentageAfter(MusharakahSupport.percentage(remainingUnits, BigDecimal.valueOf(ownership.getTotalUnits())))
                    .status(MusharakahDomainEnums.InstallmentStatus.SCHEDULED)
                    .paidAmount(MusharakahSupport.ZERO)
                    .build());
        }

        BigDecimal totalUnitsScheduled = schedule.stream()
                .map(MusharakahBuyoutInstallment::getUnitsToTransfer)
                .reduce(MusharakahSupport.ZERO_UNITS, BigDecimal::add);
        if (totalUnitsScheduled.compareTo(ownership.getBankUnits()) != 0) {
            throw new BusinessException("Buyout schedule must conserve the bank's initial units", "BUYOUT_SCHEDULE_NOT_CONSERVED");
        }

        contract.setUnitsPerBuyout(unitsPerPeriod.stripTrailingZeros().scale() <= 0 ? unitsPerPeriod.intValue() : null);
        contract.setUnitsPerBuyoutDecimal(unitsPerPeriod);
        contract.setTotalBuyoutPaymentsExpected(MusharakahSupport.sumBuyoutAmounts(schedule));
        contractRepository.save(contract);
        return installmentRepository.saveAll(schedule);
    }

    @Transactional(readOnly = true)
    public List<MusharakahBuyoutInstallment> getSchedule(Long contractId) {
        return installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
    }

    public MusharakahBuyoutInstallment getNextDueInstallment(Long contractId) {
        return installmentRepository.findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
                        contractId,
                        List.of(
                                MusharakahDomainEnums.InstallmentStatus.OVERDUE,
                                MusharakahDomainEnums.InstallmentStatus.DUE,
                                MusharakahDomainEnums.InstallmentStatus.PARTIAL,
                                MusharakahDomainEnums.InstallmentStatus.SCHEDULED))
                .orElse(null);
    }

    public MusharakahBuyoutInstallment processBuyoutPayment(Long contractId, MusharakahRequests.ProcessBuyoutPaymentRequest request) {
        MusharakahBuyoutInstallment installment = getNextDueInstallment(contractId);
        if (installment == null) {
            throw new BusinessException("No buyout installments remain", "NO_BUYOUT_DUE");
        }

        BigDecimal paymentAmount = MusharakahSupport.money(request.getPaymentAmount());
        BigDecimal unitsAffordable = MusharakahSupport.units(paymentAmount.divide(installment.getPricePerUnit(), 8, RoundingMode.HALF_UP));
        if (unitsAffordable.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Payment amount is insufficient to buy any units", "BUYOUT_PAYMENT_TOO_SMALL");
        }

        BigDecimal unitsToTransfer = unitsAffordable.min(installment.getUnitsToTransfer());
        BigDecimal usedAmount = MusharakahSupport.money(unitsToTransfer.multiply(installment.getPricePerUnit()));
        MusharakahUnitTransfer transfer = unitService.transferUnits(
                contractId,
                unitsToTransfer,
                request.getPaymentDate(),
                usedAmount,
                request.getExternalRef());

        installment.setPaidAmount(MusharakahSupport.money(MusharakahSupport.money(installment.getPaidAmount()).add(usedAmount)));
        installment.setPaidDate(request.getPaymentDate());
        installment.setActualUnitsTransferred(MusharakahSupport.units(
                MusharakahSupport.units(installment.getActualUnitsTransferred()).add(unitsToTransfer)));
        installment.setTransactionRef(request.getExternalRef());
        installment.setUnitTransferId(transfer.getId());
        installment.setStatus(installment.getActualUnitsTransferred().compareTo(installment.getUnitsToTransfer()) >= 0
                ? MusharakahDomainEnums.InstallmentStatus.PAID
                : MusharakahDomainEnums.InstallmentStatus.PARTIAL);
        installmentRepository.save(installment);

        rentalService.recalculateRemainingRentals(contractId);
        return installment;
    }

    public MusharakahResponses.CombinedPaymentResult processCombinedPayment(Long contractId,
                                                                            MusharakahRequests.CombinedPaymentRequest request) {
        BigDecimal remaining = MusharakahSupport.money(request.getTotalPayment());
        BigDecimal rentalPaid = MusharakahSupport.ZERO;
        BigDecimal buyoutPaid = MusharakahSupport.ZERO;
        BigDecimal unitsTransferred = MusharakahSupport.ZERO_UNITS;

        var nextRental = rentalService.getNextDueInstallment(contractId);
        if (nextRental != null) {
            BigDecimal rentalDue = MusharakahSupport.money(nextRental.getRentalAmount().subtract(MusharakahSupport.money(nextRental.getPaidAmount())))
                    .add(MusharakahSupport.money(nextRental.getLatePenaltyAmount()));
            BigDecimal applyToRental = remaining.min(rentalDue);
            if (applyToRental.compareTo(BigDecimal.ZERO) > 0) {
                rentalService.processRentalPayment(contractId, MusharakahRequests.ProcessRentalPaymentRequest.builder()
                        .paymentAmount(applyToRental)
                        .paymentDate(request.getPaymentDate())
                        .externalRef(request.getExternalRef())
                        .narration("Combined Musharakah payment - rental portion")
                        .build());
                rentalPaid = applyToRental;
                remaining = MusharakahSupport.money(remaining.subtract(applyToRental));
            }
        }

        var nextBuyout = getNextDueInstallment(contractId);
        if (nextBuyout != null && remaining.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal outstanding = MusharakahSupport.money(nextBuyout.getTotalBuyoutAmount().subtract(MusharakahSupport.money(nextBuyout.getPaidAmount())));
            BigDecimal applyToBuyout = remaining.min(outstanding);
            MusharakahBuyoutInstallment updated = processBuyoutPayment(contractId, MusharakahRequests.ProcessBuyoutPaymentRequest.builder()
                    .paymentAmount(applyToBuyout)
                    .paymentDate(request.getPaymentDate())
                    .externalRef(request.getExternalRef())
                    .build());
            buyoutPaid = applyToBuyout;
            unitsTransferred = MusharakahSupport.units(updated.getActualUnitsTransferred());
            remaining = MusharakahSupport.money(remaining.subtract(applyToBuyout));
        }

        return MusharakahResponses.CombinedPaymentResult.builder()
                .contractId(contractId)
                .rentalPaid(rentalPaid)
                .buyoutPaid(buyoutPaid)
                .unitsTransferred(unitsTransferred)
                .unappliedAmount(remaining)
                .build();
    }

    public void processScheduledBuyouts(LocalDate asOfDate) {
        installmentRepository.findByStatusInAndDueDateBefore(
                        List.of(MusharakahDomainEnums.InstallmentStatus.SCHEDULED, MusharakahDomainEnums.InstallmentStatus.DUE),
                        asOfDate.plusDays(1))
                .forEach(installment -> installment.setStatus(MusharakahDomainEnums.InstallmentStatus.OVERDUE));
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahBuyoutSummary getBuyoutSummary(Long contractId) {
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contractId));
        List<MusharakahBuyoutInstallment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        BigDecimal unitsBoughtToDate = ownership.getTotalUnitsTransferred();
        BigDecimal unitsRemaining = ownership.getBankUnits();
        LocalDate estimatedCompletion = installments.stream()
                .filter(i -> i.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID
                        && i.getStatus() != MusharakahDomainEnums.InstallmentStatus.WAIVED
                        && i.getStatus() != MusharakahDomainEnums.InstallmentStatus.CANCELLED)
                .map(MusharakahBuyoutInstallment::getDueDate)
                .reduce((first, second) -> second)
                .orElse(null);
        return MusharakahResponses.MusharakahBuyoutSummary.builder()
                .contractId(contractId)
                .totalUnits(ownership.getTotalUnits())
                .unitsBoughtToDate(unitsBoughtToDate)
                .unitsRemaining(unitsRemaining)
                .completionPercentage(MusharakahSupport.percentage(unitsBoughtToDate, BigDecimal.valueOf(ownership.getTotalUnits())))
                .estimatedCompletionDate(estimatedCompletion)
                .build();
    }

    private MusharakahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
    }
}
