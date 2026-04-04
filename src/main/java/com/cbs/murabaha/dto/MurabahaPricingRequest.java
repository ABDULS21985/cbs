package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MurabahaPricingRequest {

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal costPrice;

    @DecimalMin("0.00")
    private BigDecimal markupRate;

    @DecimalMin("0.00")
    private BigDecimal downPayment;

    @NotNull
    @Positive
    private Integer tenorMonths;

    private LocalDate startDate;
    private LocalDate firstInstallmentDate;
    private MurabahaDomainEnums.RepaymentFrequency repaymentFrequency;
    private MurabahaDomainEnums.ProfitRecognitionMethod profitRecognitionMethod;
}
