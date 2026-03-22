package com.cbs.dspm.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "dspm_identity")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DspmIdentity extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "identity_code", nullable = false, unique = true, length = 30)
    private String identityCode;

    @Column(name = "identity_name", nullable = false, length = 200)
    private String identityName;

    @Column(name = "identity_type", nullable = false, length = 20)
    @Builder.Default
    private String identityType = "USER";

    @Column(length = 200)
    private String email;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String role;

    @Column(name = "access_level", nullable = false, length = 20)
    @Builder.Default
    private String accessLevel = "READ";

    @Column(name = "data_sources_count")
    @Builder.Default
    private Integer dataSourcesCount = 0;

    @Column(name = "last_access_at")
    private Instant lastAccessAt;

    @Column(name = "risk_score", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal riskScore = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";
}
