package com.cbs.channelactivity.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivitySummaryResponse {
    private Long id;
    private Long customerId;
    private String channel;
    private String periodType;
    private LocalDate periodDate;
    private Integer totalSessions;
    private Integer totalTransactions;
    private BigDecimal totalAmount;
    private Integer avgResponseTimeMs;
    private Integer failureCount;
    private Integer uniqueActivities;
    private String mostUsedActivity;
    private Instant createdAt;
    private Instant updatedAt;
}
