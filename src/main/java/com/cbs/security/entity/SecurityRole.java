package com.cbs.security.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "security_role", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityRole {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 50) private String roleCode;
    @Column(nullable = false, length = 150) private String roleName;
    @Column(nullable = false, length = 30) @Builder.Default private String roleType = "SYSTEM";
    @Column(columnDefinition = "TEXT") private String description;
    private Long parentRoleId;
    @Column(nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(nullable = false) @Builder.Default private Integer maxSessionMinutes = 480;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> ipWhitelist;
    @JdbcTypeCode(SqlTypes.JSON) private Object timeRestriction;
    private Long tenantId;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
