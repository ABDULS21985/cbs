package com.cbs.murabaha.service;

import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.murabaha.dto.MurabahaApplicationResponse;
import com.cbs.murabaha.dto.MurabahaContractResponse;
import com.cbs.murabaha.entity.MurabahaApplication;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

final class MurabahaSupport {

    static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    static final BigDecimal HUNDRED = new BigDecimal("100");

    private MurabahaSupport() {
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

    static BigDecimal calculateMarkupAmount(BigDecimal costPrice, BigDecimal markupRate) {
        return money(nvl(costPrice)
                .multiply(rate(markupRate))
                .divide(HUNDRED, 8, RoundingMode.HALF_UP));
    }

    static BigDecimal calculateSellingPrice(BigDecimal costPrice, BigDecimal markupRate) {
        return money(nvl(costPrice).add(calculateMarkupAmount(costPrice, markupRate)));
    }

    static BigDecimal calculateInstallmentAmount(BigDecimal financedAmount, int totalInstallments) {
        if (totalInstallments <= 0) {
            return ZERO;
        }
        return money(nvl(financedAmount).divide(BigDecimal.valueOf(totalInstallments), 8, RoundingMode.HALF_UP));
    }

    static int installmentCount(Integer tenorMonths, MurabahaDomainEnums.RepaymentFrequency frequency) {
        int tenor = tenorMonths == null ? 0 : tenorMonths;
        int divisor = switch (frequency == null ? MurabahaDomainEnums.RepaymentFrequency.MONTHLY : frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMI_ANNUALLY -> 6;
            case ANNUALLY -> 12;
        };
        return Math.max(1, (int) Math.ceil((double) tenor / divisor));
    }

    static LocalDate addFrequency(LocalDate date, MurabahaDomainEnums.RepaymentFrequency frequency, int steps) {
        MurabahaDomainEnums.RepaymentFrequency effectiveFrequency = frequency == null
                ? MurabahaDomainEnums.RepaymentFrequency.MONTHLY
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
        if (hijriCalendarService.isIslamicBusinessDay(date)) {
            return date;
        }
        return hijriCalendarService.getNextIslamicBusinessDay(date);
    }

    static String toHijriString(HijriCalendarService hijriCalendarService, LocalDate date) {
        HijriDateResponse hijri = hijriCalendarService.toHijri(date);
        return "%04d-%02d-%02d".formatted(hijri.getHijriYear(), hijri.getHijriMonth(), hijri.getHijriDay());
    }

    static long elapsedDays(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return 0;
        }
        return ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }

    static String nextReference(String prefix, AtomicLong sequence) {
        long next = Math.floorMod(sequence.incrementAndGet(), 1_000_000L);
        return "%s-%d-%06d".formatted(prefix, LocalDate.now().getYear(), next);
    }

    static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    static String outputAsString(Map<String, Object> outputs, String... keys) {
        for (String key : keys) {
            Object value = outputs.get(key);
            if (value != null) {
                return value.toString();
            }
        }
        return null;
    }

    static MurabahaApplicationResponse toApplicationResponse(MurabahaApplication application, List<String> warnings) {
        return MurabahaApplicationResponse.builder()
                .id(application.getId())
                .applicationRef(application.getApplicationRef())
                .customerId(application.getCustomerId())
                .productCode(application.getProductCode())
                .murabahahType(application.getMurabahahType())
                .requestedAmount(application.getRequestedAmount())
                .currencyCode(application.getCurrencyCode())
                .requestedTenorMonths(application.getRequestedTenorMonths())
                .purpose(application.getPurpose())
                .purposeDescription(application.getPurposeDescription())
                .dsr(application.getDsr())
                .dsrLimit(application.getDsrLimit())
                .creditScore(application.getCreditScore())
                .proposedCostPrice(application.getProposedCostPrice())
                .proposedMarkupRate(application.getProposedMarkupRate())
                .proposedSellingPrice(application.getProposedSellingPrice())
                .proposedDownPayment(application.getProposedDownPayment())
                .proposedTenorMonths(application.getProposedTenorMonths())
                .proposedInstallmentAmount(application.getProposedInstallmentAmount())
                .status(application.getStatus())
                .currentStep(application.getCurrentStep())
                .approvedBy(application.getApprovedBy())
                .approvedAt(application.getApprovedAt())
                .approvedAmount(application.getApprovedAmount())
                .approvedTenorMonths(application.getApprovedTenorMonths())
                .approvedMarkupRate(application.getApprovedMarkupRate())
                .contractId(application.getContractId())
                .contractRef(application.getContractRef())
                .submittedAt(application.getSubmittedAt())
                .expiresAt(application.getExpiresAt())
                .warnings(warnings == null ? new ArrayList<>() : new ArrayList<>(warnings))
                .build();
    }

    static MurabahaContractResponse toContractResponse(MurabahaContract contract) {
        return MurabahaContractResponse.builder()
                .id(contract.getId())
                .contractRef(contract.getContractRef())
                .applicationId(contract.getApplicationId())
                .customerId(contract.getCustomerId())
                .accountId(contract.getAccountId())
                .productCode(contract.getProductCode())
                .contractTypeCode(contract.getContractTypeCode())
                .murabahahType(contract.getMurabahahType())
                .assetDescription(contract.getAssetDescription())
                .assetCategory(contract.getAssetCategory())
                .costPrice(contract.getCostPrice())
                .markupRate(contract.getMarkupRate())
                .markupAmount(contract.getMarkupAmount())
                .sellingPrice(contract.getSellingPrice())
                .sellingPriceLocked(contract.getSellingPriceLocked())
                .sellingPriceLockedAt(contract.getSellingPriceLockedAt())
                .downPayment(contract.getDownPayment())
                .financedAmount(contract.getFinancedAmount())
                .tenorMonths(contract.getTenorMonths())
                .startDate(contract.getStartDate())
                .firstInstallmentDate(contract.getFirstInstallmentDate())
                .maturityDate(contract.getMaturityDate())
                .repaymentFrequency(contract.getRepaymentFrequency())
                .totalDeferredProfit(contract.getTotalDeferredProfit())
                .recognisedProfit(contract.getRecognisedProfit())
                .unrecognisedProfit(contract.getUnrecognisedProfit())
                .profitRecognitionMethod(contract.getProfitRecognitionMethod())
                .ownershipVerified(contract.getOwnershipVerified())
                .ownershipVerifiedBy(contract.getOwnershipVerifiedBy())
                .ownershipVerifiedAt(contract.getOwnershipVerifiedAt())
                .latePenaltiesToCharity(contract.getLatePenaltiesToCharity())
                .totalLatePenaltiesCharged(contract.getTotalLatePenaltiesCharged())
                .totalCharityDonations(contract.getTotalCharityDonations())
                .earlySettlementRebateMethod(contract.getEarlySettlementRebateMethod())
                .earlySettledAt(contract.getEarlySettledAt())
                .earlySettlementAmount(contract.getEarlySettlementAmount())
                .ibraAmount(contract.getIbraAmount())
                .status(contract.getStatus())
                .executedAt(contract.getExecutedAt())
                .executedBy(contract.getExecutedBy())
                .investmentPoolId(contract.getInvestmentPoolId())
                .poolAssetAssignmentId(contract.getPoolAssetAssignmentId())
                .settlementAccountId(contract.getSettlementAccountId())
                .build();
    }

    static String normalizeRuleCode(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }
}
