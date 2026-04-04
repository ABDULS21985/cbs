package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AllocateProfitRequest {

    @NotNull(message = "Gross profit is required")
    @DecimalMin(value = "0.01", message = "Gross profit must be greater than zero")
    private BigDecimal grossProfit;

    @NotNull(message = "Period from date is required")
    private LocalDate periodFrom;

    @NotNull(message = "Period to date is required")
    private LocalDate periodTo;
}
