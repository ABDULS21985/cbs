package com.cbs.tenant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "tenant", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tenant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "tenant_code", nullable = false, unique = true, length = 20) private String tenantCode;
    @Column(name = "tenant_name", nullable = false, length = 200) private String tenantName;
    @Column(name = "tenant_type", nullable = false, length = 20) private String tenantType;
    @Column(name = "isolation_mode", nullable = false, length = 20) @Builder.Default private String isolationMode = "LOGICAL";
    @Column(name = "schema_name", length = 50) private String schemaName;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "branding_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> brandingConfig = new HashMap<>();
    @Column(name = "max_customers") private Integer maxCustomers;
    @Column(name = "max_accounts") private Integer maxAccounts;
    @Column(name = "max_users") private Integer maxUsers;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "license_expires_at") private Instant licenseExpiresAt;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
