package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PsrDistributionSummary {

    private long totalAccounts;
    private BigDecimal averageCustomerPsr;
    private BigDecimal minCustomerPsr;
    private BigDecimal maxCustomerPsr;
    private Map<String, Long> accountsByPsrBucket;
}
