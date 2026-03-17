package com.cbs.lending.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanApprovalRequest {

    @NotNull @DecimalMin("0.01")
    private BigDecimal approvedAmount;

    @NotNull @Min(1)
    private Integer approvedTenureMonths;

    @NotNull @DecimalMin("0.0001")
    private BigDecimal approvedRate;

    private List<String> conditions;
}
