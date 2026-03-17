package com.cbs.agent.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "agent_transaction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgentTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "agent_id", nullable = false) private Long agentId;
    @Column(name = "transaction_type", nullable = false, length = 20) private String transactionType;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "account_id") private Long accountId;
    @Column(name = "amount", nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "commission_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal commissionAmount = BigDecimal.ZERO;
    @Column(name = "currency_code", nullable = false, length = 3) @Builder.Default private String currencyCode = "USD";
    @Column(name = "reference", length = 50) private String reference;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "COMPLETED";
    @Column(name = "geo_latitude", precision = 10, scale = 7) private BigDecimal geoLatitude;
    @Column(name = "geo_longitude", precision = 10, scale = 7) private BigDecimal geoLongitude;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
