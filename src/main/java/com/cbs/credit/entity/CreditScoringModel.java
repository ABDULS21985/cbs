package com.cbs.credit.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "credit_scoring_model", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CreditScoringModel extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_code", nullable = false, unique = true, length = 30)
    private String modelCode;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "model_type", nullable = false, length = 20)
    private String modelType;

    @Column(name = "target_segment", nullable = false, length = 20)
    private String targetSegment;

    @Column(name = "min_score", nullable = false)
    @Builder.Default
    private Integer minScore = 0;

    @Column(name = "max_score", nullable = false)
    @Builder.Default
    private Integer maxScore = 1000;

    @Column(name = "cutoff_score", nullable = false)
    private Integer cutoffScore;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "model_config", columnDefinition = "jsonb")
    private Map<String, Object> modelConfig;
}
