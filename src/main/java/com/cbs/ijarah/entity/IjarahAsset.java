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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "ijarah_assets", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahAsset extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_ref", nullable = false, unique = true, length = 50)
    private String assetRef;

    @Column(name = "ijarah_contract_id", nullable = false, unique = true)
    private Long ijarahContractId;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", nullable = false, length = 40)
    private IjarahDomainEnums.AssetCategory assetCategory;

    @Column(name = "asset_description", nullable = false, columnDefinition = "TEXT")
    private String assetDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detailed_specification", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private Map<String, Object> detailedSpecification = new HashMap<>();

    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;

    @Column(name = "acquisition_cost", nullable = false, precision = 18, scale = 2)
    private BigDecimal acquisitionCost;

    @Enumerated(EnumType.STRING)
    @Column(name = "acquisition_method", length = 30)
    private IjarahDomainEnums.AssetAcquisitionMethod acquisitionMethod;

    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    @Column(name = "supplier_invoice_ref", length = 120)
    private String supplierInvoiceRef;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "registered_owner", nullable = false, length = 255)
    private String registeredOwner;

    @Column(name = "registration_number", length = 120)
    private String registrationNumber;

    @Column(name = "registration_authority", length = 200)
    private String registrationAuthority;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

    @Column(name = "ownership_evidence_ref", length = 120)
    private String ownershipEvidenceRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "depreciation_method", nullable = false, length = 30)
    private IjarahDomainEnums.DepreciationMethod depreciationMethod;

    @Column(name = "useful_life_months", nullable = false)
    private Integer usefulLifeMonths;

    @Column(name = "residual_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal residualValue;

    @Column(name = "depreciable_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal depreciableAmount;

    @Column(name = "monthly_depreciation", nullable = false, precision = 18, scale = 2)
    private BigDecimal monthlyDepreciation;

    @Column(name = "accumulated_depreciation", nullable = false, precision = 18, scale = 2)
    @lombok.Builder.Default
    private BigDecimal accumulatedDepreciation = BigDecimal.ZERO;

    @Column(name = "net_book_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal netBookValue;

    @Column(name = "last_depreciation_date")
    private LocalDate lastDepreciationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_condition", length = 20)
    private IjarahDomainEnums.AssetCondition currentCondition;

    @Column(name = "last_inspection_date")
    private LocalDate lastInspectionDate;

    @Column(name = "last_inspection_notes", columnDefinition = "TEXT")
    private String lastInspectionNotes;

    @Column(name = "next_inspection_due_date")
    private LocalDate nextInspectionDueDate;

    @Column(name = "insured", nullable = false)
    @lombok.Builder.Default
    private Boolean insured = false;

    @Column(name = "insurance_policy_ref", length = 120)
    private String insurancePolicyRef;

    @Column(name = "insurance_provider", length = 200)
    private String insuranceProvider;

    @Column(name = "insurance_coverage_amount", precision = 18, scale = 2)
    private BigDecimal insuranceCoverageAmount;

    @Column(name = "insurance_premium_annual", precision = 18, scale = 2)
    private BigDecimal insurancePremiumAnnual;

    @Column(name = "insurance_expiry_date")
    private LocalDate insuranceExpiryDate;

    @Column(name = "total_maintenance_cost", nullable = false, precision = 18, scale = 2)
    @lombok.Builder.Default
    private BigDecimal totalMaintenanceCost = BigDecimal.ZERO;

    @Column(name = "last_maintenance_date")
    private LocalDate lastMaintenanceDate;

    @Column(name = "next_maintenance_due_date")
    private LocalDate nextMaintenanceDueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IjarahDomainEnums.AssetStatus status;

    @Column(name = "leased_to_customer_id")
    private Long leasedToCustomerId;

    @Column(name = "leased_under", length = 50)
    private String leasedUnder;

    @Column(name = "disposal_date")
    private LocalDate disposalDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "disposal_method", length = 30)
    private IjarahDomainEnums.DisposalMethod disposalMethod;

    @Column(name = "disposal_proceeds", precision = 18, scale = 2)
    private BigDecimal disposalProceeds;

    @Column(name = "disposal_journal_ref", length = 40)
    private String disposalJournalRef;

    @Column(name = "last_valuation_date")
    private LocalDate lastValuationDate;

    @Column(name = "last_valuation_amount", precision = 18, scale = 2)
    private BigDecimal lastValuationAmount;

    @Column(name = "valuation_method", length = 120)
    private String valuationMethod;

    @Column(name = "appraiser_name", length = 200)
    private String appraiserName;

    @Column(name = "tenant_id")
    private Long tenantId;
}
