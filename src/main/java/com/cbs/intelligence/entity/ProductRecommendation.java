package com.cbs.intelligence.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "product_recommendation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductRecommendation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 80) private String recommendedProduct;
    @Column(nullable = false, length = 30) private String recommendationType;
    @Column(nullable = false) private BigDecimal score;
    @Column(columnDefinition = "TEXT") private String reason;
    private String modelVersion;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    private Instant presentedAt;
    private Instant respondedAt;
    private Instant expiresAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
