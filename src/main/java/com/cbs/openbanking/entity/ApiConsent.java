package com.cbs.openbanking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "api_consent", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiConsent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "consent_id", nullable = false, unique = true, length = 50) private String consentId;
    @Column(name = "client_id", nullable = false, length = 50) private String clientId;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "consent_type", nullable = false, length = 20) private String consentType;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "permissions", columnDefinition = "jsonb") @Builder.Default private List<String> permissions = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "account_ids", columnDefinition = "jsonb") @Builder.Default private List<Long> accountIds = new ArrayList<>();
    @Column(name = "granted_at", nullable = false) @Builder.Default private Instant grantedAt = Instant.now();
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "AWAITING_AUTHORISATION";
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean isValid() { return "AUTHORISED".equals(status) && Instant.now().isBefore(expiresAt); }
}
