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
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "musharakah_applications", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahApplication extends AuditableEntity {

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
    @Column(name = "musharakah_type", nullable = false, length = 40)
    private MusharakahDomainEnums.MusharakahType musharakahType;

    @Column(name = "requested_financing_amount", precision = 18, scale = 2)
    private BigDecimal requestedFinancingAmount;

    @Column(name = "customer_equity_amount", precision = 18, scale = 2)
    private BigDecimal customerEquityAmount;

    @Column(name = "total_property_value", precision = 18, scale = 2)
    private BigDecimal totalPropertyValue;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "requested_tenor_months", nullable = false)
    private Integer requestedTenorMonths;

    @Column(name = "asset_description", nullable = false, columnDefinition = "TEXT")
    private String assetDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", nullable = false, length = 40)
    private MusharakahDomainEnums.AssetCategory assetCategory;

    @Column(name = "asset_address", columnDefinition = "TEXT")
    private String assetAddress;

    @Column(name = "estimated_asset_value", precision = 18, scale = 2)
    private BigDecimal estimatedAssetValue;

    @Column(name = "valuation_reference", length = 120)
    private String valuationReference;

    @Column(name = "monthly_income", precision = 18, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "existing_obligations", precision = 18, scale = 2)
    private BigDecimal existingObligations;

    @Column(name = "estimated_monthly_payment", precision = 18, scale = 2)
    private BigDecimal estimatedMonthlyPayment;

    @Column(name = "dsr", precision = 10, scale = 4)
    private BigDecimal dsr;

    @Column(name = "credit_score")
    private Integer creditScore;

    @Column(name = "proposed_bank_contribution", precision = 18, scale = 2)
    private BigDecimal proposedBankContribution;

    @Column(name = "proposed_customer_contribution", precision = 18, scale = 2)
    private BigDecimal proposedCustomerContribution;

    @Column(name = "proposed_bank_percentage", precision = 10, scale = 4)
    private BigDecimal proposedBankPercentage;

    @Column(name = "proposed_customer_percentage", precision = 10, scale = 4)
    private BigDecimal proposedCustomerPercentage;

    @Column(name = "proposed_rental_rate", precision = 10, scale = 4)
    private BigDecimal proposedRentalRate;

    @Column(name = "proposed_tenor_months")
    private Integer proposedTenorMonths;

    @Column(name = "proposed_units_total")
    private Integer proposedUnitsTotal;

    @Column(name = "proposed_profit_sharing_bank", precision = 10, scale = 4)
    private BigDecimal proposedProfitSharingBank;

    @Column(name = "proposed_profit_sharing_customer", precision = 10, scale = 4)
    private BigDecimal proposedProfitSharingCustomer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MusharakahDomainEnums.ApplicationStatus status;

    @Column(name = "assigned_officer_id")
    private Long assignedOfficerId;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
