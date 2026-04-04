package com.cbs.fees.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "islamic_fee_configurations", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicFeeConfiguration extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_fee_id")
    private Long baseFeeId;

    @Column(name = "fee_code", nullable = false, unique = true, length = 30)
    private String feeCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Column(name = "shariah_classification", nullable = false, length = 40)
    private String shariahClassification;

    @Column(name = "shariah_justification", columnDefinition = "TEXT")
    private String shariahJustification;

    @Column(name = "shariah_justification_ar", columnDefinition = "TEXT")
    private String shariahJustificationAr;

    @Column(name = "shariah_reference", length = 255)
    private String shariahReference;

    @Column(name = "ssb_approved", nullable = false)
    private boolean ssbApproved;

    @Column(name = "ssb_approval_date")
    private LocalDate ssbApprovalDate;

    @Column(name = "ssb_approval_ref", length = 100)
    private String ssbApprovalRef;

    @Column(name = "fee_type", nullable = false, length = 30)
    private String feeType;

    @Column(name = "flat_amount", precision = 18, scale = 2)
    private BigDecimal flatAmount;

    @Column(name = "percentage_rate", precision = 18, scale = 6)
    private BigDecimal percentageRate;

    @Column(name = "minimum_amount", precision = 18, scale = 2)
    private BigDecimal minimumAmount;

    @Column(name = "maximum_amount", precision = 18, scale = 2)
    private BigDecimal maximumAmount;

    @Column(name = "tier_decision_table_code", length = 120)
    private String tierDecisionTableCode;

    @Column(name = "formula_expression", columnDefinition = "TEXT")
    private String formulaExpression;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_contract_types", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> applicableContractTypes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_product_codes", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> applicableProductCodes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_transaction_types", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> applicableTransactionTypes = new ArrayList<>();

    @Column(name = "fee_category", nullable = false, length = 40)
    private String feeCategory;

    @Column(name = "charge_frequency", nullable = false, length = 20)
    private String chargeFrequency;

    @Column(name = "charge_timing", nullable = false, length = 20)
    private String chargeTiming;

    @Column(name = "income_gl_account", length = 20)
    private String incomeGlAccount;

    @Column(name = "is_charity_routed", nullable = false)
    private boolean charityRouted;

    @Column(name = "charity_gl_account", length = 20)
    private String charityGlAccount;

    @Column(name = "percentage_of_financing_prohibited", nullable = false)
    private boolean percentageOfFinancingProhibited;

    @Column(name = "compounding_prohibited", nullable = false)
    @lombok.Builder.Default
    private boolean compoundingProhibited = true;

    @Column(name = "maximum_as_percent_of_financing", precision = 10, scale = 4)
    private BigDecimal maximumAsPercentOfFinancing;

    @Column(name = "annual_penalty_cap_amount", precision = 18, scale = 2)
    private BigDecimal annualPenaltyCapAmount;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "tenant_id")
    private Long tenantId;

    public boolean isEffectiveOn(LocalDate date) {
        return date != null
                && (effectiveFrom == null || !date.isBefore(effectiveFrom))
                && (effectiveTo == null || !date.isAfter(effectiveTo));
    }
}
