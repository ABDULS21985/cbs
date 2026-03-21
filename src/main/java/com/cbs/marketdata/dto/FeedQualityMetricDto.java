package com.cbs.marketdata.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeedQualityMetricDto {
    private Long id;
    private Long feedId;
    private LocalDate metricDate;
    private Integer totalRecordsReceived;
    private Integer totalRecordsProcessed;
    private Integer totalRecordsRejected;
    private BigDecimal uptimePct;
    private Integer avgLatencyMs;
    private Integer maxLatencyMs;
    private Integer p99LatencyMs;
    private Integer gapCount;
    private Integer staleDataCount;
    private Integer duplicateCount;
    private Integer outOfRangeCount;
    private BigDecimal qualityScore;
    private Instant createdAt;

    public static FeedQualityMetricDto from(com.cbs.marketdata.entity.FeedQualityMetric entity) {
        if (entity == null) return null;
        return FeedQualityMetricDto.builder()
                .id(entity.getId())
                .feedId(entity.getFeedId())
                .metricDate(entity.getMetricDate())
                .totalRecordsReceived(entity.getTotalRecordsReceived())
                .totalRecordsProcessed(entity.getTotalRecordsProcessed())
                .totalRecordsRejected(entity.getTotalRecordsRejected())
                .uptimePct(entity.getUptimePct())
                .avgLatencyMs(entity.getAvgLatencyMs())
                .maxLatencyMs(entity.getMaxLatencyMs())
                .p99LatencyMs(entity.getP99LatencyMs())
                .gapCount(entity.getGapCount())
                .staleDataCount(entity.getStaleDataCount())
                .duplicateCount(entity.getDuplicateCount())
                .outOfRangeCount(entity.getOutOfRangeCount())
                .qualityScore(entity.getQualityScore())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
