package com.cbs.deposit.dto;

import com.cbs.deposit.entity.DepositFrequency;
import com.cbs.deposit.entity.MaturityAction;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateRecurringDepositRequest {

    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotBlank(message = "Product code is required")
    private String productCode;

    @NotNull(message = "Installment amount is required")
    @DecimalMin(value = "0.01")
    private BigDecimal installmentAmount;

    @NotNull(message = "Frequency is required")
    private DepositFrequency frequency;

    @NotNull(message = "Total installments is required")
    @Min(value = 1)
    private Integer totalInstallments;

    @NotNull(message = "Interest rate is required")
    @DecimalMin("0.00")
    private BigDecimal interestRate;

    private String dayCountConvention;
    private MaturityAction maturityAction;
    private Long payoutAccountId;
    private Long debitAccountId;
    private Boolean autoDebit;
    private BigDecimal missedPenaltyRate;
}
