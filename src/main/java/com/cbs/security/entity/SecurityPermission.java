package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "security_permission")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityPermission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 100) private String permissionCode;
    @Column(nullable = false, length = 80) private String resource;
    @Column(nullable = false, length = 30) private String action;
    private String description;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
