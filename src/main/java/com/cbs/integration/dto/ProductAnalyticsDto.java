package com.cbs.integration.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductAnalyticsDto {
    private Long productId;
    private String productName;
    private int activeSubscriptions;
    private long totalCallsThisMonth;
    private long avgResponseTimeMs;
    private long errorCount30d;
    private long totalCalls30d;
    private double errorRate;
}
