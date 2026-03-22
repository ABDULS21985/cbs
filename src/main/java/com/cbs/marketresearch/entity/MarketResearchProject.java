package com.cbs.marketresearch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "market_research_project")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketResearchProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String projectCode;

    @Column(nullable = false, length = 300)
    private String title;

    /** CUSTOMER_SURVEY | COMPETITIVE_ANALYSIS | PRODUCT_STUDY | MARKET_SIZING */
    @Column(nullable = false, length = 30)
    private String projectType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    /** ACTIVE | COMPLETED */
    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(columnDefinition = "TEXT")
    private String findings;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> keyInsights;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> actionItems;

    private Instant completedAt;

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(length = 200)
    private String createdBy;
}
