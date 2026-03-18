package com.cbs.secposition.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "securities_position")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SecuritiesPosition extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String positionId;
    @Column(length = 30) private String portfolioCode;
    @Column(length = 30) private String custodyAccountCode;
    @Column(nullable = false, length = 30) private String instrumentCode;
    @Column(nullable = false, length = 300) private String instrumentName;
    @Column(length = 12) private String isin;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private BigDecimal quantity = BigDecimal.ZERO;
    private BigDecimal avgCost;
    private BigDecimal costBasis;
    private BigDecimal currentPrice;
    private BigDecimal marketValue;
    private BigDecimal unrealizedGainLoss;
    @Builder.Default private BigDecimal accruedInterest = BigDecimal.ZERO;
    @Column(name = "settlement_t0_count") @Builder.Default private Integer settlementT0Count = 0;
    @Column(name = "settlement_t1_count") @Builder.Default private Integer settlementT1Count = 0;
    @Column(name = "settlement_t2_count") @Builder.Default private Integer settlementT2Count = 0;
    @Builder.Default private BigDecimal pledgedQuantity = BigDecimal.ZERO;
    private BigDecimal availableQuantity;
    private Instant lastPricedAt;
    @Column(nullable = false) private LocalDate positionDate;
}
