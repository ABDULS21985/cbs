package com.cbs.profitdistribution.dto;

import com.cbs.profitdistribution.entity.IncomeType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolIncomeRecordResponse {

    private Long id;
    private Long poolId;
    private Long assetAssignmentId;
    private IncomeType incomeType;
    private BigDecimal amount;
    private String currencyCode;
    private LocalDate incomeDate;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String journalRef;
    private String assetReferenceCode;
    private String contractTypeCode;
    private boolean isCharityIncome;
    private String notes;
    private Long tenantId;
    private Instant createdAt;
    private String createdBy;
}
