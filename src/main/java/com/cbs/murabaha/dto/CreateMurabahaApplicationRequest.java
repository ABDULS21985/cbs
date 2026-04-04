package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMurabahaApplicationRequest {

    @NotNull
    private Long customerId;

    @NotBlank
    private String productCode;

    @NotNull
    private MurabahaDomainEnums.MurabahahType murabahahType;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal requestedAmount;

    @NotBlank
    private String currencyCode;

    @NotNull
    @Positive
    private Integer requestedTenorMonths;

    @NotNull
    private MurabahaDomainEnums.Purpose purpose;

    private String purposeDescription;
    private String assetDescription;
    private MurabahaDomainEnums.AssetCategory assetCategory;
    private String supplierName;
    private BigDecimal supplierQuoteAmount;
    private String supplierQuoteRef;
    private LocalDate supplierQuoteExpiry;

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal monthlyIncome;

    @Builder.Default
    @DecimalMin("0.00")
    private BigDecimal existingFinancingObligations = BigDecimal.ZERO;

    private BigDecimal proposedCostPrice;
    private BigDecimal proposedMarkupRate;
    private BigDecimal proposedDownPayment;
    private Integer proposedTenorMonths;
    private Long settlementAccountId;
    private Long branchId;

    @NotNull
    private MurabahaDomainEnums.ApplicationChannel channel;
}
