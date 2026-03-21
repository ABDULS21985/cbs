package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "user_role_assignment", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "role_id", "tenant_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserRoleAssignment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "role_id", nullable = false) private Long roleId;
    @Builder.Default private Instant assignedAt = Instant.now();
    @Column(length = 80) private String assignedBy;
    private Instant expiresAt;
    @Column(nullable = false) @Builder.Default private Boolean isActive = true;
    private Long branchScope;
    private Long tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", insertable = false, updatable = false)
    private SecurityRole role;
}
