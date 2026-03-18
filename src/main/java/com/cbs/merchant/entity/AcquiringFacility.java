package com.cbs.merchant.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "acquiring_facility")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AcquiringFacility extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long merchantId;

    @Column(length = 20)
    private String facilityType;

    @Column(length = 15)
    private String processorConnection;

    @Column(length = 20)
    private String terminalIdPrefix;

    @Column(length = 3)
    @Builder.Default
    private String settlementCurrency = "NGN";

    @Column(length = 3)
    private String settlementCycle;

    private BigDecimal mdrRatePct;

    private BigDecimal dailyTransactionLimit;

    private BigDecimal monthlyVolumeLimit;

    private BigDecimal chargebackLimitPct;

    private BigDecimal reserveHoldPct;

    @Builder.Default
    private BigDecimal reserveBalance = BigDecimal.ZERO;

    @Column(length = 20)
    @Builder.Default
    private String pciComplianceStatus = "PENDING_SAQ";

    private LocalDate pciComplianceDate;

    @Builder.Default
    private Boolean fraudScreeningEnabled = true;

    @Column(name = "three_d_secure_enabled")
    @Builder.Default
    private Boolean threeDSecureEnabled = false;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "SETUP";
}
