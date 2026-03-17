package com.cbs.loyalty.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name = "loyalty_account")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long programId;
    @Column(nullable = false, unique = true, length = 30) private String membershipNumber;
    @Column(nullable = false, length = 30) @Builder.Default private String currentTier = "BASIC";
    @Builder.Default private Long pointsBalance = 0L;
    @Builder.Default private Long pointsEarnedYtd = 0L;
    @Builder.Default private Long pointsRedeemedYtd = 0L;
    @Builder.Default private Long pointsExpiredYtd = 0L;
    @Builder.Default private Long lifetimePoints = 0L;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant enrolledAt = Instant.now();
    @Builder.Default private Instant createdAt = Instant.now();
}
