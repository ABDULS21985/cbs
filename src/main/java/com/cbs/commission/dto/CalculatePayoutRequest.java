package com.cbs.commission.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CalculatePayoutRequest {
    @NotNull(message = "grossSales is required")
    @DecimalMin(value = "0", message = "grossSales must be non-negative")
    private BigDecimal grossSales;

    @NotNull(message = "qualifyingSales is required")
    @DecimalMin(value = "0", message = "qualifyingSales must be non-negative")
    private BigDecimal qualifyingSales;

    @NotBlank(message = "period is required")
    private String period;
}
