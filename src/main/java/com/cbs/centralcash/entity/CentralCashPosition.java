package com.cbs.centralcash.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "central_cash_position") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CentralCashPosition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private LocalDate positionDate;
    @Column(nullable = false, length = 3) private String currency;
    @Builder.Default private BigDecimal clearingInflows = BigDecimal.ZERO;
    @Builder.Default private BigDecimal customerDeposits = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interbankInflows = BigDecimal.ZERO;
    @Builder.Default private BigDecimal cbBorrowing = BigDecimal.ZERO;
    @Builder.Default private BigDecimal clearingOutflows = BigDecimal.ZERO;
    @Builder.Default private BigDecimal customerWithdrawals = BigDecimal.ZERO;
    @Builder.Default private BigDecimal interbankOutflows = BigDecimal.ZERO;
    @Builder.Default private BigDecimal cbRepayment = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal openingBalance;
    @Builder.Default private BigDecimal netMovement = BigDecimal.ZERO;
    private BigDecimal closingBalance; private BigDecimal reserveRequirement; private BigDecimal excessReserve;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PROJECTED";
    @Builder.Default private Instant createdAt = Instant.now();
}
