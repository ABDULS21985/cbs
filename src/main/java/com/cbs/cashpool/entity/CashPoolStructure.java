package com.cbs.cashpool.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "cash_pool_structure")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashPoolStructure {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String poolCode;
    @Column(nullable = false, length = 200) private String poolName;
    @Column(nullable = false, length = 20) private String poolType;
    @Column(nullable = false) private Long headerAccountId;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false, length = 15) @Builder.Default private String sweepFrequency = "DAILY";
    private String sweepTime;
    private BigDecimal targetBalance;
    private BigDecimal thresholdAmount;
    @Builder.Default private BigDecimal minSweepAmount = BigDecimal.ZERO;
    @Builder.Default private Boolean interestReallocation = false;
    @Builder.Default private Boolean intercompanyLoan = false;
    @Builder.Default private Boolean isCrossBorder = false;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
