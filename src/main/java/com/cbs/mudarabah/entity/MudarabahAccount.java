package com.cbs.mudarabah.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mudarabah_account", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MudarabahAccount extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "contract_reference", length = 50, unique = true, nullable = false)
    private String contractReference;

    @Column(name = "contract_signed_date")
    private LocalDate contractSignedDate;

    @Builder.Default
    @Column(name = "contract_version", nullable = false)
    private int contractVersion = 1;

    @Column(name = "islamic_product_template_id")
    private Long islamicProductTemplateId;

    @Builder.Default
    @Column(name = "contract_type_code", length = 30)
    private String contractTypeCode = "MUDARABAH";

    @Enumerated(EnumType.STRING)
    @Column(name = "mudarabah_type", nullable = false)
    private MudarabahType mudarabahType;

    @Column(name = "restriction_details", columnDefinition = "TEXT")
    private String restrictionDetails;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_sub_type", nullable = false)
    private MudarabahAccountSubType accountSubType;

    @Column(name = "profit_sharing_ratio_customer", nullable = false, precision = 8, scale = 4)
    private BigDecimal profitSharingRatioCustomer;

    @Column(name = "profit_sharing_ratio_bank", nullable = false, precision = 8, scale = 4)
    private BigDecimal profitSharingRatioBank;

    @Column(name = "psr_agreed_at")
    private LocalDateTime psrAgreedAt;

    @Builder.Default
    @Column(name = "psr_agreed_version")
    private int psrAgreedVersion = 1;

    @Column(name = "psr_tier_decision_table_code", length = 100)
    private String psrTierDecisionTableCode;

    @Column(name = "investment_pool_id")
    private Long investmentPoolId;

    @Column(name = "pool_join_date")
    private LocalDate poolJoinDate;

    @Column(name = "current_weight", precision = 18, scale = 8)
    private BigDecimal currentWeight;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "weightage_method")
    private WeightageMethod weightageMethod = WeightageMethod.DAILY_PRODUCT;

    @Column(name = "last_profit_distribution_date")
    private LocalDate lastProfitDistributionDate;

    @Column(name = "last_profit_distribution_amount", precision = 18, scale = 4)
    private BigDecimal lastProfitDistributionAmount;

    @Builder.Default
    @Column(name = "cumulative_profit_received", precision = 18, scale = 4)
    private BigDecimal cumulativeProfitReceived = BigDecimal.ZERO;

    @Column(name = "indicative_profit_rate", precision = 8, scale = 4)
    private BigDecimal indicativeProfitRate;

    @Column(name = "profit_distribution_account_id")
    private Long profitDistributionAccountId;

    @Builder.Default
    @Column(name = "profit_reinvest")
    private boolean profitReinvest = true;

    @Builder.Default
    @Column(name = "loss_exposure")
    private boolean lossExposure = true;

    @Column(name = "loss_disclosure_accepted", nullable = false)
    private boolean lossDisclosureAccepted;

    @Column(name = "loss_disclosure_date")
    private LocalDate lossDisclosureDate;

    @Column(name = "maximum_loss_exposure", precision = 8, scale = 4)
    private BigDecimal maximumLossExposure;

    @Column(name = "tenor_days")
    private Integer tenorDays;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "maturity_instruction")
    private MudarabahMaturityInstruction maturityInstruction;

    @Builder.Default
    @Column(name = "rollover_count")
    private int rolloverCount = 0;

    @Builder.Default
    @Column(name = "zakat_applicable")
    private boolean zakatApplicable = true;

    @Column(name = "last_zakat_calculation_date")
    private LocalDate lastZakatCalculationDate;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Builder.Default
    @Column(name = "early_withdrawal_allowed")
    private boolean earlyWithdrawalAllowed = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "early_withdrawal_penalty")
    private EarlyWithdrawalPenalty earlyWithdrawalPenalty;

    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

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
