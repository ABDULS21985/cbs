package com.cbs.cardclearing.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "card_clearing_batch") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardClearingBatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String batchId;
    @Column(nullable = false, length = 20) private String network;
    @Column(nullable = false, length = 20) private String batchType;
    @Column(nullable = false) private LocalDate clearingDate; private LocalDate settlementDate;
    @Column(nullable = false, length = 3) private String currency;
    @Builder.Default private Integer totalTransactions = 0;
    @Builder.Default private BigDecimal totalAmount = BigDecimal.ZERO;
    @Builder.Default private BigDecimal totalFees = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interchangeAmount = BigDecimal.ZERO;
    private BigDecimal netSettlementAmount; private String fileReference;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "RECEIVED";
    @Builder.Default private Integer exceptionCount = 0; private Instant reconciledAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
