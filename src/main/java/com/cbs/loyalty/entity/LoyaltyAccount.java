package com.cbs.loyalty.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "loyalty_account")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long programId;
    @Column(nullable = false, unique = true, length = 30) private String loyaltyNumber;
    @Builder.Default private Integer currentBalance = 0;
    @Builder.Default private Integer lifetimeEarned = 0;
    @Builder.Default private Integer lifetimeRedeemed = 0;
    @Builder.Default private Integer lifetimeExpired = 0;
    @Builder.Default private String currentTier = "STANDARD";
    @Builder.Default private Integer tierQualificationPoints = 0;
    private LocalDate tierReviewDate;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
