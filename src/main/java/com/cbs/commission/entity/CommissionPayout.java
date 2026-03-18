package com.cbs.commission.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;

@Entity @Table(name = "commission_payout")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CommissionPayout extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String payoutCode;
    @Column(nullable = false) private Long agreementId;
    @Column(nullable = false, length = 80) private String partyId;
    @Column(nullable = false, length = 200) private String partyName;
    @Column(nullable = false, length = 10) private String payoutPeriod;
    @Column(nullable = false) private LocalDate periodStart;
    @Column(nullable = false) private LocalDate periodEnd;
    @Column(length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private BigDecimal grossSales = BigDecimal.ZERO;
    @Builder.Default private BigDecimal qualifyingSales = BigDecimal.ZERO;
    private BigDecimal commissionRateApplied;
    @Column(nullable = false) private BigDecimal grossCommission;
    @Builder.Default private BigDecimal deductions = BigDecimal.ZERO;
    @Builder.Default private BigDecimal clawbackAmount = BigDecimal.ZERO;
    @Builder.Default private BigDecimal taxAmount = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal netCommission;
    private Long paymentAccountId;
    @Column(length = 80) private String paymentReference;
    private Instant paidAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "CALCULATED";
}
