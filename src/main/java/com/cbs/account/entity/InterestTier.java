package com.cbs.account.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "interest_tier", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(name = "uq_product_tier", columnNames = {"product_id", "tier_name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class InterestTier extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "tier_name", nullable = false, length = 50)
    private String tierName;

    @Column(name = "min_balance", nullable = false, precision = 18, scale = 2)
    private BigDecimal minBalance;

    @Column(name = "max_balance", precision = 18, scale = 2)
    private BigDecimal maxBalance;

    @Column(name = "interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    public boolean containsBalance(BigDecimal balance) {
        if (balance.compareTo(minBalance) < 0) return false;
        if (maxBalance == null) return true;
        return balance.compareTo(maxBalance) <= 0;
    }
}
