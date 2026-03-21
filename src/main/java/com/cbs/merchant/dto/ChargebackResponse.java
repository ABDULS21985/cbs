package com.cbs.merchant.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChargebackResponse {

    private Long id;
    private Long merchantId;
    private String originalTransactionRef;
    private LocalDate transactionDate;
    private BigDecimal transactionAmount;
    private String cardNetwork;
    private String reasonCode;
    private String reasonDescription;
    private BigDecimal chargebackAmount;
    private String currency;
    private LocalDate evidenceDeadline;
    private String merchantResponseRef;
    private Map<String, Object> merchantEvidence;
    private Boolean representmentSubmitted;
    private Boolean arbitrationRequired;
    private String outcome;
    private BigDecimal financialImpact;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
