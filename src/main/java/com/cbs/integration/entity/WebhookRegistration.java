package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "webhook_registration")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WebhookRegistration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String webhookId;
    @Column(nullable = false, length = 500) private String url;
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private List<String> events = List.of();
    private Long tppClientId;
    @Column(length = 200) private String tppClientName;
    @Column(nullable = false, length = 20) @Builder.Default private String authType = "NONE";
    @Column(length = 256) private String secretHash;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(nullable = false, precision = 5, scale = 2) @Builder.Default private BigDecimal successRate = new BigDecimal("100.00");
    @Builder.Default private Integer totalDeliveries = 0;
    @Builder.Default private Integer failedDeliveries = 0;
    private Instant lastDeliveredAt;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();

    public void recalculateSuccessRate() {
        if (totalDeliveries == null || totalDeliveries == 0) {
            successRate = new BigDecimal("100.00");
        } else {
            int succeeded = totalDeliveries - (failedDeliveries != null ? failedDeliveries : 0);
            successRate = BigDecimal.valueOf(succeeded * 100.0 / totalDeliveries)
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }
    }
}
