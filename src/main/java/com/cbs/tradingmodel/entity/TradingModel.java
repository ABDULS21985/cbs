package com.cbs.tradingmodel.entity;

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
@Table(name = "trading_model", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TradingModel extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_code", nullable = false, unique = true, length = 30)
    private String modelCode;

    @Column(name = "model_name", nullable = false, length = 200)
    private String modelName;

    @Column(name = "model_purpose", nullable = false, length = 25)
    private String modelPurpose;

    @Column(name = "instrument_scope", nullable = false, length = 20)
    private String instrumentScope;

    @Column(name = "methodology", length = 30)
    private String methodology;

    @Column(name = "model_version", nullable = false, length = 20)
    private String modelVersion;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_parameters", columnDefinition = "jsonb")
    private Map<String, Object> inputParameters;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_metrics", columnDefinition = "jsonb")
    private Map<String, Object> outputMetrics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "assumptions", columnDefinition = "jsonb")
    private Map<String, Object> assumptions;

    @Column(name = "limitations", columnDefinition = "TEXT")
    private String limitations;

    @Column(name = "calibration_frequency", length = 15)
    private String calibrationFrequency;

    @Column(name = "last_calibrated_at")
    private Instant lastCalibratedAt;

    @Column(name = "calibration_quality", length = 10)
    private String calibrationQuality;

    @Column(name = "model_owner", length = 200)
    private String modelOwner;

    @Column(name = "developer", length = 200)
    private String developer;

    @Column(name = "last_validated_at")
    private Instant lastValidatedAt;

    @Column(name = "validation_result", length = 15)
    private String validationResult;

    @Column(name = "model_risk_tier", length = 10)
    private String modelRiskTier;

    @Column(name = "regulatory_use")
    private Boolean regulatoryUse;

    @Column(name = "production_deployed_at")
    private Instant productionDeployedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "performance_metrics", columnDefinition = "jsonb")
    private Map<String, Object> performanceMetrics;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "status", nullable = false, length = 15)
    private String status;
}
