package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecordPoolIncomeRequest {

    @NotNull(message = "Pool ID is required")
    private Long poolId;

    private Long assetAssignmentId;

    @NotBlank(message = "Income type is required")
    private String incomeType;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotBlank(message = "Currency code is required")
    private String currencyCode;

    @NotNull(message = "Income date is required")
    private LocalDate incomeDate;

    @NotNull(message = "Period from is required")
    private LocalDate periodFrom;

    @NotNull(message = "Period to is required")
    private LocalDate periodTo;

    private String journalRef;

    private String assetReferenceCode;

    private String contractTypeCode;

    private String notes;
}
