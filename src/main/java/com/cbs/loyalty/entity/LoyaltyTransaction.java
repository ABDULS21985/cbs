package com.cbs.loyalty.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name = "loyalty_transaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long accountId;
    @Column(nullable = false, length = 20) private String transactionType;
    @Column(nullable = false) private Long points;
    private String description;
    private Long sourceTransactionId;
    private String redemptionType;
    private BigDecimal redemptionValue;
    private String partnerCode;
    @Builder.Default private Instant createdAt = Instant.now();
}
