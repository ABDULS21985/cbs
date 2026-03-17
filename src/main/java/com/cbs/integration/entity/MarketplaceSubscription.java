package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "marketplace_subscription")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketplaceSubscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String subscriptionId;
    @Column(nullable = false) private Long apiProductId;
    private Long subscriberClientId;
    @Column(nullable = false, length = 200) private String subscriberName;
    private String subscriberEmail;
    @Column(nullable = false, length = 20) @Builder.Default private String planTier = "STANDARD";
    private String apiKeyHash;
    private Integer monthlyCallLimit;
    @Builder.Default private Integer callsThisMonth = 0;
    private LocalDate billingStartDate;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    private String approvedBy;
    private Instant approvedAt;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();

    public boolean hasCallsRemaining() {
        return monthlyCallLimit == null || callsThisMonth < monthlyCallLimit;
    }
}
