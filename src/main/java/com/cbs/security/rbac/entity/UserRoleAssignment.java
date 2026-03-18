package com.cbs.security.rbac.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "user_role_assignment", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserRoleAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false, length = 100) private String userId;
    @Column(name = "role_code", nullable = false, length = 30) private String roleCode;
    @Column(name = "branch_code", length = 20) private String branchCode;
    @Column(name = "effective_from", nullable = false) @Builder.Default private Instant effectiveFrom = Instant.now();
    @Column(name = "effective_to") private Instant effectiveTo;
    @Column(name = "is_jit_elevation", nullable = false) @Builder.Default private Boolean isJitElevation = false;
    @Column(name = "jit_reason", length = 300) private String jitReason;
    @Column(name = "jit_approved_by", length = 100) private String jitApprovedBy;
    @Column(name = "jit_expires_at") private Instant jitExpiresAt;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "assigned_by", nullable = false, length = 100) private String assignedBy;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean isEffective() {
        Instant now = Instant.now();
        return Boolean.TRUE.equals(isActive) && !now.isBefore(effectiveFrom)
                && (effectiveTo == null || now.isBefore(effectiveTo))
                && (!Boolean.TRUE.equals(isJitElevation) || jitExpiresAt == null || now.isBefore(jitExpiresAt));
    }
}
