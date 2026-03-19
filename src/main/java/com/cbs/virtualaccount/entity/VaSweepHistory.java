package com.cbs.virtualaccount.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "va_sweep_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VaSweepHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long vaId;
    @Column(nullable = false) private BigDecimal sweepAmount;
    @Column(nullable = false, length = 15) @Builder.Default private String direction = "TO_MASTER";
    @Column(nullable = false) private BigDecimal balanceBefore;
    @Column(nullable = false) private BigDecimal balanceAfter;
    @Builder.Default private Instant sweptAt = Instant.now();
}
