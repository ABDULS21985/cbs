package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "abac_policy", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AbacPolicy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 150) private String policyName;
    @Column(nullable = false, length = 80) private String resource;
    @Column(nullable = false, length = 30) private String action;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private Map<String, Object> conditionExpr;
    @Column(nullable = false, length = 10) @Builder.Default private String effect = "PERMIT";
    @Column(nullable = false) @Builder.Default private Integer priority = 100;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(nullable = false) @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
