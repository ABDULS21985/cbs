package com.cbs.wadiah.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "wadiah_account", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WadiahAccount extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false, unique = true)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "wadiah_type", nullable = false, length = 20)
    private WadiahDomainEnums.WadiahType wadiahType;

    @Column(name = "contract_reference", nullable = false, unique = true, length = 50)
    private String contractReference;

    @Column(name = "contract_signed_date")
    private LocalDate contractSignedDate;

    @Builder.Default
    @Column(name = "contract_version", nullable = false)
    private Integer contractVersion = 1;

    @Column(name = "islamic_product_template_id")
    private Long islamicProductTemplateId;

    @Builder.Default
    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode = "WADIAH";

    @Builder.Default
    @Column(name = "principal_guaranteed", nullable = false)
    private Boolean principalGuaranteed = true;

    @Builder.Default
    @Column(name = "profit_contractually_promised", nullable = false)
    private Boolean profitContractuallyPromised = false;

    @Builder.Default
    @Column(name = "hibah_eligible", nullable = false)
    private Boolean hibahEligible = false;

    @Builder.Default
    @Column(name = "hibah_disclosure_signed", nullable = false)
    private Boolean hibahDisclosureSigned = false;

    @Column(name = "hibah_disclosure_date")
    private LocalDate hibahDisclosureDate;

    @Builder.Default
    @Column(name = "minimum_balance", nullable = false, precision = 18, scale = 2)
    private BigDecimal minimumBalance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "cheque_book_enabled", nullable = false)
    private Boolean chequeBookEnabled = false;

    @Builder.Default
    @Column(name = "debit_card_enabled", nullable = false)
    private Boolean debitCardEnabled = false;

    @Builder.Default
    @Column(name = "standing_orders_enabled", nullable = false)
    private Boolean standingOrdersEnabled = false;

    @Builder.Default
    @Column(name = "sweep_enabled", nullable = false)
    private Boolean sweepEnabled = false;

    @Column(name = "sweep_target_account_id")
    private Long sweepTargetAccountId;

    @Column(name = "sweep_threshold", precision = 18, scale = 2)
    private BigDecimal sweepThreshold;

    @Builder.Default
    @Column(name = "online_banking_enabled", nullable = false)
    private Boolean onlineBankingEnabled = true;

    @Builder.Default
    @Column(name = "mobile_enabled", nullable = false)
    private Boolean mobileEnabled = true;

    @Builder.Default
    @Column(name = "ussd_enabled", nullable = false)
    private Boolean ussdEnabled = false;

    @Column(name = "last_hibah_distribution_date")
    private LocalDate lastHibahDistributionDate;

    @Builder.Default
    @Column(name = "total_hibah_received", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalHibahReceived = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "hibah_frequency_warning", nullable = false)
    private Boolean hibahFrequencyWarning = false;

    @Builder.Default
    @Column(name = "zakat_applicable", nullable = false)
    private Boolean zakatApplicable = true;

    @Column(name = "last_zakat_calculation_date")
    private LocalDate lastZakatCalculationDate;

    @Builder.Default
    @Column(name = "dormancy_exempt", nullable = false)
    private Boolean dormancyExempt = false;

    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "statement_frequency", nullable = false, length = 20)
    private WadiahDomainEnums.StatementFrequency statementFrequency = WadiahDomainEnums.StatementFrequency.MONTHLY;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_language", nullable = false, length = 10)
    private WadiahDomainEnums.PreferredLanguage preferredLanguage = WadiahDomainEnums.PreferredLanguage.EN;

    @Column(name = "tenant_id")
    private Long tenantId;
}
