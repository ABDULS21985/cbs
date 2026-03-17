package com.cbs.intelligence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity @Table(name = "cashflow_forecast")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashflowForecast {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String forecastId;
    @Column(nullable = false, length = 20) private String entityType;
    @Column(nullable = false, length = 80) private String entityId;
    @Column(nullable = false) private LocalDate forecastDate;
    @Builder.Default private Integer horizonDays = 30;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) @Builder.Default private BigDecimal projectedInflows = BigDecimal.ZERO;
    @Column(nullable = false) @Builder.Default private BigDecimal projectedOutflows = BigDecimal.ZERO;
    @Column(nullable = false) @Builder.Default private BigDecimal netPosition = BigDecimal.ZERO;
    @Builder.Default private BigDecimal confidenceLevel = new BigDecimal("80.00");
    private BigDecimal lowerBound;
    private BigDecimal upperBound;
    @Column(nullable = false, length = 30) @Builder.Default private String modelType = "ARIMA";
    private String modelVersion;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> featureImportance;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> inflowBreakdown;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> outflowBreakdown;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "GENERATED";
    @Builder.Default private Instant createdAt = Instant.now();
}
