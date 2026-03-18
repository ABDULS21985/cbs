package com.cbs.marketdata.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "feed_quality_metric", uniqueConstraints = @UniqueConstraint(columnNames = {"feed_id", "metric_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeedQualityMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long feedId;

    @Column(nullable = false)
    private LocalDate metricDate;

    private Integer totalRecordsReceived;
    private Integer totalRecordsProcessed;
    private Integer totalRecordsRejected;
    private BigDecimal uptimePct;
    private Integer avgLatencyMs;
    private Integer maxLatencyMs;

    @Column(name = "p99_latency_ms")
    private Integer p99LatencyMs;

    @Builder.Default
    private Integer gapCount = 0;

    @Builder.Default
    private Integer staleDataCount = 0;

    @Builder.Default
    private Integer duplicateCount = 0;

    @Builder.Default
    private Integer outOfRangeCount = 0;

    private BigDecimal qualityScore;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
