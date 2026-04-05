package com.cbs.ijarah.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahApplication;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahGradualTransferUnit;
import com.cbs.ijarah.entity.IjarahTransferMechanism;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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

    static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    static int totalPeriods(Integer tenorMonths, IjarahDomainEnums.RentalFrequency frequency) {
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
        IjarahDomainEnums.RentalFrequency effectiveFrequency = frequency == null
                ? IjarahDomainEnums.RentalFrequency.MONTHLY
                : frequency;
        return switch (effectiveFrequency) {
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
        return hijriCalendarService.isIslamicBusinessDay(date)
                ? date
                : hijriCalendarService.getNextIslamicBusinessDay(date);
    }

    static String toHijriString(HijriCalendarService hijriCalendarService, LocalDate date) {
        HijriDateResponse hijri = hijriCalendarService.toHijri(date);
        return "%04d-%02d-%02d".formatted(hijri.getHijriYear(), hijri.getHijriMonth(), hijri.getHijriDay());
    }

    static BigDecimal calculateRentalAmount(BigDecimal assetCost,
                                            BigDecimal residualValue,
                                            BigDecimal targetProfit,
                                            int totalPeriods) {
        if (totalPeriods <= 0) {
            return ZERO;
        }
        BigDecimal totalRentals = nvl(assetCost)
                .subtract(nvl(residualValue))
                .add(nvl(targetProfit));
        return money(totalRentals.divide(BigDecimal.valueOf(totalPeriods), 8, RoundingMode.HALF_UP));
    }

    /**
     * Generates a cluster-safe unique reference using UUID instead of AtomicLong sequence.
     * The AtomicLong parameter is retained for API compatibility but is no longer used.
     */
    static String nextReference(String prefix, AtomicLong sequence) {
        return "%s-%d-%s".formatted(prefix, LocalDate.now().getYear(),
                UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }

    static IjarahResponses.IjarahApplicationResponse toApplicationResponse(IjarahApplication application, List<String> warnings) {
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
                .warnings(warnings == null ? new ArrayList<>() : new ArrayList<>(warnings))
                .purpose(application.getPurpose())
                .monthlyIncome(application.getMonthlyIncome())
                .existingObligations(application.getExistingObligations())
                .assignedOfficerId(application.getAssignedOfficerId())
                .branchId(application.getBranchId())
                .rejectionReason(application.getRejectionReason())
                .submittedAt(application.getSubmittedAt())
                .expiresAt(application.getExpiresAt())
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
                .currencyCode(contract.getCurrencyCode())
                .ijarahType(contract.getIjarahType())
                .assetDescription(contract.getAssetDescription())
                .assetCategory(contract.getAssetCategory())
                .assetLocation(contract.getAssetLocation())
                .assetAcquisitionCost(contract.getAssetAcquisitionCost())
                .assetResidualValue(contract.getAssetResidualValue())
                .leaseStartDate(contract.getLeaseStartDate())
                .leaseEndDate(contract.getLeaseEndDate())
                .tenorMonths(contract.getTenorMonths())
                .totalLeasePeriods(contract.getTotalLeasePeriods())
                .baseRentalAmount(contract.getBaseRentalAmount())
                .rentalFrequency(contract.getRentalFrequency())
                .rentalType(contract.getRentalType())
                .rentalReviewFrequency(contract.getRentalReviewFrequency() == null ? null : contract.getRentalReviewFrequency().name())
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
                .latePenaltyToCharity(contract.getLatePenaltyToCharity())
                .ijarahAssetId(contract.getIjarahAssetId())
                .imbTransferMechanismId(contract.getImbTransferMechanismId())
                .imbTransferType(contract.getImbTransferType())
                .imbTransferScheduled(contract.getImbTransferScheduled())
                .imbTransferCompleted(contract.getImbTransferCompleted())
                .imbTransferDate(contract.getImbTransferDate())
                .status(contract.getStatus())
                .executedAt(contract.getExecutedAt())
                .executedBy(contract.getExecutedBy())
                .investmentPoolId(contract.getInvestmentPoolId())
                .poolAssetAssignmentId(contract.getPoolAssetAssignmentId())
                .lastScreeningRef(contract.getLastScreeningRef())
                .terminatedAt(contract.getTerminatedAt())
                .terminationReason(contract.getTerminationReason())
                .variableRentalBenchmark(contract.getVariableRentalBenchmark())
                .variableRentalMargin(contract.getVariableRentalMargin())
                .rentalEscalationRate(contract.getRentalEscalationRate())
                .bankReturnOnAsset(contract.getBankReturnOnAsset())
                .assetSerialNumber(contract.getAssetSerialNumber())
                .assetFairValueAtInception(contract.getAssetFairValueAtInception())
                .insuranceProvider(contract.getInsuranceProvider())
                .insuranceCoverageAmount(contract.getInsuranceCoverageAmount())
                .insuranceResponsibility(contract.getInsuranceResponsibility())
                .majorMaintenanceResponsibility(contract.getMajorMaintenanceResponsibility())
                .minorMaintenanceResponsibility(contract.getMinorMaintenanceResponsibility())
                .gracePeriodDays(contract.getGracePeriodDays())
                .latePenaltyApplicable(contract.getLatePenaltyApplicable())
                .totalLatePenalties(contract.getTotalLatePenalties())
                .totalCharityFromLatePenalties(contract.getTotalCharityFromLatePenalties())
                .islamicProductTemplateId(contract.getIslamicProductTemplateId())
                .lastMajorMaintenanceDate(contract.getLastMajorMaintenanceDate())
                .nextMajorMaintenanceDueDate(contract.getNextMajorMaintenanceDueDate())
                .build();
    }

    static IjarahResponses.IjarahTransferResponse toTransferResponse(IjarahTransferMechanism transfer) {
        return IjarahResponses.IjarahTransferResponse.builder()
                .id(transfer.getId())
                .transferRef(transfer.getTransferRef())
                .ijarahContractId(transfer.getIjarahContractId())
                .transferType(transfer.getTransferType())
                .isSeparateDocument(transfer.getIsSeparateDocument())
                .documentReference(transfer.getDocumentReference())
                .documentDate(transfer.getDocumentDate())
                .documentType(transfer.getDocumentType())
                .signedByBank(transfer.getSignedByBank())
                .signedByCustomer(transfer.getSignedByCustomer())
                .nominalSalePrice(transfer.getNominalSalePrice())
                .actualFairValue(transfer.getActualFairValue())
                .totalTransferUnits(transfer.getTotalTransferUnits())
                .unitsTransferredToDate(transfer.getUnitsTransferredToDate())
                .nextUnitTransferDate(transfer.getNextUnitTransferDate())
                .status(transfer.getStatus())
                .transferJournalRef(transfer.getTransferJournalRef())
                .assetNetBookValueAtTransfer(transfer.getAssetNetBookValueAtTransfer())
                .gainLossOnTransfer(transfer.getGainLossOnTransfer())
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
}
