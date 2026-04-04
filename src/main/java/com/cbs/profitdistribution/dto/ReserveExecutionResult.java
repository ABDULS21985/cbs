package com.cbs.profitdistribution.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReserveExecutionResult {

    private String reserveType;
    private String transactionType;
    private BigDecimal adjustmentAmount;
    private BigDecimal amountBeforeReserve;
    private BigDecimal amountAfterReserve;
    private Long transactionId;
    private String journalRef;
    private BigDecimal reserveBalanceAfter;
}
