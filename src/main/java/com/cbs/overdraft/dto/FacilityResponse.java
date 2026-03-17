package com.cbs.overdraft.dto;

import com.cbs.overdraft.entity.FacilityStatus;
import com.cbs.overdraft.entity.FacilityType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FacilityResponse {
    private Long id;
    private String facilityNumber;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerDisplayName;
    private FacilityType facilityType;
    private BigDecimal sanctionedLimit;
    private BigDecimal availableLimit;
    private BigDecimal utilizedAmount;
    private String currencyCode;
    private BigDecimal interestRate;
    private BigDecimal penaltyRate;
    private BigDecimal accruedInterest;
    private BigDecimal totalInterestCharged;
    private BigDecimal totalInterestPaid;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private LocalDate lastReviewDate;
    private LocalDate nextReviewDate;
    private Boolean autoRenewal;
    private Integer renewalCount;
    private Integer maxRenewals;
    private FacilityStatus status;
    private Instant createdAt;
}
