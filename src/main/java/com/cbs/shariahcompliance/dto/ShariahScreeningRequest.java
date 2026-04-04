package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShariahScreeningRequest {
    private String transactionRef;
    private String transactionType;
    private BigDecimal amount;
    private String currencyCode;
    private String contractRef;
    private String contractTypeCode;
    private Long customerId;
    private String counterpartyName;
    private String counterpartyId;
    private String merchantCategoryCode;
    private String merchantName;
    private String purpose;
    private Long productId;
    private Map<String, Object> additionalContext;
}
