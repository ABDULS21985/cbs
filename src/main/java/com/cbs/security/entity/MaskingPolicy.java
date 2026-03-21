package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "masking_policy", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaskingPolicy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 150) private String policyName;
    @Column(nullable = false, length = 60) private String entityType;
    @Column(nullable = false, length = 80) private String fieldName;
    @Column(nullable = false, length = 30) private String maskingStrategy;
    @Column(length = 100) private String maskPattern;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> appliesToRoles;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> appliesToChannels;
    @Column(nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(columnDefinition = "TEXT") private String description;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
