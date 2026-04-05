package com.cbs.mudarabah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "mudarabah_term_deposit", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MudarabahTermDeposit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mudarabah_account_id")
    private MudarabahAccount mudarabahAccount;

    @Column(name = "deposit_ref", length = 50, unique = true, nullable = false)
    private String depositRef;

    @Column(name = "principal_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "currency_code", length = 3, nullable = false)
    private String currencyCode;

    @Column(name = "tenor_days", nullable = false)
    private int tenorDays;

    @Column(name = "tenor_months")
    private Integer tenorMonths;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "maturity_date_hijri", length = 30)
    private String maturityDateHijri;

    @Column(name = "psr_customer", nullable = false, precision = 8, scale = 4)
    private BigDecimal psrCustomer;

    @Column(name = "psr_bank", nullable = false, precision = 8, scale = 4)
    private BigDecimal psrBank;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "profit_distribution_frequency")
    private ProfitDistributionFrequency profitDistributionFrequency = ProfitDistributionFrequency.AT_MATURITY;

    @Column(name = "last_profit_distribution_date")
    private LocalDate lastProfitDistributionDate;

    @Builder.Default
    @Column(name = "accumulated_profit", precision = 18, scale = 4)
    private BigDecimal accumulatedProfit = BigDecimal.ZERO;

    @Column(name = "estimated_maturity_amount", precision = 18, scale = 4)
    private BigDecimal estimatedMaturityAmount;

    @Column(name = "actual_maturity_amount", precision = 18, scale = 4)
    private BigDecimal actualMaturityAmount;

    @Column(name = "investment_pool_id")
    private Long investmentPoolId;

    @Column(name = "pool_entry_date")
    private LocalDate poolEntryDate;

    @Column(name = "pool_exit_date")
    private LocalDate poolExitDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "maturity_instruction", nullable = false)
    private MudarabahMaturityInstruction maturityInstruction;

    @Column(name = "payout_account_id")
    private Long payoutAccountId;

    @Builder.Default
    @Column(name = "auto_renew")
    private boolean autoRenew = false;

    @Column(name = "renewal_psr_customer", precision = 8, scale = 4)
    private BigDecimal renewalPsrCustomer;

    @Column(name = "renewal_psr_bank", precision = 8, scale = 4)
    private BigDecimal renewalPsrBank;

    @Column(name = "renewal_tenor_days")
    private Integer renewalTenorDays;

    @Builder.Default
    @Column(name = "rollover_count")
    private int rolloverCount = 0;

    @Column(name = "original_deposit_ref", length = 50)
    private String originalDepositRef;

    @Builder.Default
    @Column(name = "early_withdrawal_allowed")
    private boolean earlyWithdrawalAllowed = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "early_withdrawal_penalty_type")
    private EarlyWithdrawalPenalty earlyWithdrawalPenaltyType;

    @Column(name = "early_withdrawal_reduced_psr", precision = 8, scale = 4)
    private BigDecimal earlyWithdrawalReducedPsr;

    @Column(name = "early_withdrawn_at")
    private LocalDate earlyWithdrawnAt;

    @Column(name = "early_withdrawal_reason", columnDefinition = "TEXT")
    private String earlyWithdrawalReason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MudarabahTDStatus status = MudarabahTDStatus.ACTIVE;

    @Column(name = "matured_at")
    private LocalDate maturedAt;

    @Column(name = "cancelled_at")
    private LocalDate cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Builder.Default
    @Column(name = "has_lien")
    private boolean hasLien = false;

    @Column(name = "lien_reference", length = 100)
    private String lienReference;

    @Column(name = "lien_amount", precision = 18, scale = 2)
    private BigDecimal lienAmount;

    @Column(name = "external_reference", length = 100, unique = true)
    private String externalReference;

    @Column(name = "tenant_id")
    private Long tenantId;
}
