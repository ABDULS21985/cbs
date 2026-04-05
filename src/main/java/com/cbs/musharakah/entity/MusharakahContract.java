package com.cbs.musharakah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "musharakah_contracts", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahContract extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @Column(name = "contract_ref", nullable = false, unique = true, length = 50)
    private String contractRef;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "account_id")
    private Long accountId;

    @Column(name = "islamic_product_template_id", nullable = false)
    private Long islamicProductTemplateId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "musharakah_type", nullable = false, length = 40)
    private MusharakahDomainEnums.MusharakahType musharakahType;

    @Column(name = "asset_description", columnDefinition = "TEXT")
    private String assetDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", length = 40)
    private MusharakahDomainEnums.AssetCategory assetCategory;

    @Column(name = "asset_address", columnDefinition = "TEXT")
    private String assetAddress;

    @Column(name = "asset_title_deed_ref", length = 120)
    private String assetTitleDeedRef;

    @Column(name = "asset_purchase_price", precision = 18, scale = 2)
    private BigDecimal assetPurchasePrice;

    @Column(name = "asset_current_market_value", precision = 18, scale = 2)
    private BigDecimal assetCurrentMarketValue;

    @Column(name = "asset_last_valuation_date")
    private LocalDate assetLastValuationDate;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "bank_capital_contribution", precision = 18, scale = 2)
    private BigDecimal bankCapitalContribution;

    @Column(name = "customer_capital_contribution", precision = 18, scale = 2)
    private BigDecimal customerCapitalContribution;

    @Column(name = "total_capital", precision = 18, scale = 2)
    private BigDecimal totalCapital;

    @Column(name = "total_ownership_units")
    private Integer totalOwnershipUnits;

    @Column(name = "bank_current_units", precision = 19, scale = 4)
    private BigDecimal bankCurrentUnits;

    @Column(name = "customer_current_units", precision = 19, scale = 4)
    private BigDecimal customerCurrentUnits;

    @Column(name = "bank_ownership_percentage", precision = 10, scale = 4)
    private BigDecimal bankOwnershipPercentage;

    @Column(name = "customer_ownership_percentage", precision = 10, scale = 4)
    private BigDecimal customerOwnershipPercentage;

    @Column(name = "unit_value", precision = 18, scale = 6)
    private BigDecimal unitValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_pricing_method", length = 30)
    private MusharakahDomainEnums.UnitPricingMethod unitPricingMethod;

    @Column(name = "profit_sharing_ratio_bank", precision = 10, scale = 4)
    private BigDecimal profitSharingRatioBank;

    @Column(name = "profit_sharing_ratio_customer", precision = 10, scale = 4)
    private BigDecimal profitSharingRatioCustomer;

    @Enumerated(EnumType.STRING)
    @Column(name = "loss_sharing_method", length = 30)
    private MusharakahDomainEnums.LossSharingMethod lossSharingMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_frequency", length = 20)
    private MusharakahDomainEnums.RentalFrequency rentalFrequency;

    @Column(name = "base_rental_rate", precision = 10, scale = 4)
    private BigDecimal baseRentalRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_rate_type", length = 30)
    private MusharakahDomainEnums.RentalRateType rentalRateType;

    @Column(name = "rental_benchmark", length = 40)
    private String rentalBenchmark;

    @Column(name = "rental_margin", precision = 10, scale = 4)
    private BigDecimal rentalMargin;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_review_frequency", length = 20)
    private MusharakahDomainEnums.RentalReviewFrequency rentalReviewFrequency;

    @Column(name = "next_rental_review_date")
    private LocalDate nextRentalReviewDate;

    @Column(name = "total_rental_expected", precision = 18, scale = 2)
    private BigDecimal totalRentalExpected;

    @Column(name = "total_rental_received", precision = 18, scale = 2)
    private BigDecimal totalRentalReceived;

    @Enumerated(EnumType.STRING)
    @Column(name = "buyout_frequency", length = 20)
    private MusharakahDomainEnums.BuyoutFrequency buyoutFrequency;

    @Column(name = "units_per_buyout")
    private Integer unitsPerBuyout;

    @Column(name = "units_per_buyout_decimal", precision = 19, scale = 4)
    private BigDecimal unitsPerBuyoutDecimal;

    @Column(name = "total_buyout_payments_expected", precision = 18, scale = 2)
    private BigDecimal totalBuyoutPaymentsExpected;

    @Column(name = "total_buyout_payments_received", precision = 18, scale = 2)
    private BigDecimal totalBuyoutPaymentsReceived;

    @Column(name = "tenor_months")
    private Integer tenorMonths;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "first_payment_date")
    private LocalDate firstPaymentDate;

    @Column(name = "estimated_monthly_payment", precision = 18, scale = 2)
    private BigDecimal estimatedMonthlyPayment;

    @Column(name = "grace_period_days")
    private Integer gracePeriodDays;

    @Column(name = "late_penalty_to_charity", nullable = false)
    @lombok.Builder.Default
    private Boolean latePenaltyToCharity = true;

    @Column(name = "total_late_penalties", precision = 18, scale = 2)
    private BigDecimal totalLatePenalties;

    @Column(name = "total_charity_donations", precision = 18, scale = 2)
    private BigDecimal totalCharityDonations;

    @Enumerated(EnumType.STRING)
    @Column(name = "insurance_responsibility", length = 20)
    private MusharakahDomainEnums.InsuranceResponsibility insuranceResponsibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "major_maintenance_sharing", length = 40)
    private MusharakahDomainEnums.MajorMaintenanceSharing majorMaintenanceSharing;

    @Column(name = "current_insurance_policy_ref", length = 120)
    private String currentInsurancePolicyRef;

    @Column(name = "current_insurance_expiry")
    private LocalDate currentInsuranceExpiry;

    @Column(name = "early_buyout_allowed", nullable = false)
    @lombok.Builder.Default
    private Boolean earlyBuyoutAllowed = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "early_buyout_pricing_method", length = 30)
    private MusharakahDomainEnums.EarlyBuyoutPricingMethod earlyBuyoutPricingMethod;

    @Column(name = "early_buyout_date")
    private LocalDate earlyBuyoutDate;

    @Column(name = "early_buyout_amount", precision = 18, scale = 2)
    private BigDecimal earlyBuyoutAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MusharakahDomainEnums.ContractStatus status;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "fully_bought_out_at")
    private LocalDate fullyBoughtOutAt;

    @Column(name = "dissolved_at")
    private LocalDate dissolvedAt;

    @Column(name = "investment_pool_id")
    private Long investmentPoolId;

    @Column(name = "pool_asset_assignment_id")
    private Long poolAssetAssignmentId;

    @Column(name = "last_screening_ref", length = 50)
    private String lastScreeningRef;

    @Column(name = "tenant_id")
    private Long tenantId;
}
