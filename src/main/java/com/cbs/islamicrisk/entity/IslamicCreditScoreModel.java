package com.cbs.islamicrisk.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_credit_score_models", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicCreditScoreModel extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long versionLock;

    @Column(name = "model_code", nullable = false, unique = true, length = 40)
    private String modelCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Column(name = "product_category", length = 80)
    private String productCategory;

    @Column(name = "model_version", nullable = false)
    private Integer modelVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_components", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> scoreComponents = new ArrayList<>();

    @Column(name = "maximum_score", nullable = false)
    private Integer maximumScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_bands", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> scoreBands = new ArrayList<>();

    @Column(name = "last_calibration_date")
    private LocalDate lastCalibrationDate;

    @Column(name = "next_calibration_date")
    private LocalDate nextCalibrationDate;

    @Column(name = "calibration_data_period", length = 120)
    private String calibrationDataPeriod;

    @Column(name = "backtesting_accuracy", precision = 10, scale = 4)
    private BigDecimal backtestingAccuracy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IslamicRiskDomainEnums.ModelStatus status;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
