package com.cbs.profitdistribution.dto;

import com.cbs.profitdistribution.entity.ExpenseAllocationMethod;
import com.cbs.profitdistribution.entity.ExpenseType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolExpenseRecordResponse {

    private Long id;
    private Long poolId;
    private ExpenseType expenseType;
    private BigDecimal amount;
    private String currencyCode;
    private LocalDate expenseDate;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String journalRef;
    private String description;
    private ExpenseAllocationMethod allocationMethod;
    private String allocationBasis;
    private String approvedBy;
    private Long tenantId;
    private Instant createdAt;
    private String createdBy;
}
