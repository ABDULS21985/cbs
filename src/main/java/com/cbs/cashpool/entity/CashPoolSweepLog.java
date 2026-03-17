package com.cbs.cashpool.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "cash_pool_sweep_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashPoolSweepLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long poolId;
    @Column(nullable = false) private Long participantId;
    @Column(nullable = false, length = 15) private String sweepDirection;
    @Column(nullable = false) private BigDecimal amount;
    @Column(nullable = false) private Long fromAccountId;
    @Column(nullable = false) private Long toAccountId;
    private BigDecimal balanceBefore;
    private BigDecimal balanceAfter;
    @Column(nullable = false, length = 20) private String sweepType;
    @Builder.Default private Boolean isIntercompanyLoan = false;
    @Column(nullable = false) @Builder.Default private LocalDate valueDate = LocalDate.now();
    @Column(nullable = false, length = 15) @Builder.Default private String status = "COMPLETED";
    @Builder.Default private Instant createdAt = Instant.now();
}
