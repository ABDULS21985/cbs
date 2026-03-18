package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "role_permission")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolePermission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long roleId;
    @Column(nullable = false) private Long permissionId;
    @Builder.Default private Instant grantedAt = Instant.now();
    private String grantedBy;
}
