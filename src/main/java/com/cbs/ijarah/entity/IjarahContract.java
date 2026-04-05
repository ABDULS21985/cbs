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
import java.time.LocalDate;

@Entity
@Table(name = "ijarah_contracts", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahContract extends AuditableEntity {

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
    @Column(name = "ijarah_type", nullable = false, length = 40)
    private IjarahDomainEnums.IjarahType ijarahType;

    @Column(name = "ijarah_asset_id")
    private Long ijarahAssetId;

    @Column(name = "asset_description", columnDefinition = "TEXT")
    private String assetDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", length = 40)
    private IjarahDomainEnums.AssetCategory assetCategory;

    @Column(name = "asset_serial_number", length = 120)
    private String assetSerialNumber;

    @Column(name = "asset_location", columnDefinition = "TEXT")
    private String assetLocation;

    @Column(name = "asset_acquisition_cost", precision = 18, scale = 2)
    private BigDecimal assetAcquisitionCost;

    @Column(name = "asset_fair_value_at_inception", precision = 18, scale = 2)
    private BigDecimal assetFairValueAtInception;

    @Column(name = "asset_residual_value", precision = 18, scale = 2)
    private BigDecimal assetResidualValue;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "lease_start_date")
    private LocalDate leaseStartDate;

    @Column(name = "lease_end_date")
    private LocalDate leaseEndDate;

    @Column(name = "tenor_months")
    private Integer tenorMonths;

    @Column(name = "total_lease_periods")
    private Integer totalLeasePeriods;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_frequency", length = 20)
    private IjarahDomainEnums.RentalFrequency rentalFrequency;

    @Column(name = "base_rental_amount", precision = 18, scale = 2)
    private BigDecimal baseRentalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_type", length = 20)
    private IjarahDomainEnums.RentalType rentalType;

    @Column(name = "variable_rental_benchmark", length = 40)
    private String variableRentalBenchmark;

    @Column(name = "variable_rental_margin", precision = 10, scale = 4)
    private BigDecimal variableRentalMargin;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_review_frequency", length = 20)
    private IjarahDomainEnums.RentalReviewFrequency rentalReviewFrequency;

    @Column(name = "next_rental_review_date")
    private LocalDate nextRentalReviewDate;

    @Column(name = "rental_escalation_rate", precision = 10, scale = 4)
    private BigDecimal rentalEscalationRate;

    @Column(name = "advance_rentals")
    private Integer advanceRentals;

    @Column(name = "advance_rental_amount", precision = 18, scale = 2)
    private BigDecimal advanceRentalAmount;

    @Column(name = "security_deposit", precision = 18, scale = 2)
    private BigDecimal securityDeposit;

    @Column(name = "total_rentals_expected", precision = 18, scale = 2)
    private BigDecimal totalRentalsExpected;

    @Column(name = "total_rentals_received", precision = 18, scale = 2)
    private BigDecimal totalRentalsReceived;

    @Column(name = "total_rental_arrears", precision = 18, scale = 2)
    private BigDecimal totalRentalArrears;

    @Column(name = "bank_return_on_asset", precision = 10, scale = 4)
    private BigDecimal bankReturnOnAsset;

    @Column(name = "asset_owned_by_bank", nullable = false)
    @lombok.Builder.Default
    private Boolean assetOwnedByBank = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "insurance_responsibility", length = 30)
    private IjarahDomainEnums.InsuranceResponsibility insuranceResponsibility;

    @Column(name = "insurance_policy_ref", length = 120)
    private String insurancePolicyRef;

    @Column(name = "insurance_provider", length = 200)
    private String insuranceProvider;

    @Column(name = "insurance_coverage_amount", precision = 18, scale = 2)
    private BigDecimal insuranceCoverageAmount;

    @Column(name = "insurance_expiry_date")
    private LocalDate insuranceExpiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "major_maintenance_responsibility", length = 20)
    private IjarahDomainEnums.MajorMaintenanceResponsibility majorMaintenanceResponsibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "minor_maintenance_responsibility", length = 20)
    private IjarahDomainEnums.MinorMaintenanceResponsibility minorMaintenanceResponsibility;

    @Column(name = "last_major_maintenance_date")
    private LocalDate lastMajorMaintenanceDate;

    @Column(name = "next_major_maintenance_due_date")
    private LocalDate nextMajorMaintenanceDueDate;

    @Column(name = "grace_period_days")
    private Integer gracePeriodDays;

    @Column(name = "late_penalty_applicable", nullable = false)
    @lombok.Builder.Default
    private Boolean latePenaltyApplicable = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "late_penalty_method", length = 30)
    @lombok.Builder.Default
    private IjarahDomainEnums.LatePenaltyMethod latePenaltyMethod = IjarahDomainEnums.LatePenaltyMethod.PERCENTAGE_OF_OVERDUE;

    @Column(name = "late_penalty_to_charity", nullable = false)
    @lombok.Builder.Default
    private Boolean latePenaltyToCharity = true;

    @Column(name = "total_late_penalties", precision = 18, scale = 2)
    private BigDecimal totalLatePenalties;

    @Column(name = "total_charity_from_late_penalties", precision = 18, scale = 2)
    private BigDecimal totalCharityFromLatePenalties;

    @Column(name = "imb_transfer_mechanism_id")
    private Long imbTransferMechanismId;

    @Enumerated(EnumType.STRING)
    @Column(name = "imb_transfer_type", length = 30)
    private IjarahDomainEnums.TransferType imbTransferType;

    @Column(name = "imb_transfer_scheduled", nullable = false)
    @lombok.Builder.Default
    private Boolean imbTransferScheduled = false;

    @Column(name = "imb_transfer_completed", nullable = false)
    @lombok.Builder.Default
    private Boolean imbTransferCompleted = false;

    @Column(name = "imb_transfer_date")
    private LocalDate imbTransferDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IjarahDomainEnums.ContractStatus status;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "terminated_at")
    private LocalDate terminatedAt;

    @Column(name = "termination_reason", columnDefinition = "TEXT")
    private String terminationReason;

    @Column(name = "investment_pool_id")
    private Long investmentPoolId;

    @Column(name = "pool_asset_assignment_id")
    private Long poolAssetAssignmentId;

    @Column(name = "last_screening_ref", length = 50)
    private String lastScreeningRef;

    @Column(name = "tenant_id")
    private Long tenantId;
}
