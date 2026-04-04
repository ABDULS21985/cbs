package com.cbs.musharakah.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahApplication;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahLossEvent;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

final class MusharakahSupport {

    static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    static final BigDecimal HUNDRED = new BigDecimal("100.0000");
    static final BigDecimal ZERO_UNITS = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

    private MusharakahSupport() {
    }

    static BigDecimal money(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal units(BigDecimal value) {
        return value == null ? ZERO_UNITS : value.setScale(4, RoundingMode.HALF_UP);
    }

    static BigDecimal rate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP)
                : value.setScale(4, RoundingMode.HALF_UP);
    }

    static BigDecimal unitPrice(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP)
                : value.setScale(6, RoundingMode.HALF_UP);
    }

    static int totalPeriods(Integer tenorMonths, MusharakahDomainEnums.BuyoutFrequency frequency) {
        int tenor = tenorMonths == null ? 0 : tenorMonths;
        int divisor = switch (frequency == null ? MusharakahDomainEnums.BuyoutFrequency.MONTHLY : frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMI_ANNUALLY -> 6;
            case ANNUALLY -> 12;
        };
        return Math.max(1, (int) Math.ceil((double) tenor / divisor));
    }

    static int totalPeriods(Integer tenorMonths, MusharakahDomainEnums.RentalFrequency frequency) {
        int tenor = tenorMonths == null ? 0 : tenorMonths;
        int divisor = switch (frequency == null ? MusharakahDomainEnums.RentalFrequency.MONTHLY : frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
        };
        return Math.max(1, (int) Math.ceil((double) tenor / divisor));
    }

    static LocalDate addFrequency(LocalDate date, MusharakahDomainEnums.BuyoutFrequency frequency, int steps) {
        return switch (frequency == null ? MusharakahDomainEnums.BuyoutFrequency.MONTHLY : frequency) {
            case MONTHLY -> date.plusMonths(steps);
            case QUARTERLY -> date.plusMonths(steps * 3L);
            case SEMI_ANNUALLY -> date.plusMonths(steps * 6L);
            case ANNUALLY -> date.plusYears(steps);
        };
    }

    static LocalDate addFrequency(LocalDate date, MusharakahDomainEnums.RentalFrequency frequency, int steps) {
        return switch (frequency == null ? MusharakahDomainEnums.RentalFrequency.MONTHLY : frequency) {
            case MONTHLY -> date.plusMonths(steps);
            case QUARTERLY -> date.plusMonths(steps * 3L);
        };
    }

    static LocalDate adjustToBusinessDay(HijriCalendarService hijriCalendarService, LocalDate date) {
        if (date == null) {
            return null;
        }
        return hijriCalendarService.isIslamicBusinessDay(date)
                ? date
                : hijriCalendarService.getNextIslamicBusinessDay(date);
    }

    static String toHijriString(HijriCalendarService hijriCalendarService, LocalDate date) {
        HijriDateResponse hijri = hijriCalendarService.toHijri(date);
        return "%04d-%02d-%02d".formatted(hijri.getHijriYear(), hijri.getHijriMonth(), hijri.getHijriDay());
    }

    static String nextReference(String prefix, AtomicLong sequence) {
        long next = Math.floorMod(sequence.incrementAndGet(), 1_000_000L);
        return "%s-%d-%06d".formatted(prefix, LocalDate.now().getYear(), next);
    }

    static BigDecimal percentage(BigDecimal part, BigDecimal total) {
        if (part == null || total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return part.multiply(HUNDRED).divide(total, 4, RoundingMode.HALF_UP);
    }

    static BigDecimal deriveMonthlyRental(BigDecimal bankShareValue, BigDecimal annualRatePercentage, MusharakahDomainEnums.RentalFrequency frequency) {
        if (bankShareValue == null || annualRatePercentage == null) {
            return ZERO;
        }
        BigDecimal periodsPerYear = switch (frequency == null ? MusharakahDomainEnums.RentalFrequency.MONTHLY : frequency) {
            case MONTHLY -> new BigDecimal("12");
            case QUARTERLY -> new BigDecimal("4");
        };
        return money(bankShareValue
                .multiply(rate(annualRatePercentage))
                .divide(HUNDRED, 8, RoundingMode.HALF_UP)
                .divide(periodsPerYear, 8, RoundingMode.HALF_UP));
    }

    static MusharakahResponses.MusharakahApplicationResponse toApplicationResponse(MusharakahApplication application, List<String> warnings) {
        return MusharakahResponses.MusharakahApplicationResponse.builder()
                .id(application.getId())
                .applicationRef(application.getApplicationRef())
                .customerId(application.getCustomerId())
                .productCode(application.getProductCode())
                .musharakahType(application.getMusharakahType())
                .requestedFinancingAmount(application.getRequestedFinancingAmount())
                .customerEquityAmount(application.getCustomerEquityAmount())
                .totalPropertyValue(application.getTotalPropertyValue())
                .currencyCode(application.getCurrencyCode())
                .requestedTenorMonths(application.getRequestedTenorMonths())
                .assetDescription(application.getAssetDescription())
                .assetCategory(application.getAssetCategory())
                .estimatedAssetValue(application.getEstimatedAssetValue())
                .estimatedMonthlyPayment(application.getEstimatedMonthlyPayment())
                .dsr(application.getDsr())
                .proposedBankContribution(application.getProposedBankContribution())
                .proposedCustomerContribution(application.getProposedCustomerContribution())
                .proposedBankPercentage(application.getProposedBankPercentage())
                .proposedCustomerPercentage(application.getProposedCustomerPercentage())
                .proposedRentalRate(application.getProposedRentalRate())
                .proposedUnitsTotal(application.getProposedUnitsTotal())
                .proposedProfitSharingBank(application.getProposedProfitSharingBank())
                .proposedProfitSharingCustomer(application.getProposedProfitSharingCustomer())
                .status(application.getStatus())
                .approvedBy(application.getApprovedBy())
                .approvedAt(application.getApprovedAt())
                .contractId(application.getContractId())
                .warnings(warnings == null ? new ArrayList<>() : new ArrayList<>(warnings))
                .build();
    }

    static MusharakahResponses.MusharakahContractResponse toContractResponse(MusharakahContract contract) {
        return MusharakahResponses.MusharakahContractResponse.builder()
                .id(contract.getId())
                .contractRef(contract.getContractRef())
                .applicationId(contract.getApplicationId())
                .customerId(contract.getCustomerId())
                .accountId(contract.getAccountId())
                .productCode(contract.getProductCode())
                .contractTypeCode(contract.getContractTypeCode())
                .musharakahType(contract.getMusharakahType())
                .assetDescription(contract.getAssetDescription())
                .assetCategory(contract.getAssetCategory())
                .assetAddress(contract.getAssetAddress())
                .assetTitleDeedRef(contract.getAssetTitleDeedRef())
                .assetPurchasePrice(contract.getAssetPurchasePrice())
                .assetCurrentMarketValue(contract.getAssetCurrentMarketValue())
                .currencyCode(contract.getCurrencyCode())
                .bankCapitalContribution(contract.getBankCapitalContribution())
                .customerCapitalContribution(contract.getCustomerCapitalContribution())
                .totalCapital(contract.getTotalCapital())
                .totalOwnershipUnits(contract.getTotalOwnershipUnits())
                .bankCurrentUnits(contract.getBankCurrentUnits())
                .customerCurrentUnits(contract.getCustomerCurrentUnits())
                .bankOwnershipPercentage(contract.getBankOwnershipPercentage())
                .customerOwnershipPercentage(contract.getCustomerOwnershipPercentage())
                .unitValue(contract.getUnitValue())
                .unitPricingMethod(contract.getUnitPricingMethod())
                .profitSharingRatioBank(contract.getProfitSharingRatioBank())
                .profitSharingRatioCustomer(contract.getProfitSharingRatioCustomer())
                .lossSharingMethod(contract.getLossSharingMethod())
                .rentalFrequency(contract.getRentalFrequency())
                .baseRentalRate(contract.getBaseRentalRate())
                .buyoutFrequency(contract.getBuyoutFrequency())
                .unitsPerBuyoutDecimal(contract.getUnitsPerBuyoutDecimal())
                .totalRentalExpected(contract.getTotalRentalExpected())
                .totalRentalReceived(contract.getTotalRentalReceived())
                .totalBuyoutPaymentsExpected(contract.getTotalBuyoutPaymentsExpected())
                .totalBuyoutPaymentsReceived(contract.getTotalBuyoutPaymentsReceived())
                .estimatedMonthlyPayment(contract.getEstimatedMonthlyPayment())
                .status(contract.getStatus())
                .executedAt(contract.getExecutedAt())
                .executedBy(contract.getExecutedBy())
                .fullyBoughtOutAt(contract.getFullyBoughtOutAt())
                .dissolvedAt(contract.getDissolvedAt())
                .investmentPoolId(contract.getInvestmentPoolId())
                .poolAssetAssignmentId(contract.getPoolAssetAssignmentId())
                .lastScreeningRef(contract.getLastScreeningRef())
                .build();
    }

    static MusharakahResponses.OwnershipState toOwnershipState(MusharakahOwnershipUnit ownership) {
        return MusharakahResponses.OwnershipState.builder()
                .contractId(ownership.getContractId())
                .totalUnits(ownership.getTotalUnits())
                .bankUnits(ownership.getBankUnits())
                .customerUnits(ownership.getCustomerUnits())
                .bankPercentage(ownership.getBankPercentage())
                .customerPercentage(ownership.getCustomerPercentage())
                .currentUnitValue(ownership.getCurrentUnitValue())
                .bankShareValue(ownership.getBankShareValue())
                .customerShareValue(ownership.getCustomerShareValue())
                .fullyBoughtOut(ownership.getIsFullyBoughtOut())
                .build();
    }

    static MusharakahResponses.MusharakahLossEventResponse toLossResponse(MusharakahLossEvent event) {
        return MusharakahResponses.MusharakahLossEventResponse.builder()
                .id(event.getId())
                .contractId(event.getContractId())
                .lossEventRef(event.getLossEventRef())
                .lossDate(event.getLossDate())
                .lossType(event.getLossType())
                .totalLossAmount(event.getTotalLossAmount())
                .bankCapitalRatioAtLoss(event.getBankCapitalRatioAtLoss())
                .customerCapitalRatioAtLoss(event.getCustomerCapitalRatioAtLoss())
                .bankLossShare(event.getBankLossShare())
                .customerLossShare(event.getCustomerLossShare())
                .allocationMethod(event.getAllocationMethod())
                .verifiedByCompliance(event.getVerifiedByCompliance())
                .verifiedBy(event.getVerifiedBy())
                .verifiedAt(event.getVerifiedAt())
                .bankShareValueAfterLoss(event.getBankShareValueAfterLoss())
                .customerShareValueAfterLoss(event.getCustomerShareValueAfterLoss())
                .assetValueAfterLoss(event.getAssetValueAfterLoss())
                .insuranceRecoveryExpected(event.getInsuranceRecoveryExpected())
                .netLossAfterInsurance(event.getNetLossAfterInsurance())
                .status(event.getStatus())
                .build();
    }

    static BigDecimal sumBuyoutAmounts(List<MusharakahBuyoutInstallment> installments) {
        return installments.stream()
                .map(MusharakahBuyoutInstallment::getTotalBuyoutAmount)
                .map(MusharakahSupport::money)
                .reduce(ZERO, BigDecimal::add);
    }
}
