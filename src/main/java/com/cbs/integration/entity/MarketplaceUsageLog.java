package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "marketplace_usage_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketplaceUsageLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long subscriptionId;
    @Column(nullable = false) private Long apiProductId;
    @Column(nullable = false, length = 200) private String endpointPath;
    @Column(nullable = false, length = 10) private String httpMethod;
    @Column(nullable = false) private Integer responseCode;
    @Column(nullable = false) private Integer responseTimeMs;
    private Integer requestSizeBytes;
    private Integer responseSizeBytes;
    private String ipAddress;
    @Builder.Default private Instant createdAt = Instant.now();
}
