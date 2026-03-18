package com.cbs.marketresearch.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "market_research_project")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketResearchProject extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String projectCode;

    @Column(nullable = false, length = 200)
    private String projectName;

    @Column(nullable = false, length = 25)
    private String projectType;

    private String objectives;

    @Column(length = 20)
    private String methodology;

    @Column(length = 200)
    private String targetPopulation;

    private Integer sampleSize;

    @Column(length = 200)
    private String vendor;

    @Column(length = 200)
    private String projectLead;

    private BigDecimal budget;
    private BigDecimal actualCost;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualEndDate;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> keyFindings;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> recommendations;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> actionsTaken;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> impactMeasurement;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PROPOSED";
}
