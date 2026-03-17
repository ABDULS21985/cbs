package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "alm_gap_report", schema = "cbs", uniqueConstraints = @UniqueConstraint(columnNames = {"report_date","currency_code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmGapReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "report_date", nullable = false) private LocalDate reportDate;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "buckets", nullable = false, columnDefinition = "jsonb")
    @Builder.Default private List<Map<String, Object>> buckets = new ArrayList<>();

    @Column(name = "total_rsa", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal totalRsa = BigDecimal.ZERO;
    @Column(name = "total_rsl", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal totalRsl = BigDecimal.ZERO;
    @Column(name = "cumulative_gap", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal cumulativeGap = BigDecimal.ZERO;
    @Column(name = "gap_ratio", precision = 8, scale = 4) private BigDecimal gapRatio;
    @Column(name = "nii_base", precision = 18, scale = 2) private BigDecimal niiBase;
    @Column(name = "nii_up_100bp", precision = 18, scale = 2) private BigDecimal niiUp100bp;
    @Column(name = "nii_down_100bp", precision = 18, scale = 2) private BigDecimal niiDown100bp;
    @Column(name = "nii_sensitivity", precision = 18, scale = 2) private BigDecimal niiSensitivity;
    @Column(name = "eve_base", precision = 18, scale = 2) private BigDecimal eveBase;
    @Column(name = "eve_up_200bp", precision = 18, scale = 2) private BigDecimal eveUp200bp;
    @Column(name = "eve_down_200bp", precision = 18, scale = 2) private BigDecimal eveDown200bp;
    @Column(name = "eve_sensitivity", precision = 18, scale = 2) private BigDecimal eveSensitivity;
    @Column(name = "weighted_avg_duration_assets", precision = 8, scale = 4) private BigDecimal weightedAvgDurationAssets;
    @Column(name = "weighted_avg_duration_liabs", precision = 8, scale = 4) private BigDecimal weightedAvgDurationLiabs;
    @Column(name = "duration_gap", precision = 8, scale = 4) private BigDecimal durationGap;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    @Column(name = "generated_by", length = 100) private String generatedBy;
    @Column(name = "approved_by", length = 100) private String approvedBy;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
