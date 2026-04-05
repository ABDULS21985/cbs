package com.cbs.mudarabah.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "wakala_deposit_account", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WakalaDepositAccount extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", unique = true)
    private Account account;

    @Column(name = "contract_reference", length = 50, unique = true, nullable = false)
    private String contractReference;

    @Column(name = "contract_signed_date")
    private LocalDate contractSignedDate;

    @Column(name = "islamic_product_template_id")
    private Long islamicProductTemplateId;

    @Builder.Default
    @Column(name = "contract_type_code", length = 30)
    private String contractTypeCode = "WAKALAH";

    @Enumerated(EnumType.STRING)
    @Column(name = "wakala_type", nullable = false)
    private WakalaType wakalaType;

    @Column(name = "wakalah_fee_rate", precision = 8, scale = 4)
    private BigDecimal wakalahFeeRate;

    @Column(name = "wakalah_fee_amount", precision = 18, scale = 4)
    private BigDecimal wakalahFeeAmount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "fee_frequency")
    private StatementFrequency feeFrequency = StatementFrequency.ANNUALLY;

    @Builder.Default
    @Column(name = "fee_accrued", precision = 18, scale = 4)
    private BigDecimal feeAccrued = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_fees_charged", precision = 18, scale = 4)
    private BigDecimal totalFeesCharged = BigDecimal.ZERO;

    @Column(name = "last_fee_charged_date")
    private LocalDate lastFeeChargedDate;

    @Column(name = "investment_mandate", columnDefinition = "TEXT")
    private String investmentMandate;

    @Column(name = "investment_mandate_ar", columnDefinition = "TEXT")
    private String investmentMandateAr;

    @Column(name = "target_return_rate", precision = 8, scale = 4)
    private BigDecimal targetReturnRate;

    @Column(name = "expected_profit_rate", precision = 8, scale = 4)
    private BigDecimal expectedProfitRate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel = RiskLevel.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_sub_type", nullable = false)
    private WakalaAccountSubType accountSubType;

    @Column(name = "tenor_days")
    private Integer tenorDays;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "maturity_instruction", length = 30)
    private String maturityInstruction;

    @Column(name = "investment_pool_id")
    private Long investmentPoolId;

    @Column(name = "pool_join_date")
    private LocalDate poolJoinDate;

    @Column(name = "last_profit_distribution_date")
    private LocalDate lastProfitDistributionDate;

    @Builder.Default
    @Column(name = "cumulative_profit_received", precision = 18, scale = 4)
    private BigDecimal cumulativeProfitReceived = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "cumulative_fees_deducted", precision = 18, scale = 4)
    private BigDecimal cumulativeFeesDeducted = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "loss_exposure")
    private boolean lossExposure = true;

    @Column(name = "loss_disclosure_accepted", nullable = false)
    private boolean lossDisclosureAccepted;

    @Builder.Default
    @Column(name = "bank_negligence_liability")
    private boolean bankNegligenceLiability = true;

    @Column(name = "bank_negligent")
    @Builder.Default
    private boolean bankNegligent = false;

    @Column(name = "payout_account_id")
    private Long payoutAccountId;

    @Column(name = "matured_at")
    private LocalDate maturedAt;

    @Column(name = "early_withdrawn_at")
    private LocalDate earlyWithdrawnAt;

    @Column(name = "early_withdrawal_reason", columnDefinition = "TEXT")
    private String earlyWithdrawalReason;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Builder.Default
    @Column(name = "early_withdrawal_allowed")
    private boolean earlyWithdrawalAllowed = true;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_language")
    private PreferredLanguage preferredLanguage = PreferredLanguage.EN;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "statement_frequency")
    private StatementFrequency statementFrequency = StatementFrequency.MONTHLY;

    @Column(name = "tenant_id")
    private Long tenantId;
}
