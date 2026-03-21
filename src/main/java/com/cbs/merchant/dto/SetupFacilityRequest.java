package com.cbs.merchant.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SetupFacilityRequest {

    @NotNull(message = "Merchant ID is required")
    private Long merchantId;

    @Size(max = 20, message = "Facility type must not exceed 20 characters")
    private String facilityType;

    @Size(max = 15, message = "Processor connection must not exceed 15 characters")
    private String processorConnection;

    @Size(max = 20, message = "Terminal ID prefix must not exceed 20 characters")
    private String terminalIdPrefix;

    @Size(min = 3, max = 3, message = "Settlement currency must be a 3-letter ISO code")
    private String settlementCurrency;

    @Size(max = 3, message = "Settlement cycle must not exceed 3 characters")
    private String settlementCycle;

    @DecimalMin(value = "0.00", message = "MDR rate must be >= 0")
    @DecimalMax(value = "100.00", message = "MDR rate must be <= 100")
    private BigDecimal mdrRatePct;

    @DecimalMin(value = "0.00", message = "Daily transaction limit must be >= 0")
    private BigDecimal dailyTransactionLimit;

    @DecimalMin(value = "0.00", message = "Monthly volume limit must be >= 0")
    private BigDecimal monthlyVolumeLimit;

    @DecimalMin(value = "0.00", message = "Chargeback limit must be >= 0")
    @DecimalMax(value = "100.00", message = "Chargeback limit must be <= 100")
    private BigDecimal chargebackLimitPct;

    @DecimalMin(value = "0.00", message = "Reserve hold pct must be >= 0")
    @DecimalMax(value = "100.00", message = "Reserve hold pct must be <= 100")
    private BigDecimal reserveHoldPct;
}
