package com.cbs.murabaha.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaApprovalDetails {

    @DecimalMin("0.01")
    private BigDecimal approvedAmount;

    @Positive
    private Integer approvedTenorMonths;

    @DecimalMin("0.00")
    private BigDecimal approvedMarkupRate;

    private String approvalNotes;
}
