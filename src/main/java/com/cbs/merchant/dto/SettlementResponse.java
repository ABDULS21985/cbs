package com.cbs.merchant.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementResponse {

    private Long id;
    private Long merchantId;
    private Long facilityId;
    private LocalDate settlementDate;
    private BigDecimal grossTransactionAmount;
    private Integer transactionCount;
    private BigDecimal mdrDeducted;
    private BigDecimal otherFeesDeducted;
    private BigDecimal chargebackDeductions;
    private BigDecimal refundDeductions;
    private BigDecimal reserveHeld;
    private BigDecimal netSettlementAmount;
    private Long settlementAccountId;
    private String settlementReference;
    private Instant settledAt;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
