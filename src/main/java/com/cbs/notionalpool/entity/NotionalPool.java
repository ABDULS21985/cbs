package com.cbs.notionalpool.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "notional_pool")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotionalPool {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String poolCode;
    @Column(nullable = false, length = 200) private String poolName;
    @Column(nullable = false, length = 20) private String poolType;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 3) @Builder.Default private String baseCurrency = "USD";
    @Column(nullable = false, length = 20) @Builder.Default private String interestCalcMethod = "NET_BALANCE";
    private BigDecimal creditRate;
    private BigDecimal debitRate;
    private BigDecimal advantageSpread;
    private BigDecimal notionalLimit;
    private BigDecimal individualDebitLimit;
    private LocalDate lastCalcDate;
    private BigDecimal netPoolBalance;
    private BigDecimal totalCreditBalances;
    private BigDecimal totalDebitBalances;
    @Builder.Default private BigDecimal interestBenefitMtd = BigDecimal.ZERO;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
