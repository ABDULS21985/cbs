package com.cbs.loyalty.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "loyalty_transaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long loyaltyAccountId;
    @Column(nullable = false, length = 15) private String transactionType;
    @Column(nullable = false) private Integer points;
    private String description;
    private Long sourceTransactionId;
    private String sourceType;
    private String partnerName;
    private LocalDate expiryDate;
    @Builder.Default private Instant createdAt = Instant.now();
}
