package com.cbs.capitalmarkets.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
@Entity @Table(name = "deal_investor") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DealInvestor extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long dealId;
    @Column(nullable = false, length = 200) private String investorName;
    @Column(nullable = false, length = 20) private String investorType;
    @Column(nullable = false) private BigDecimal bidAmount;
    private BigDecimal bidPrice;
    private BigDecimal allottedAmount;
    private BigDecimal allottedUnits;
    @Builder.Default private BigDecimal paymentReceived = BigDecimal.ZERO;
    @Builder.Default private BigDecimal refundAmount = BigDecimal.ZERO;
    @Column(length = 80) private String certificateRef;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "BID_RECEIVED";
}
