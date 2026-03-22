package com.cbs.dspm.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Entity
@Table(name = "dspm_exception")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DspmException extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exception_code", nullable = false, unique = true, length = 30)
    private String exceptionCode;

    @Column(name = "policy_id")
    private Long policyId;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "exception_type", nullable = false, length = 30)
    @Builder.Default
    private String exceptionType = "FALSE_POSITIVE";

    @Column(columnDefinition = "text")
    @Builder.Default
    private String reason = "";

    @Column(name = "risk_accepted")
    @Builder.Default
    private Boolean riskAccepted = false;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";
}
