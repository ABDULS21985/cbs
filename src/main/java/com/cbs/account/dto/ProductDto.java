package com.cbs.account.dto;

import com.cbs.account.entity.ProductCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDto {

    private Long id;

    @NotBlank @Size(max = 20)
    private String code;

    @NotBlank @Size(max = 100)
    private String name;

    private String description;

    @NotNull
    private ProductCategory productCategory;

    @NotBlank @Size(min = 3, max = 3)
    private String currencyCode;

    private BigDecimal minOpeningBalance;
    private BigDecimal minOperatingBalance;
    private BigDecimal maxBalance;
    private Boolean allowsOverdraft;
    private BigDecimal maxOverdraftLimit;
    private Boolean allowsChequeBook;
    private Boolean allowsDebitCard;
    private Boolean allowsMobile;
    private Boolean allowsInternet;
    private Boolean allowsSweep;
    private Integer dormancyDays;

    // Interest
    private Boolean interestBearing;
    private BigDecimal baseInterestRate;
    private String interestCalcMethod;
    private String interestPostingFrequency;
    private String interestAccrualMethod;

    // Fees
    private BigDecimal monthlyMaintenanceFee;
    private BigDecimal smsAlertFee;

    // GL
    private String glAccountCode;
    private String glInterestExpenseCode;
    private String glInterestPayableCode;
    private String glFeeIncomeCode;

    private Boolean isActive;
    private List<InterestTierDto> interestTiers;
    private Instant createdAt;
}
