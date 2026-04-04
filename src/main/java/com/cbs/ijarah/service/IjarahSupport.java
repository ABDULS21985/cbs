package com.cbs.ijarah.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahApplication;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahGradualTransferUnit;
import com.cbs.ijarah.entity.IjarahTransferMechanism;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

final class IjarahSupport {

    static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    static final BigDecimal HUNDRED = new BigDecimal("100");

    private IjarahSupport() {
    }

    static BigDecimal money(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal rate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP)
                : value.setScale(4, RoundingMode.HALF_UP);
    }

    static String nextReference(String prefix, AtomicLong sequence) {
        long next = Math.floorMod(sequence.incrementAndGet(), 1_000_000L);
        return "%s-%d-%06d".formatted(prefix, LocalDate.now().getYear(), next);
    }

    static int periodsForTenor(Integer tenorMonths, IjarahDomainEnums.RentalFrequency frequency) {
        int tenor = tenorMonths == null ? 0 : tenorMonths;
        int divisor = switch (frequency == null ? IjarahDomainEnums.RentalFrequency.MONTHLY : frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMI_ANNUALLY -> 6;
            case ANNUALLY -> 12;
        };
        return Math.max(1, (int) Math.ceil((double) tenor / divisor));
    }

    static LocalDate addFrequency(LocalDate date, IjarahDomainEnums.RentalFrequency frequency, int steps) {
        IjarahDomainEnums.RentalFrequency effective = frequency == null
                ? IjarahDomainEnums.RentalFrequency.MONTHLY
                : frequency;
        return switch (effective) {
            case MONTHLY -> date.plusMonths(steps);
            case QUARTERLY -> date.plusMonths(steps * 3L);
            case SEMI_ANNUALLY -> date.plusMonths(steps * 6L);
            case ANNUALLY -> date.plusYears(steps);
        };
    }

    static LocalDate adjustToBusinessDay(HijriCalendarService hijriCalendarService, LocalDate date) {
        if (date == null) {
            return null;
        }
        if (hijriCalendarService.isIslamicBusinessDay(date)) {
            return date;
        }
        return hijriCalendarService.getNextIslamicBusinessDay(date);
    }

    static String toHijriString(HijriCalendarService hijriCalendarService, LocalDate date) {
        HijriDateResponse hijri = hijriCalendarService.toHijri(date);
        return "%04d-%02d-%02d".formatted(hijri.getHijriYear(), hijri.getHijriMonth(), hijri.getHijriDay());
    }

    static BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    static BigDecimal calculateRental(BigDecimal assetCost, BigDecimal residualValue, BigDecimal targetProfit, int periods) {
        if (periods <= 0) {
            return ZERO;
        }
        BigDecimal numerator = safe(assetCost).subtract(safe(residualValue)).add(safe(targetProfit));
        return money(numerator.divide(BigDecimal.valueOf(periods), 8, RoundingMode.HALF_UP));
    }

    static BigDecimal percentage(BigDecimal base, BigDecimal pct) {
        return money(safe(base).multiply(rate(pct)).divide(HUNDRED, 8, RoundingMode.HALF_UP));
    }

    static IjarahResponses.IjarahApplicationResponse toApplicationResponse(IjarahApplication application) {
        return IjarahResponses.IjarahApplicationResponse.builder()
                .id(application.getId())
                .applicationRef(application.getApplicationRef())
                .customerId(application.getCustomerId())
                .productCode(application.getProductCode())
                .ijarahType(application.getIjarahType())
                .requestedAssetDescription(application.getRequestedAssetDescription())
                .requestedAssetCategory(application.getRequestedAssetCategory())
                .estimatedAssetCost(application.getEstimatedAssetCost())
                .requestedTenorMonths(application.getRequestedTenorMonths())
                .currencyCode(application.getCurrencyCode())
                .proposedRentalAmount(application.getProposedRentalAmount())
                .proposedRentalFrequency(application.getProposedRentalFrequency())
                .proposedAdvanceRentals(application.getProposedAdvanceRentals())
                .proposedSecurityDeposit(application.getProposedSecurityDeposit())
                .dsrWithProposedRental(application.getDsrWithProposedRental())
                .creditScore(application.getCreditScore())
                .status(application.getStatus())
                .approvedBy(application.getApprovedBy())
                .approvedAt(application.getApprovedAt())
                .contractId(application.getContractId())
                .build();
    }

    static IjarahResponses.IjarahContractResponse toContractResponse(IjarahContract contract) {
        return IjarahResponses.IjarahContractResponse.builder()
                .id(contract.getId())
                .contractRef(contract.getContractRef())
                .applicationId(contract.getApplicationId())
                .customerId(contract.getCustomerId())
                .accountId(contract.getAccountId())
                .productCode(contract.getProductCode())
                .contractTypeCode(contract.getContractTypeCode())
                .ijarahType(contract.getIjarahType())
                .ijarahAssetId(contract.getIjarahAssetId())
                .assetDescription(contract.getAssetDescription())
                .assetCategory(contract.getAssetCategory())
                .assetLocation(contract.getAssetLocation())
                .assetAcquisitionCost(contract.getAssetAcquisitionCost())
                .assetResidualValue(contract.getAssetResidualValue())
                .currencyCode(contract.getCurrencyCode())
                .leaseStartDate(contract.getLeaseStartDate())
                .leaseEndDate(contract.getLeaseEndDate())
                .tenorMonths(contract.getTenorMonths())
                .totalLeasePeriods(contract.getTotalLeasePeriods())
                .rentalFrequency(contract.getRentalFrequency())
                .baseRentalAmount(contract.getBaseRentalAmount())
                .rentalType(contract.getRentalType())
                .rentalReviewFrequency(contract.getRentalReviewFrequency())
                .nextRentalReviewDate(contract.getNextRentalReviewDate())
                .advanceRentals(contract.getAdvanceRentals())
                .advanceRentalAmount(contract.getAdvanceRentalAmount())
                .securityDeposit(contract.getSecurityDeposit())
                .totalRentalsExpected(contract.getTotalRentalsExpected())
                .totalRentalsReceived(contract.getTotalRentalsReceived())
                .totalRentalArrears(contract.getTotalRentalArrears())
                .assetOwnedByBank(contract.getAssetOwnedByBank())
                .insurancePolicyRef(contract.getInsurancePolicyRef())
                .insuranceExpiryDate(contract.getInsuranceExpiryDate())
                .imbTransferScheduled(contract.getImbTransferScheduled())
                .imbTransferCompleted(contract.getImbTransferCompleted())
                .imbTransferDate(contract.getImbTransferDate())
                .status(contract.getStatus())
                .executedAt(contract.getExecutedAt())
                .executedBy(contract.getExecutedBy())
                .investmentPoolId(contract.getInvestmentPoolId())
                .poolAssetAssignmentId(contract.getPoolAssetAssignmentId())
                .build();
    }

    static IjarahResponses.IjarahTransferResponse toTransferResponse(IjarahTransferMechanism mechanism) {
        return IjarahResponses.IjarahTransferResponse.builder()
                .id(mechanism.getId())
                .transferRef(mechanism.getTransferRef())
                .ijarahContractId(mechanism.getIjarahContractId())
                .transferType(mechanism.getTransferType())
                .isSeparateDocument(mechanism.getIsSeparateDocument())
                .documentReference(mechanism.getDocumentReference())
                .documentDate(mechanism.getDocumentDate())
                .documentType(mechanism.getDocumentType())
                .signedByBank(mechanism.getSignedByBank())
                .signedByCustomer(mechanism.getSignedByCustomer())
                .nominalSalePrice(mechanism.getNominalSalePrice())
                .actualFairValue(mechanism.getActualFairValue())
                .totalTransferUnits(mechanism.getTotalTransferUnits())
                .unitsTransferredToDate(mechanism.getUnitsTransferredToDate())
                .nextUnitTransferDate(mechanism.getNextUnitTransferDate())
                .status(mechanism.getStatus())
                .transferJournalRef(mechanism.getTransferJournalRef())
                .assetNetBookValueAtTransfer(mechanism.getAssetNetBookValueAtTransfer())
                .gainLossOnTransfer(mechanism.getGainLossOnTransfer())
                .build();
    }

    static IjarahResponses.UnitTransferScheduleLine toUnitSchedule(IjarahGradualTransferUnit unit) {
        return IjarahResponses.UnitTransferScheduleLine.builder()
                .unitNumber(unit.getUnitNumber())
                .scheduledDate(unit.getScheduledDate())
                .unitPercentage(unit.getUnitPercentage())
                .unitPrice(unit.getUnitPrice())
                .cumulativeOwnership(unit.getCumulativeOwnership())
                .status(unit.getStatus())
                .build();
    }

    static IjarahResponses.IjarahAssetDashboard toAssetDashboard(List<IjarahAsset> assets) {
        BigDecimal totalCost = assets.stream()
                .map(asset -> money(asset.getAcquisitionCost()))
                .reduce(ZERO, BigDecimal::add);
        BigDecimal totalNbv = assets.stream()
                .map(asset -> money(asset.getNetBookValue()))
                .reduce(ZERO, BigDecimal::add);
        BigDecimal totalDepreciation = assets.stream()
                .map(asset -> money(asset.getAccumulatedDepreciation()))
                .reduce(ZERO, BigDecimal::add);
        Map<String, Long> byCategory = assets.stream()
                .collect(java.util.stream.Collectors.groupingBy(asset -> asset.getAssetCategory().name(),
                        java.util.stream.Collectors.counting()));
        Map<String, Long> byStatus = assets.stream()
                .collect(java.util.stream.Collectors.groupingBy(asset -> asset.getStatus().name(),
                        java.util.stream.Collectors.counting()));

        return IjarahResponses.IjarahAssetDashboard.builder()
                .totalAssets(assets.size())
                .totalCost(totalCost)
                .totalNetBookValue(totalNbv)
                .totalAccumulatedDepreciation(totalDepreciation)
                .byCategory(byCategory)
                .byStatus(byStatus)
                .fullyDepreciatedCount(assets.stream()
                        .filter(asset -> money(asset.getNetBookValue()).compareTo(money(asset.getResidualValue())) <= 0)
                        .count())
                .build();
    }
}
