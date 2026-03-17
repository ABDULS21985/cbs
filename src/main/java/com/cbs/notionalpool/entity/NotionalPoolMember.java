package com.cbs.notionalpool.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name = "notional_pool_member")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotionalPoolMember {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long poolId;
    @Column(nullable = false) private Long accountId;
    @Column(nullable = false, length = 200) private String memberName;
    @Column(nullable = false, length = 3) private String accountCurrency;
    @Builder.Default private BigDecimal fxRateToBase = BigDecimal.ONE;
    private BigDecimal currentBalance;
    private BigDecimal balanceInBase;
    private BigDecimal interestAllocationPct;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
