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
public class SnciSummary {
    private BigDecimal totalAmount;
    private long detectedCount;
    private long quarantinedCount;
    private long pendingPurificationCount;
    private long purifiedCount;
    private long disputedCount;
    private Map<String, BigDecimal> byType;
    private Map<String, BigDecimal> byStatus;
}
