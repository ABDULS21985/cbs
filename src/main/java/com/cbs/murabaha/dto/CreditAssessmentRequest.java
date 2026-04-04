package com.cbs.murabaha.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class CreditAssessmentRequest {

    private Integer creditScore;
    private String assessmentNotes;
    private String assessedBy;

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal monthlyIncome;

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal existingFinancingObligations;

    private BigDecimal dsrLimit;
}
