package com.cbs.qard.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QardHasanAccountResponse {

    private Long id;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerName;
    private String productCode;
    private String currencyCode;
    private String contractReference;
    private LocalDate contractSignedDate;
    private String qardType;
    private Boolean principalGuaranteed;
    private Boolean noReturnDisclosed;
    private BigDecimal principalAmount;
    private BigDecimal outstandingPrincipal;
    private LocalDate disbursementDate;
    private LocalDate maturityDate;
    private String repaymentFrequency;
    private BigDecimal installmentAmount;
    private Integer totalInstallments;
    private Integer completedInstallments;
    private Integer missedInstallments;
    private Boolean adminFeeCharged;
    private BigDecimal adminFeeAmount;
    private String adminFeeJustification;
    private String purpose;
    private String purposeDescription;
    private String qardStatus;
    private LocalDate lastRepaymentDate;
    private BigDecimal lastRepaymentAmount;
    private BigDecimal accountBalance;
}
