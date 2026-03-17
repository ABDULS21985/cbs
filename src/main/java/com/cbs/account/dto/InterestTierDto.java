package com.cbs.account.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterestTierDto {

    private Long id;

    @NotBlank(message = "Tier name is required")
    private String tierName;

    @NotNull(message = "Min balance is required")
    @DecimalMin("0.00")
    private BigDecimal minBalance;

    private BigDecimal maxBalance;

    @NotNull(message = "Interest rate is required")
    @DecimalMin("0.00")
    private BigDecimal interestRate;

    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean isActive;
}
