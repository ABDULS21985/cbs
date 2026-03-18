package com.cbs.cardclearing.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "card_settlement_position") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardSettlementPosition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate settlementDate;
    @Column(nullable = false, length = 20) private String network;
    private String counterpartyBic; private String counterpartyName;
    @Column(nullable = false, length = 3) private String currency;
    @Builder.Default private BigDecimal grossDebits = BigDecimal.ZERO;
    @Builder.Default private BigDecimal grossCredits = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interchangeReceivable = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interchangePayable = BigDecimal.ZERO;
    @Builder.Default private BigDecimal schemeFees = BigDecimal.ZERO;
    @Column(nullable = false) @Builder.Default private BigDecimal netPosition = BigDecimal.ZERO;
    private Long settlementAccountId;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PENDING";
    private Instant settledAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
