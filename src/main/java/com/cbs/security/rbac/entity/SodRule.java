package com.cbs.security.rbac.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "sod_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SodRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "rule_name", nullable = false, length = 100) private String ruleName;
    @Column(name = "conflicting_role_a", nullable = false, length = 30) private String conflictingRoleA;
    @Column(name = "conflicting_role_b", nullable = false, length = 30) private String conflictingRoleB;
    @Column(name = "severity", nullable = false, length = 10) @Builder.Default private String severity = "HIGH";
    @Column(name = "description", columnDefinition = "TEXT") private String description;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean isViolatedBy(String roleA, String roleB) {
        return (conflictingRoleA.equals(roleA) && conflictingRoleB.equals(roleB))
                || (conflictingRoleA.equals(roleB) && conflictingRoleB.equals(roleA));
    }
}
