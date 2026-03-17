package com.cbs.lending.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanProductDto {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String loanType;
    private String targetSegment;
    private String currencyCode;
    private BigDecimal minInterestRate;
    private BigDecimal maxInterestRate;
    private BigDecimal defaultInterestRate;
    private String rateType;
    private BigDecimal minLoanAmount;
    private BigDecimal maxLoanAmount;
    private Integer minTenureMonths;
    private Integer maxTenureMonths;
    private Boolean requiresCollateral;
    private Boolean isIslamic;
    private String profitSharingRatio;
    private Boolean isActive;
}
