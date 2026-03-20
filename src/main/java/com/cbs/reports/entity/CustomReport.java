package com.cbs.reports.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "custom_report", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomReport {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String reportCode;

    @Column(nullable = false, length = 200)
    private String reportName;

    private String description;

    @Column(length = 30)
    private String category;

    @Column(length = 80)
    private String owner;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> config;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> schedule;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> recipients;

    @Column(length = 15)
    @Builder.Default
    private String accessLevel = "PRIVATE";

    @Column(length = 15)
    @Builder.Default
    private String status = "DRAFT";

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant updatedAt;

    @Builder.Default
    private Long version = 0L;
}
