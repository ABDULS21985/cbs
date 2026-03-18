package com.cbs.interactivehelp.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "guided_flow")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class GuidedFlow extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String flowCode;

    @Column(nullable = false, length = 200)
    private String flowName;

    @Column(nullable = false, length = 20)
    private String flowType;

    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> steps;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> decisionTree;

    private Integer estimatedDurationMin;

    @Builder.Default
    private BigDecimal completionRatePct = BigDecimal.ZERO;

    @Builder.Default
    private Integer totalStarts = 0;

    @Builder.Default
    private Integer totalCompletions = 0;

    @Column(length = 20)
    private String targetChannel;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";
}
