package com.cbs.merchant.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MerchantResponse {

    private Long id;
    private String merchantId;
    private String merchantName;
    private String tradingName;
    private String merchantCategoryCode;
    private String businessType;
    private String registrationNumber;
    private String taxId;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private Long settlementAccountId;
    private String settlementFrequency;
    private BigDecimal mdrRate;
    private Integer terminalCount;
    private BigDecimal monthlyVolumeLimit;
    private String riskCategory;
    private BigDecimal chargebackRate;
    private String monitoringLevel;
    private String status;
    private Instant onboardedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
