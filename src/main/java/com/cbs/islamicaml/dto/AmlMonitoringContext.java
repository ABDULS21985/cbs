package com.cbs.islamicaml.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AmlMonitoringContext {
    private String transactionRef;
    private String transactionType;
    private BigDecimal amount;
    private String currencyCode;
    private Long customerId;
    private String customerName;
    private String contractRef;
    private String contractType;
    private Long accountId;
    private String productCode;
    private Map<String, Object> additionalData;
}
