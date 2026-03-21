package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "pii_field_registry", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"entity_type", "field_name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PiiFieldRegistry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 60) private String entityType;
    @Column(nullable = false, length = 80) private String fieldName;
    @Column(nullable = false, length = 40) private String piiCategory;
    @Column(nullable = false, length = 10) @Builder.Default private String sensitivityLevel = "HIGH";
    @Column(nullable = false) @Builder.Default private Boolean encryptionRequired = true;
    @Column(nullable = false, length = 30) @Builder.Default private String defaultMaskingStrategy = "PARTIAL_MASK";
    private Integer retentionDays;
    @Column(length = 40) private String gdprLawfulBasis;
    @Builder.Default private Instant createdAt = Instant.now();
}
