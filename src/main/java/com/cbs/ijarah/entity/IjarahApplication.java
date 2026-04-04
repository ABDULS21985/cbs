package com.cbs.ijarah.entity;

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
@Table(name = "ijarah_applications", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahApplication extends AuditableEntity {

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
    @Column(name = "ijarah_type", nullable = false, length = 40)
    private IjarahDomainEnums.IjarahType ijarahType;

    @Column(name = "requested_asset_description", columnDefinition = "TEXT")
    private String requestedAssetDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_asset_category", length = 40)
    private IjarahDomainEnums.AssetCategory requestedAssetCategory;

    @Column(name = "estimated_asset_cost", nullable = false, precision = 18, scale = 2)
    private BigDecimal estimatedAssetCost;

    @Column(name = "requested_tenor_months", nullable = false)
    private Integer requestedTenorMonths;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", length = 30)
    private IjarahDomainEnums.Purpose purpose;

    @Column(name = "monthly_income", precision = 18, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "existing_obligations", precision = 18, scale = 2)
    private BigDecimal existingObligations;

    @Column(name = "proposed_monthly_rental", precision = 18, scale = 2)
    private BigDecimal proposedMonthlyRental;

    @Column(name = "dsr_with_proposed_rental", precision = 10, scale = 4)
    private BigDecimal dsrWithProposedRental;

    @Column(name = "credit_score")
    private Integer creditScore;

    @Column(name = "proposed_rental_amount", precision = 18, scale = 2)
    private BigDecimal proposedRentalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "proposed_rental_frequency", length = 20)
    private IjarahDomainEnums.RentalFrequency proposedRentalFrequency;

    @Column(name = "proposed_advance_rentals")
    private Integer proposedAdvanceRentals;

    @Column(name = "proposed_security_deposit", precision = 18, scale = 2)
    private BigDecimal proposedSecurityDeposit;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IjarahDomainEnums.ApplicationStatus status;

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
