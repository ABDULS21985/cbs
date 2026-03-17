package com.cbs.deposit.dto;

import com.cbs.deposit.entity.DepositFrequency;
import com.cbs.deposit.entity.MaturityAction;
import com.cbs.deposit.entity.RecurringDepositStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecurringDepositResponse {

    private Long id;
    private String depositNumber;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerDisplayName;
    private String productCode;
    private String currencyCode;
    private BigDecimal installmentAmount;
    private DepositFrequency frequency;
    private Integer totalInstallments;
    private Integer completedInstallments;
    private Integer missedInstallments;
    private LocalDate nextDueDate;
    private BigDecimal totalDeposited;
    private BigDecimal accruedInterest;
    private BigDecimal totalInterestEarned;
    private BigDecimal currentValue;
    private BigDecimal interestRate;
    private LocalDate startDate;
    private LocalDate maturityDate;
    private BigDecimal totalPenalties;
    private MaturityAction maturityAction;
    private Boolean autoDebit;
    private RecurringDepositStatus status;
    private List<InstallmentDto> installments;
    private Instant createdAt;
}
