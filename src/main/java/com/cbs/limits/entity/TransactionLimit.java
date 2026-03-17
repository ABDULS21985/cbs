package com.cbs.limits.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transaction_limit", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TransactionLimit extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "limit_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private LimitType limitType;

    @Column(name = "scope", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private LimitScope scope;

    @Column(name = "scope_ref_id")
    private Long scopeRefId;

    @Column(name = "product_code", length = 20)
    private String productCode;

    @Column(name = "max_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "max_count")
    private Integer maxCount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "applies_to_channels", length = 200)
    @Builder.Default
    private String appliesToChannels = "ALL";

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
