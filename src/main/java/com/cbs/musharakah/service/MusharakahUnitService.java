package com.cbs.musharakah.service;

import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahUnitTransfer;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahUnitTransferRepository;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class MusharakahUnitService {

    private static final AtomicLong TRANSFER_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);

    private final MusharakahContractRepository contractRepository;
    private final MusharakahOwnershipUnitRepository ownershipUnitRepository;
    private final MusharakahUnitTransferRepository unitTransferRepository;
    private final HijriCalendarService hijriCalendarService;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;
    private final MusharakahRentalService rentalService;

    public MusharakahOwnershipUnit initialiseUnits(Long contractId) {
        MusharakahContract contract = getContract(contractId);
        return ownershipUnitRepository.findByContractId(contractId)
                .orElseGet(() -> {
                    BigDecimal totalUnits = BigDecimal.valueOf(contract.getTotalOwnershipUnits());
                    BigDecimal bankUnits = MusharakahSupport.units(contract.getBankCurrentUnits());
                    BigDecimal customerUnits = MusharakahSupport.units(totalUnits.subtract(bankUnits));
                    MusharakahOwnershipUnit ownership = MusharakahOwnershipUnit.builder()
                            .contractId(contractId)
                            .totalUnits(contract.getTotalOwnershipUnits())
                            .bankUnits(bankUnits)
                            .customerUnits(customerUnits)
                            .bankPercentage(MusharakahSupport.percentage(bankUnits, totalUnits))
                            .customerPercentage(MusharakahSupport.percentage(customerUnits, totalUnits))
                            .unitValueAtInception(MusharakahSupport.unitPrice(contract.getUnitValue()))
                            .currentUnitValue(MusharakahSupport.unitPrice(contract.getUnitValue()))
                            .lastUnitValueUpdateDate(LocalDate.now())
                            .bankShareValue(MusharakahSupport.money(bankUnits.multiply(contract.getUnitValue())))
                            .customerShareValue(MusharakahSupport.money(customerUnits.multiply(contract.getUnitValue())))
                            .lastTransferUnits(MusharakahSupport.ZERO_UNITS)
                            .totalUnitsTransferred(MusharakahSupport.ZERO_UNITS)
                            .isFullyBoughtOut(false)
                            .build();
                    return ownershipUnitRepository.save(ownership);
                });
    }

    public MusharakahUnitTransfer transferUnits(Long contractId, BigDecimal unitCount, LocalDate transferDate) {
        return transferUnits(contractId, unitCount, transferDate, null, null);
    }

    public MusharakahUnitTransfer transferUnits(Long contractId,
                                                BigDecimal unitCount,
                                                LocalDate transferDate,
                                                BigDecimal paymentAmount,
                                                String paymentTransactionRef) {
        MusharakahContract contract = getContract(contractId);
        if (contract.getStatus() != MusharakahDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.BUYOUT_ARREARS) {
            throw new BusinessException("Unit transfers are only allowed on active Musharakah contracts", "INVALID_CONTRACT_STATUS");
        }
        // Use optimistic locking to prevent concurrent unit transfers on the same ownership record
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractIdWithLock(contractId)
                .orElseGet(() -> initialiseUnits(contractId));
        BigDecimal requestedUnits = MusharakahSupport.units(unitCount);
        if (requestedUnits.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Units transferred must be greater than zero", "INVALID_UNIT_TRANSFER");
        }
        if (ownership.getBankUnits().compareTo(requestedUnits) < 0) {
            throw new BusinessException("Bank does not have enough remaining units to transfer", "INSUFFICIENT_BANK_UNITS");
        }
        if (ownership.getIsFullyBoughtOut()) {
            throw new BusinessException("Musharakah is already fully bought out", "NO_UNITS_REMAINING");
        }

        BigDecimal pricePerUnit = resolvePricePerUnit(contract, ownership);
        BigDecimal totalTransferPrice = MusharakahSupport.money(requestedUnits.multiply(pricePerUnit));
        if (paymentAmount != null && MusharakahSupport.money(paymentAmount).compareTo(totalTransferPrice) < 0) {
            throw new BusinessException("Payment amount " + MusharakahSupport.money(paymentAmount).toPlainString()
                    + " is less than total transfer price " + totalTransferPrice.toPlainString(), "INSUFFICIENT_PAYMENT_AMOUNT");
        }
        BigDecimal effectivePayment = paymentAmount != null ? MusharakahSupport.money(paymentAmount) : totalTransferPrice;
        BigDecimal bookValue = MusharakahSupport.money(requestedUnits.multiply(ownership.getUnitValueAtInception()));
        BigDecimal gain = totalTransferPrice.compareTo(bookValue) > 0
                ? MusharakahSupport.money(totalTransferPrice.subtract(bookValue))
                : MusharakahSupport.ZERO;
        BigDecimal loss = bookValue.compareTo(totalTransferPrice) > 0
                ? MusharakahSupport.money(bookValue.subtract(totalTransferPrice))
                : MusharakahSupport.ZERO;

        BigDecimal bankUnitsBefore = ownership.getBankUnits();
        BigDecimal customerUnitsBefore = ownership.getCustomerUnits();
        BigDecimal bankUnitsAfter = MusharakahSupport.units(bankUnitsBefore.subtract(requestedUnits));
        BigDecimal customerUnitsAfter = MusharakahSupport.units(customerUnitsBefore.add(requestedUnits));
        BigDecimal totalUnits = BigDecimal.valueOf(ownership.getTotalUnits());

        String reference = contract.getContractRef() + "-UNIT-" + TRANSFER_SEQUENCE.incrementAndGet();
        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MUSHARAKAH")
                .txnType(IslamicTransactionType.OWNERSHIP_TRANSFER)
                .accountId(contract.getAccountId())
                .amount(totalTransferPrice)
                .principal(bookValue)
                .profit(gain)
                .valueDate(transferDate != null ? transferDate : LocalDate.now())
                .reference(reference)
                .narration("Musharakah unit transfer")
                .build());

        ownership.setBankUnits(bankUnitsAfter);
        ownership.setCustomerUnits(customerUnitsAfter);
        ownership.setBankPercentage(MusharakahSupport.percentage(bankUnitsAfter, totalUnits));
        ownership.setCustomerPercentage(MusharakahSupport.percentage(customerUnitsAfter, totalUnits));
        ownership.setBankShareValue(MusharakahSupport.money(bankUnitsAfter.multiply(ownership.getCurrentUnitValue())));
        ownership.setCustomerShareValue(MusharakahSupport.money(customerUnitsAfter.multiply(ownership.getCurrentUnitValue())));
        ownership.setLastTransferDate(transferDate != null ? transferDate : LocalDate.now());
        ownership.setLastTransferUnits(requestedUnits);
        ownership.setTotalUnitsTransferred(MusharakahSupport.units(ownership.getTotalUnitsTransferred().add(requestedUnits)));
        ownership.setIsFullyBoughtOut(bankUnitsAfter.compareTo(BigDecimal.ZERO) == 0);
        ownershipUnitRepository.save(ownership);

        MusharakahUnitTransfer transfer = MusharakahUnitTransfer.builder()
                .contractId(contractId)
                .ownershipUnitId(ownership.getId())
                .transferNumber(nextTransferNumber(contractId))
                .transferDate(transferDate != null ? transferDate : LocalDate.now())
                .transferDateHijri(MusharakahSupport.toHijriString(hijriCalendarService, transferDate != null ? transferDate : LocalDate.now()))
                .unitsTransferred(requestedUnits)
                .pricePerUnit(pricePerUnit)
                .totalTransferPrice(totalTransferPrice)
                .pricingMethod(resolveTransferPricingMethod(contract))
                .bankUnitsBefore(bankUnitsBefore)
                .bankUnitsAfter(bankUnitsAfter)
                .customerUnitsBefore(customerUnitsBefore)
                .customerUnitsAfter(customerUnitsAfter)
                .bankPercentageBefore(MusharakahSupport.percentage(bankUnitsBefore, totalUnits))
                .bankPercentageAfter(MusharakahSupport.percentage(bankUnitsAfter, totalUnits))
                .customerPercentageBefore(MusharakahSupport.percentage(customerUnitsBefore, totalUnits))
                .customerPercentageAfter(MusharakahSupport.percentage(customerUnitsAfter, totalUnits))
                .bookValueOfUnitsTransferred(bookValue)
                .gainOnTransfer(gain)
                .lossOnTransfer(loss)
                .journalRef(journal != null ? journal.getJournalNumber() : null)
                .paymentTransactionRef(paymentTransactionRef)
                .paymentAmount(effectivePayment)
                .status(MusharakahDomainEnums.InstallmentStatus.PAID)
                .paidDate(transferDate != null ? transferDate : LocalDate.now())
                .build();
        transfer = unitTransferRepository.save(transfer);

        contract.setBankCurrentUnits(bankUnitsAfter);
        contract.setCustomerCurrentUnits(customerUnitsAfter);
        contract.setBankOwnershipPercentage(ownership.getBankPercentage());
        contract.setCustomerOwnershipPercentage(ownership.getCustomerPercentage());
        contract.setTotalBuyoutPaymentsReceived(MusharakahSupport.money(
                MusharakahSupport.money(contract.getTotalBuyoutPaymentsReceived()).add(totalTransferPrice)));
        if (bankUnitsAfter.compareTo(BigDecimal.ZERO) == 0) {
            contract.setStatus(MusharakahDomainEnums.ContractStatus.FULLY_BOUGHT_OUT);
            contract.setFullyBoughtOutAt(transfer.getTransferDate());
        }
        contractRepository.save(contract);

        if (contract.getInvestmentPoolId() != null) {
            if (gain.compareTo(BigDecimal.ZERO) > 0) {
                poolAssetManagementService.recordIncome(contract.getInvestmentPoolId(), RecordPoolIncomeRequest.builder()
                        .poolId(contract.getInvestmentPoolId())
                        .assetAssignmentId(contract.getPoolAssetAssignmentId())
                        .incomeType("MUSHARAKAH_PROFIT")
                        .amount(gain)
                        .currencyCode(contract.getCurrencyCode())
                        .incomeDate(transfer.getTransferDate())
                        .periodFrom(transfer.getTransferDate().withDayOfMonth(1))
                        .periodTo(transfer.getTransferDate())
                        .journalRef(transfer.getJournalRef())
                        .assetReferenceCode(contract.getContractRef())
                        .contractTypeCode("MUSHARAKAH")
                        .notes("Musharakah unit transfer gain")
                        .build());
            } else if (loss.compareTo(BigDecimal.ZERO) > 0) {
                poolAssetManagementService.recordExpense(contract.getInvestmentPoolId(),
                        com.cbs.profitdistribution.dto.RecordPoolExpenseRequest.builder()
                                .poolId(contract.getInvestmentPoolId())
                                .expenseType("MUSHARAKAH_LOSS")
                                .amount(loss)
                                .currencyCode(contract.getCurrencyCode())
                                .expenseDate(transfer.getTransferDate())
                                .periodFrom(transfer.getTransferDate().withDayOfMonth(1))
                                .periodTo(transfer.getTransferDate())
                                .journalRef(transfer.getJournalRef())
                                .assetReferenceCode(contract.getContractRef())
                                .contractTypeCode("MUSHARAKAH")
                                .notes("Musharakah unit transfer loss — book value exceeded transfer price")
                                .build());
            }
        }

        rentalService.recalculateRemainingRentals(contractId);
        return transfer;
    }

    public void processScheduledTransfers(LocalDate asOfDate) {
        List<MusharakahUnitTransfer> scheduledTransfers = unitTransferRepository.findByStatusInAndTransferDateBefore(
                        List.of(MusharakahDomainEnums.InstallmentStatus.SCHEDULED, MusharakahDomainEnums.InstallmentStatus.DUE),
                        asOfDate.plusDays(1));
        for (MusharakahUnitTransfer scheduled : scheduledTransfers) {
            try {
                transferUnits(
                        scheduled.getContractId(),
                        scheduled.getUnitsTransferred(),
                        scheduled.getTransferDate(),
                        scheduled.getPaymentAmount(),
                        scheduled.getPaymentTransactionRef());
                scheduled.setStatus(MusharakahDomainEnums.InstallmentStatus.PAID);
                scheduled.setPaidDate(asOfDate);
            } catch (BusinessException e) {
                scheduled.setStatus(MusharakahDomainEnums.InstallmentStatus.OVERDUE);
            }
            unitTransferRepository.save(scheduled);
        }
    }

    public void updateUnitFairValue(Long contractId, BigDecimal currentMarketValue, String appraiser) {
        MusharakahContract contract = getContract(contractId);
        MusharakahOwnershipUnit ownership = ownershipUnitRepository.findByContractId(contractId)
                .orElseGet(() -> initialiseUnits(contractId));
        if (contract.getUnitPricingMethod() != MusharakahDomainEnums.UnitPricingMethod.PERIODIC_FAIR_VALUE) {
            throw new BusinessException("Fair value updates are only allowed for fair-value unit pricing", "INVALID_UNIT_PRICING_METHOD");
        }
        BigDecimal currentUnitValue = MusharakahSupport.unitPrice(
                MusharakahSupport.money(currentMarketValue).divide(BigDecimal.valueOf(ownership.getTotalUnits()), 8, RoundingMode.HALF_UP));
        ownership.setCurrentUnitValue(currentUnitValue);
        ownership.setLastUnitValueUpdateDate(LocalDate.now());
        ownership.setBankShareValue(MusharakahSupport.money(ownership.getBankUnits().multiply(currentUnitValue)));
        ownership.setCustomerShareValue(MusharakahSupport.money(ownership.getCustomerUnits().multiply(currentUnitValue)));
        ownership.setLastAppraiser(appraiser);
        ownership.setLastValuationRef("FV-" + contractId + "-" + LocalDate.now());
        ownershipUnitRepository.save(ownership);

        contract.setAssetCurrentMarketValue(MusharakahSupport.money(currentMarketValue));
        contract.setAssetLastValuationDate(LocalDate.now());
        contract.setUnitValue(currentUnitValue);
        contractRepository.save(contract);

        // Trigger rental recalculation after fair value update
        rentalService.recalculateRemainingRentals(contractId);
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.OwnershipState getCurrentOwnership(Long contractId) {
        return MusharakahSupport.toOwnershipState(
                ownershipUnitRepository.findByContractId(contractId)
                        .orElseThrow(() -> new ResourceNotFoundException("MusharakahOwnershipUnit", "contractId", contractId)));
    }

    @Transactional(readOnly = true)
    public List<MusharakahUnitTransfer> getTransferHistory(Long contractId) {
        return unitTransferRepository.findByContractIdOrderByTransferNumberAsc(contractId);
    }

    @Transactional(readOnly = true)
    public MusharakahUnitTransfer getLastTransfer(Long contractId) {
        return unitTransferRepository.findFirstByContractIdOrderByTransferNumberDesc(contractId).orElse(null);
    }

    @Transactional(readOnly = true)
    public BigDecimal getBankShareValue(Long contractId) {
        return ownershipUnitRepository.findByContractId(contractId)
                .map(MusharakahOwnershipUnit::getBankShareValue)
                .orElse(MusharakahSupport.ZERO);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCustomerShareValue(Long contractId) {
        return ownershipUnitRepository.findByContractId(contractId)
                .map(MusharakahOwnershipUnit::getCustomerShareValue)
                .orElse(MusharakahSupport.ZERO);
    }

    @Transactional(readOnly = true)
    public boolean isFullyBoughtOut(Long contractId) {
        return ownershipUnitRepository.findByContractId(contractId)
                .map(MusharakahOwnershipUnit::getIsFullyBoughtOut)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.OwnershipTimeline getOwnershipTimeline(Long contractId) {
        List<MusharakahResponses.OwnershipTimelinePoint> points = unitTransferRepository.findByContractIdOrderByTransferNumberAsc(contractId).stream()
                .map(transfer -> MusharakahResponses.OwnershipTimelinePoint.builder()
                        .transferNumber(transfer.getTransferNumber())
                        .transferDate(transfer.getTransferDate())
                        .bankPercentage(transfer.getBankPercentageAfter())
                        .customerPercentage(transfer.getCustomerPercentageAfter())
                        .build())
                .toList();
        return MusharakahResponses.OwnershipTimeline.builder()
                .contractId(contractId)
                .points(points)
                .build();
    }

    private BigDecimal resolvePricePerUnit(MusharakahContract contract, MusharakahOwnershipUnit ownership) {
        return switch (contract.getUnitPricingMethod()) {
            case PERIODIC_FAIR_VALUE -> ownership.getCurrentUnitValue();
            case AGREED_SCHEDULE -> ownership.getCurrentUnitValue() != null
                    ? ownership.getCurrentUnitValue()
                    : ownership.getUnitValueAtInception();
            case FIXED_AT_INCEPTION -> ownership.getUnitValueAtInception();
        };
    }

    private MusharakahDomainEnums.TransferPricingMethod resolveTransferPricingMethod(MusharakahContract contract) {
        return switch (contract.getUnitPricingMethod()) {
            case PERIODIC_FAIR_VALUE -> MusharakahDomainEnums.TransferPricingMethod.FAIR_VALUE;
            case AGREED_SCHEDULE -> MusharakahDomainEnums.TransferPricingMethod.AGREED;
            case FIXED_AT_INCEPTION -> MusharakahDomainEnums.TransferPricingMethod.FIXED;
        };
    }

    private int nextTransferNumber(Long contractId) {
        return unitTransferRepository.findFirstByContractIdOrderByTransferNumberDesc(contractId)
                .map(existing -> existing.getTransferNumber() + 1)
                .orElse(1);
    }

    private MusharakahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
    }
}
