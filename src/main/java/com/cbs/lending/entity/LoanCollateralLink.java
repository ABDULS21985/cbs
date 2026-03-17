package com.cbs.lending.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loan_collateral_link", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(name = "uq_loan_collateral", columnNames = {"loan_account_id", "collateral_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanCollateralLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_account_id", nullable = false)
    private LoanAccount loanAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collateral_id", nullable = false)
    private Collateral collateral;

    @Column(name = "allocated_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal allocatedValue;

    @Column(name = "coverage_percentage", precision = 5, scale = 2)
    private BigDecimal coveragePercentage;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private Boolean isPrimary = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
