package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolProfitAllocationResponse {

    private Long id;
    private Long poolId;
    private Long accountId;
    private String accountNumber;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private BigDecimal totalDailyProduct;
    private BigDecimal weightagePercentage;
    private BigDecimal poolGrossProfit;
    private BigDecimal grossShareBeforePer;
    private BigDecimal perAdjustment;
    private BigDecimal irrDeduction;
    private BigDecimal netShareAfterReserves;
    private BigDecimal customerPsr;
    private BigDecimal customerProfitShare;
    private BigDecimal bankProfitShare;
    private BigDecimal effectiveProfitRate;
    private String distributionStatus;
    private LocalDateTime distributedAt;
    private String journalRef;
    private String warningNotes;
}
