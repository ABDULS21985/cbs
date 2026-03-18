package com.cbs.quantmodel.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "quant_model")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class QuantModel extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String modelCode;

    @Column(nullable = false, length = 200)
    private String modelName;

    @Column(nullable = false, length = 25)
    private String modelType;

    @Column(nullable = false, length = 20)
    private String modelCategory;

    @Column(length = 30)
    private String methodology;

    @Column(nullable = false, length = 20)
    private String modelVersion;

    private String description;

    @Column(length = 200)
    private String developer;

    @Column(length = 200)
    private String owner;

    private Instant lastValidatedAt;

    @Column(length = 15)
    private String validationResult;

    @Column(length = 200)
    private String validationReportRef;

    private BigDecimal accuracyPct;
    private BigDecimal aucRoc;
    private BigDecimal giniCoefficient;
    private BigDecimal ksStatistic;

    @Column(name = "r2_score")
    private BigDecimal r2Score;

    private BigDecimal mapePct;

    @Column(length = 10)
    private String modelRiskTier;

    @Builder.Default
    private Boolean regulatoryUse = false;

    private LocalDate nextReviewDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DEVELOPMENT";
}
