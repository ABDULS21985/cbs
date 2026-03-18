package com.cbs.merchant.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "merchant_settlement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MerchantSettlement extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long merchantId;

    private Long facilityId;

    private LocalDate settlementDate;

    private BigDecimal grossTransactionAmount;

    @Builder.Default
    private Integer transactionCount = 0;

    @Builder.Default
    private BigDecimal mdrDeducted = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal otherFeesDeducted = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal chargebackDeductions = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal refundDeductions = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal reserveHeld = BigDecimal.ZERO;

    private BigDecimal netSettlementAmount;

    private Long settlementAccountId;

    @Column(length = 80)
    private String settlementReference;

    private Instant settledAt;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "CALCULATED";
}
