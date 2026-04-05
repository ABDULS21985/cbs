package com.cbs.murabaha.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "murabaha_contracts", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MurabahaContract extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
    @Column(name = "murabahah_type", nullable = false, length = 40)
    private MurabahaDomainEnums.MurabahahType murabahahType;

    @Column(name = "asset_description")
    private String assetDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", length = 40)
    private MurabahaDomainEnums.AssetCategory assetCategory;

    @Column(name = "asset_serial_number", length = 120)
    private String assetSerialNumber;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "commodity_broker")
    private String commodityBroker;

    @Column(name = "commodity_type", length = 60)
    private String commodityType;

    @Column(name = "commodity_quantity", precision = 18, scale = 6)
    private BigDecimal commodityQuantity;

    @Column(name = "commodity_unit", length = 20)
    private String commodityUnit;

    @Column(name = "cost_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "markup_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal markupRate;

    @Column(name = "markup_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal markupAmount;

    @Column(name = "selling_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "selling_price_locked_at")
    private Instant sellingPriceLockedAt;

    @Column(name = "selling_price_locked", nullable = false)
    @lombok.Builder.Default
    private Boolean sellingPriceLocked = false;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "down_payment", precision = 18, scale = 2)
    private BigDecimal downPayment;

    @Column(name = "financed_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal financedAmount;

    @Column(name = "tenor_months", nullable = false)
    private Integer tenorMonths;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "first_installment_date")
    private LocalDate firstInstallmentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "repayment_frequency", length = 20)
    private MurabahaDomainEnums.RepaymentFrequency repaymentFrequency;

    @Column(name = "total_deferred_profit", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalDeferredProfit;

    @Column(name = "recognised_profit", nullable = false, precision = 18, scale = 2)
    private BigDecimal recognisedProfit;

    @Column(name = "unrecognised_profit", nullable = false, precision = 18, scale = 2)
    private BigDecimal unrecognisedProfit;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_recognition_method", nullable = false, length = 40)
    private MurabahaDomainEnums.ProfitRecognitionMethod profitRecognitionMethod;

    @Column(name = "profit_recognition_suspended", nullable = false)
    @lombok.Builder.Default
    private Boolean profitRecognitionSuspended = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ownership_sequence", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<Map<String, Object>> ownershipSequence = new ArrayList<>();

    @Column(name = "ownership_verified", nullable = false)
    @lombok.Builder.Default
    private Boolean ownershipVerified = false;

    @Column(name = "ownership_verified_by", length = 100)
    private String ownershipVerifiedBy;

    @Column(name = "ownership_verified_at")
    private Instant ownershipVerifiedAt;

    @Column(name = "grace_period_days")
    private Integer gracePeriodDays;

    @Column(name = "late_penalty_rate", precision = 10, scale = 4)
    private BigDecimal latePenaltyRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "late_penalty_method", length = 30)
    private MurabahaDomainEnums.LatePenaltyMethod latePenaltyMethod;

    @Column(name = "late_penalties_to_charity", nullable = false)
    @lombok.Builder.Default
    private Boolean latePenaltiesToCharity = true;

    @Column(name = "total_late_penalties_charged", nullable = false, precision = 18, scale = 2)
    @lombok.Builder.Default
    private BigDecimal totalLatePenaltiesCharged = BigDecimal.ZERO;

    @Column(name = "total_charity_donations", nullable = false, precision = 18, scale = 2)
    @lombok.Builder.Default
    private BigDecimal totalCharityDonations = BigDecimal.ZERO;

    @Column(name = "early_settlement_allowed", nullable = false)
    @lombok.Builder.Default
    private Boolean earlySettlementAllowed = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "early_settlement_rebate_method", length = 30)
    private MurabahaDomainEnums.EarlySettlementRebateMethod earlySettlementRebateMethod;

    @Column(name = "early_settled_at")
    private LocalDate earlySettledAt;

    @Column(name = "early_settlement_amount", precision = 18, scale = 2)
    private BigDecimal earlySettlementAmount;

    @Column(name = "ibra_amount", precision = 18, scale = 2)
    private BigDecimal ibraAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MurabahaDomainEnums.ContractStatus status;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "investment_pool_id")
    private Long investmentPoolId;

    @Column(name = "pool_asset_assignment_id")
    private Long poolAssetAssignmentId;

    @Column(name = "takaful_required", nullable = false)
    @lombok.Builder.Default
    private Boolean takafulRequired = false;

    @Column(name = "takaful_policy_ref", length = 120)
    private String takafulPolicyRef;

    @Column(name = "takaful_provider", length = 200)
    private String takafulProvider;

    @Column(name = "collateral_required", nullable = false)
    @lombok.Builder.Default
    private Boolean collateralRequired = false;

    @Column(name = "collateral_description", columnDefinition = "TEXT")
    private String collateralDescription;

    @Column(name = "collateral_value", precision = 18, scale = 2)
    private BigDecimal collateralValue;

    @Column(name = "settlement_account_id")
    private Long settlementAccountId;

    @Column(name = "impairment_provision_balance", nullable = false, precision = 18, scale = 2)
    @lombok.Builder.Default
    private BigDecimal impairmentProvisionBalance = BigDecimal.ZERO;

    @Column(name = "last_profit_recognition_date")
    private LocalDate lastProfitRecognitionDate;

    @Version
    private Long version;

    @Column(name = "tenant_id")
    private Long tenantId;

    public void appendOwnershipEvent(Map<String, Object> event) {
        if (ownershipSequence == null) {
            ownershipSequence = new ArrayList<>();
        }
        ownershipSequence.add(event);
    }
}
