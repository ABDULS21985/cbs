package com.cbs.deposit.dto;

import com.cbs.deposit.entity.FixedDepositStatus;
import com.cbs.deposit.entity.MaturityAction;
import com.cbs.deposit.entity.PenaltyType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FixedDepositResponse {

    private Long id;
    private String depositNumber;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerDisplayName;
    private String productCode;
    private String productName;
    private String currencyCode;
    private BigDecimal principalAmount;
    private BigDecimal currentValue;
    private BigDecimal accruedInterest;
    private BigDecimal totalInterestEarned;
    private BigDecimal interestRate;
    private BigDecimal effectiveRate;
    private String dayCountConvention;
    private String compoundingFrequency;
    private Integer tenureDays;
    private Integer tenureMonths;
    private LocalDate startDate;
    private LocalDate maturityDate;
    private long daysElapsed;
    private long daysRemaining;
    private MaturityAction maturityAction;
    private Integer rolloverCount;
    private Integer maxRollovers;
    private Boolean allowsEarlyTermination;
    private PenaltyType earlyTerminationPenaltyType;
    private BigDecimal earlyTerminationPenaltyValue;
    private Boolean allowsPartialLiquidation;
    private FixedDepositStatus status;
    private LocalDate brokenDate;
    private LocalDate closedDate;
    private Instant createdAt;
}
