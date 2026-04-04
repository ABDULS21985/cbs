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
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "murabaha_applications", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MurabahaApplication extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_ref", nullable = false, unique = true, length = 50)
    private String applicationRef;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "murabahah_type", nullable = false, length = 40)
    private MurabahaDomainEnums.MurabahahType murabahahType;

    @Column(name = "requested_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "requested_tenor_months", nullable = false)
    private Integer requestedTenorMonths;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private MurabahaDomainEnums.Purpose purpose;

    @Column(name = "purpose_description", columnDefinition = "TEXT")
    private String purposeDescription;

    @Column(name = "asset_description")
    private String assetDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", length = 40)
    private MurabahaDomainEnums.AssetCategory assetCategory;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "supplier_quote_amount", precision = 18, scale = 2)
    private BigDecimal supplierQuoteAmount;

    @Column(name = "supplier_quote_ref", length = 100)
    private String supplierQuoteRef;

    @Column(name = "supplier_quote_expiry")
    private LocalDate supplierQuoteExpiry;

    @Column(name = "monthly_income", precision = 18, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "existing_financing_obligations", precision = 18, scale = 2)
    private BigDecimal existingFinancingObligations;

    @Column(name = "dsr", precision = 10, scale = 4)
    private BigDecimal dsr;

    @Column(name = "dsr_limit", precision = 10, scale = 4)
    private BigDecimal dsrLimit;

    @Column(name = "credit_score")
    private Integer creditScore;

    @Column(name = "credit_assessment_notes", columnDefinition = "TEXT")
    private String creditAssessmentNotes;

    @Column(name = "credit_assessment_by", length = 100)
    private String creditAssessmentBy;

    @Column(name = "credit_assessment_at")
    private Instant creditAssessmentAt;

    @Column(name = "proposed_cost_price", precision = 18, scale = 2)
    private BigDecimal proposedCostPrice;

    @Column(name = "proposed_markup_rate", precision = 10, scale = 4)
    private BigDecimal proposedMarkupRate;

    @Column(name = "proposed_selling_price", precision = 18, scale = 2)
    private BigDecimal proposedSellingPrice;

    @Column(name = "proposed_down_payment", precision = 18, scale = 2)
    private BigDecimal proposedDownPayment;

    @Column(name = "proposed_tenor_months")
    private Integer proposedTenorMonths;

    @Column(name = "proposed_installment_amount", precision = 18, scale = 2)
    private BigDecimal proposedInstallmentAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MurabahaDomainEnums.ApplicationStatus status;

    @Column(name = "current_step", length = 60)
    private String currentStep;

    @Column(name = "assigned_officer_id")
    private Long assignedOfficerId;

    @Column(name = "branch_id")
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private MurabahaDomainEnums.ApplicationChannel channel;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approved_amount", precision = 18, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "approved_tenor_months")
    private Integer approvedTenorMonths;

    @Column(name = "approved_markup_rate", precision = 10, scale = 4)
    private BigDecimal approvedMarkupRate;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "contract_ref", length = 50)
    private String contractRef;

    @Column(name = "settlement_account_id")
    private Long settlementAccountId;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
