package com.cbs.security.masking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "masking_policy", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaskingPolicy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "policy_name", nullable = false, unique = true, length = 150) private String policyName;
    @Column(name = "entity_type", nullable = false, length = 60) private String entityType;
    @Column(name = "field_name", nullable = false, length = 80) private String fieldName;
    @Column(name = "masking_strategy", nullable = false, length = 30) private String maskingStrategy;
    @Column(name = "mask_pattern", length = 100) private String maskPattern;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "applies_to_roles", columnDefinition = "jsonb") private List<String> appliesToRoles;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "applies_to_channels", columnDefinition = "jsonb") private List<String> appliesToChannels;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
}
