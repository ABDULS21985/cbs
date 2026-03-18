package com.cbs.creditmargin.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "margin_call") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarginCall extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String callRef;
    @Column(nullable = false, length = 10) private String callDirection;
    @Column(nullable = false, length = 30) private String counterpartyCode;
    @Column(nullable = false, length = 200) private String counterpartyName;
    @Column(nullable = false, length = 15) private String callType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal callAmount;
    private BigDecimal portfolioMtm; private BigDecimal thresholdAmount; private BigDecimal minimumTransfer; private BigDecimal independentAmount;
    private BigDecimal agreedAmount;
    @Builder.Default private BigDecimal disputeAmount = BigDecimal.ZERO;
    @Column(columnDefinition = "TEXT") private String disputeReason;
    @Column(length = 20) private String collateralType;
    @Builder.Default private BigDecimal settledAmount = BigDecimal.ZERO;
    private LocalDate settlementDate;
    @Column(nullable = false) private LocalDate callDate;
    private LocalDate responseDeadline;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ISSUED";
}
