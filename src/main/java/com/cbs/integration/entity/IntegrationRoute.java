package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "integration_route")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IntegrationRoute {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String routeCode;
    @Column(nullable = false, length = 200) private String routeName;
    @Column(nullable = false, length = 30) private String routeType;
    @Column(nullable = false, length = 80) private String sourceSystem;
    @Column(nullable = false, length = 80) private String targetSystem;
    @Column(nullable = false, length = 30) private String protocol;
    private String endpointUrl;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> transformSpec;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> retryPolicy;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> circuitBreaker;
    private Integer rateLimitPerSec;
    @Builder.Default private Integer timeoutMs = 30000;
    @Column(length = 20) @Builder.Default private String authType = "NONE";
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> authConfig;
    @Builder.Default private Boolean isActive = true;
    private Instant lastHealthCheck;
    @Column(length = 20) @Builder.Default private String healthStatus = "UNKNOWN";
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
