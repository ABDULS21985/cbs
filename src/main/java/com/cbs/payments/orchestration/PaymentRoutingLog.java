package com.cbs.payments.orchestration;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "payment_routing_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentRoutingLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "payment_ref", nullable = false, length = 50) private String paymentRef;
    @Column(name = "source_country", length = 3) private String sourceCountry;
    @Column(name = "destination_country", length = 3) private String destinationCountry;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "amount", nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "payment_type", length = 30) private String paymentType;
    @Column(name = "selected_rail_code", nullable = false, length = 20) private String selectedRailCode;
    @Column(name = "fallback_used", nullable = false) @Builder.Default private Boolean fallbackUsed = false;
    @Column(name = "routing_rule_id") private Long routingRuleId;
    @Column(name = "optimization_reason", length = 200) private String optimizationReason;
    @Column(name = "estimated_fee", precision = 18, scale = 2) private BigDecimal estimatedFee;
    @Column(name = "estimated_speed", length = 20) private String estimatedSpeed;
    @Column(name = "candidates_evaluated", nullable = false) @Builder.Default private Integer candidatesEvaluated = 0;
    @Column(name = "routing_time_ms") private Integer routingTimeMs;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
