package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "role_permission", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"role_id", "permission_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolePermission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "role_id", nullable = false) private Long roleId;
    @Column(name = "permission_id", nullable = false) private Long permissionId;
    @Builder.Default private Instant grantedAt = Instant.now();
    @Column(length = 80) private String grantedBy;
}
