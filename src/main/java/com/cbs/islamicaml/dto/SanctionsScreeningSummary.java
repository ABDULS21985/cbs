package com.cbs.islamicaml.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SanctionsScreeningSummary {
    private long totalScreenings;
    private long clearCount;
    private long potentialMatches;
    private long confirmedMatches;
    private long pendingReview;
    private BigDecimal clearRate;
    private Map<String, Long> matchesByList;
}
