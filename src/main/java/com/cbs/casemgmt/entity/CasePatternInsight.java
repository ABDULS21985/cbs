package com.cbs.casemgmt.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "case_pattern_insight", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CasePatternInsight extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pattern_type", nullable = false, length = 25)
    private String patternType;

    @Column(name = "pattern_description", columnDefinition = "TEXT")
    private String patternDescription;

    @Column(name = "case_count")
    private Integer caseCount;

    @Column(name = "date_range_start")
    private LocalDate dateRangeStart;

    @Column(name = "date_range_end")
    private LocalDate dateRangeEnd;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "affected_products")
    private Map<String, Object> affectedProducts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "affected_channels")
    private Map<String, Object> affectedChannels;

    @Column(name = "root_cause_category", length = 15)
    private String rootCauseCategory;

    @Column(name = "trend_direction", length = 10)
    private String trendDirection;

    @Column(name = "recommended_action", columnDefinition = "TEXT")
    private String recommendedAction;

    @Column(name = "priority", length = 10)
    private String priority;

    @Column(name = "assigned_to", length = 80)
    private String assignedTo;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "IDENTIFIED";
}
