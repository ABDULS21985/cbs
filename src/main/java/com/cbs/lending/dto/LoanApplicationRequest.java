package com.cbs.lending.dto;

import com.cbs.lending.entity.RepaymentScheduleType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanApplicationRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Loan product code is required")
    private String loanProductCode;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.01")
    private BigDecimal requestedAmount;

    @NotNull(message = "Requested tenure is required")
    @Min(1)
    private Integer requestedTenureMonths;

    private String purpose;
    private BigDecimal proposedRate;
    private String rateType;
    private RepaymentScheduleType repaymentScheduleType;
    private String repaymentFrequency;

    // Islamic finance fields
    private Boolean isIslamic;
    private String islamicStructure;
    private String assetDescription;
    private BigDecimal assetCost;
    private BigDecimal profitRate;

    // Disbursement
    private Long disbursementAccountId;
    private Long repaymentAccountId;

    // Auto-run credit check
    private Boolean runCreditCheck;
}
