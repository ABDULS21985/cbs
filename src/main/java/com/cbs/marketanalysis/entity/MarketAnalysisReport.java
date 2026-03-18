package com.cbs.marketanalysis.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "market_analysis_report")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketAnalysisReport extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String reportCode;

    @Column(nullable = false, length = 300)
    private String reportName;

    @Column(nullable = false, length = 25)
    private String analysisType;

    @Column(nullable = false, length = 40)
    @Builder.Default
    private String region = "NIGERIA";

    @Column(nullable = false)
    private LocalDate analysisDate;

    @Column(length = 200)
    private String analyst;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String executiveSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> keyFindings;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> dataPoints;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> forecasts;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> riskFactors;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> recommendations;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> dataSources;

    @Column(length = 10)
    private String confidenceLevel;

    @Column(length = 15)
    private String timeHorizon;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";

    private Instant publishedAt;
}
