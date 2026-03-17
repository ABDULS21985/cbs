package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "marketplace_api_product")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketplaceApiProduct {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String productCode;
    @Column(nullable = false, length = 200) private String productName;
    @Column(nullable = false, length = 40) private String productCategory;
    @Column(nullable = false, length = 20) @Builder.Default private String apiVersion = "v1";
    @Column(columnDefinition = "TEXT") private String description;
    private String documentationUrl;
    @Column(nullable = false, length = 200) private String basePath;
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private List<String> supportedMethods = List.of("GET");
    @Column(nullable = false, length = 20) @Builder.Default private String rateLimitTier = "STANDARD";
    @Builder.Default private Integer rateLimitPerMin = 60;
    @Column(nullable = false, length = 20) @Builder.Default private String pricingModel = "FREE";
    private BigDecimal pricePerCall;
    private BigDecimal monthlyPrice;
    @Builder.Default private Boolean sandboxAvailable = true;
    @Builder.Default private Boolean requiresApproval = false;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    private Instant publishedAt;
    private Instant deprecatedAt;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
