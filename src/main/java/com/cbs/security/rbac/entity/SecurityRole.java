package com.cbs.security.rbac.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "security_role", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityRole {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "role_code", nullable = false, unique = true, length = 30) private String roleCode;
    @Column(name = "role_name", nullable = false, length = 100) private String roleName;
    @Column(name = "role_type", nullable = false, length = 20) private String roleType;
    @Column(name = "description", columnDefinition = "TEXT") private String description;
    @Column(name = "parent_role_code", length = 30) private String parentRoleCode;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "permissions", columnDefinition = "jsonb") @Builder.Default private List<String> permissions = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_branches", columnDefinition = "jsonb") @Builder.Default private List<String> allowedBranches = List.of("*");
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_products", columnDefinition = "jsonb") @Builder.Default private List<String> allowedProducts = List.of("*");
    @Column(name = "max_approval_amount", precision = 18, scale = 2) private BigDecimal maxApprovalAmount;
    @Column(name = "data_access_level", length = 20) @Builder.Default private String dataAccessLevel = "OWN";
    @Column(name = "requires_maker_checker", nullable = false) @Builder.Default private Boolean requiresMakerChecker = false;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;

    public boolean hasPermission(String perm) { return permissions.contains(perm) || permissions.contains("*"); }
    public boolean canAccessBranch(String branchCode) { return allowedBranches.contains("*") || allowedBranches.contains(branchCode); }
    public boolean canAccessProduct(String productCode) { return allowedProducts.contains("*") || allowedProducts.contains(productCode); }
}
