package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecordPoolExpenseRequest {

    @NotNull(message = "Pool ID is required")
    private Long poolId;

    @NotBlank(message = "Expense type is required")
    private String expenseType;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotBlank(message = "Currency code is required")
    private String currencyCode;

    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    @NotNull(message = "Period from is required")
    private LocalDate periodFrom;

    @NotNull(message = "Period to is required")
    private LocalDate periodTo;

    private String journalRef;

    private String description;

    private String allocationMethod;

    private String allocationBasis;
}
