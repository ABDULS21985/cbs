package com.cbs.dspm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "dspm_access_audit")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DspmAccessAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_code", nullable = false, unique = true, length = 30)
    private String auditCode;

    @Column(name = "identity_id", nullable = false)
    private Long identityId;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String action = "READ";

    @Column(name = "resource_path", length = 500)
    private String resourcePath;

    @Column(name = "query_text", columnDefinition = "text")
    private String queryText;

    @Column(name = "records_affected")
    @Builder.Default
    private Integer recordsAffected = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sensitive_fields", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> sensitiveFields = List.of();

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String outcome = "SUCCESS";

    @Column(name = "risk_flag")
    @Builder.Default
    private Boolean riskFlag = false;

    @Column(name = "policy_id")
    private Long policyId;

    @Column(name = "occurred_at")
    @Builder.Default
    private Instant occurredAt = Instant.now();

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
