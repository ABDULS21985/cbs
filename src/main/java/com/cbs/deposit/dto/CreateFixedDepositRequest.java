package com.cbs.deposit.dto;

import com.cbs.deposit.entity.MaturityAction;
import com.cbs.deposit.entity.PenaltyType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateFixedDepositRequest {

    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotBlank(message = "Product code is required")
    private String productCode;

    @NotNull(message = "Principal amount is required")
    @DecimalMin(value = "0.01", message = "Principal must be greater than zero")
    private BigDecimal principalAmount;

    @NotNull(message = "Tenure in days is required")
    @Min(value = 1, message = "Tenure must be at least 1 day")
    private Integer tenureDays;

    private Integer tenureMonths;

    @NotNull(message = "Interest rate is required")
    @DecimalMin("0.0001")
    private BigDecimal interestRate;

    private String dayCountConvention;
    private String compoundingFrequency;
    private MaturityAction maturityAction;
    private Integer maxRollovers;
    private Long payoutAccountId;
    private Long fundingAccountId;
    private Boolean allowsEarlyTermination;
    private PenaltyType earlyTerminationPenaltyType;
    private BigDecimal earlyTerminationPenaltyValue;
    private Boolean allowsPartialLiquidation;
    private BigDecimal minPartialAmount;
    private BigDecimal minRemainingBalance;
}
