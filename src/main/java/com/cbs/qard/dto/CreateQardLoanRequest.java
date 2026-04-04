package com.cbs.qard.dto;

import com.cbs.qard.entity.QardDomainEnums;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateQardLoanRequest {

    @NotNull
    private Long customerId;

    @NotBlank
    private String productCode;

    @Builder.Default
    private String currencyCode = "SAR";

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal principalAmount;

    @NotNull
    private Long settlementAccountId;

    private String branchCode;
    private LocalDate maturityDate;
    private QardDomainEnums.RepaymentFrequency repaymentFrequency;
    private BigDecimal installmentAmount;
    private Integer totalInstallments;
    private BigDecimal adminFeeAmount;
    private String adminFeeJustification;
    private QardDomainEnums.Purpose purpose;
    private String purposeDescription;
}
