package com.cbs.openbanking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "api_client", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiClient {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "client_id", nullable = false, unique = true, length = 50) private String clientId;
    @Column(name = "client_name", nullable = false, length = 200) private String clientName;
    @Column(name = "client_type", nullable = false, length = 20) private String clientType;
    @Column(name = "api_key_hash", nullable = false, length = 128) private String apiKeyHash;
    @Column(name = "oauth_client_id", length = 100) private String oauthClientId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "redirect_uris", columnDefinition = "jsonb") @Builder.Default private List<String> redirectUris = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_scopes", columnDefinition = "jsonb") @Builder.Default private List<String> allowedScopes = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "allowed_endpoints", columnDefinition = "jsonb") @Builder.Default private List<String> allowedEndpoints = new ArrayList<>();
    @Column(name = "rate_limit_per_second", nullable = false) @Builder.Default private Integer rateLimitPerSecond = 10;
    @Column(name = "rate_limit_per_day", nullable = false) @Builder.Default private Integer rateLimitPerDay = 10000;
    @Column(name = "daily_request_count", nullable = false) @Builder.Default private Integer dailyRequestCount = 0;
    @Column(name = "last_request_reset") private java.time.LocalDate lastRequestReset;
    @Column(name = "api_version", nullable = false, length = 10) @Builder.Default private String apiVersion = "v1";
    @Column(name = "contact_name", length = 100) private String contactName;
    @Column(name = "contact_email", length = 100) private String contactEmail;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "approved_at") private Instant approvedAt;
    @Column(name = "expires_at") private Instant expiresAt;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean isRateLimited() {
        if (lastRequestReset != null && !lastRequestReset.equals(java.time.LocalDate.now())) {
            dailyRequestCount = 0; lastRequestReset = java.time.LocalDate.now();
        }
        return dailyRequestCount >= rateLimitPerDay;
    }
    public void incrementRequestCount() { dailyRequestCount++; }
}
