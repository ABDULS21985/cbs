package com.cbs.custbehavior.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "customer_behavior_model")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CustomerBehaviorModel extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String modelCode;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 25)
    private String modelType;

    @Column(nullable = false, length = 20)
    private String modelVersion;

    @Column(nullable = false)
    private BigDecimal score;

    @Column(length = 20)
    private String scoreBand;

    private BigDecimal confidencePct;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> inputFeatures;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> featureImportance;

    @Column(length = 60)
    private String predictedOutcome;

    private BigDecimal predictedProbability;

    @Column(length = 200)
    private String recommendedAction;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> recommendedProducts;

    @Column(nullable = false)
    @Builder.Default
    private Instant scoredAt = Instant.now();

    private LocalDate validUntil;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isCurrent = true;
}
