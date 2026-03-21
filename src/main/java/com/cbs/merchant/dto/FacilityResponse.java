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
public class FacilityResponse {

    private Long id;
    private Long merchantId;
    private String facilityType;
    private String processorConnection;
    private String terminalIdPrefix;
    private String settlementCurrency;
    private String settlementCycle;
    private BigDecimal mdrRatePct;
    private BigDecimal dailyTransactionLimit;
    private BigDecimal monthlyVolumeLimit;
    private BigDecimal chargebackLimitPct;
    private BigDecimal reserveHoldPct;
    private BigDecimal reserveBalance;
    private String pciComplianceStatus;
    private LocalDate pciComplianceDate;
    private Boolean fraudScreeningEnabled;
    private Boolean threeDSecureEnabled;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
