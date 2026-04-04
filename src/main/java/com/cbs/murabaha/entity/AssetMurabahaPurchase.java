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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "asset_murabaha_purchases", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AssetMurabahaPurchase extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false, unique = true)
    private Long contractId;

    @Column(name = "purchase_ref", nullable = false, unique = true, length = 50)
    private String purchaseRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_category", nullable = false, length = 40)
    private MurabahaDomainEnums.AssetCategory assetCategory;

    @Column(name = "asset_description", nullable = false)
    private String assetDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "asset_specification", columnDefinition = "jsonb")
    private Map<String, Object> assetSpecification;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_or_used", nullable = false, length = 20)
    private MurabahaDomainEnums.AssetCondition newOrUsed;

    @Column(name = "supplier_name", nullable = false)
    private String supplierName;

    @Column(name = "supplier_registration_number", length = 80)
    private String supplierRegistrationNumber;

    @Column(name = "supplier_address")
    private String supplierAddress;

    @Column(name = "supplier_contact_person", length = 120)
    private String supplierContactPerson;

    @Column(name = "supplier_contact_phone", length = 40)
    private String supplierContactPhone;

    @Column(name = "supplier_bank_account", length = 120)
    private String supplierBankAccount;

    @Column(name = "supplier_quote_ref", nullable = false, length = 80)
    private String supplierQuoteRef;

    @Column(name = "supplier_quote_date", nullable = false)
    private LocalDate supplierQuoteDate;

    @Column(name = "supplier_quote_expiry")
    private LocalDate supplierQuoteExpiry;

    @Column(name = "supplier_quote_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal supplierQuoteAmount;

    @Column(name = "supplier_negotiated_price", precision = 18, scale = 2)
    private BigDecimal supplierNegotiatedPrice;

    @Column(name = "purchase_order_ref", length = 80)
    private String purchaseOrderRef;

    @Column(name = "purchase_order_date")
    private LocalDate purchaseOrderDate;

    @Column(name = "purchase_price", precision = 18, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "purchase_invoice_ref", length = 80)
    private String purchaseInvoiceRef;

    @Column(name = "purchase_invoice_date")
    private LocalDate purchaseInvoiceDate;

    @Column(name = "payment_to_supplier_date")
    private LocalDate paymentToSupplierDate;

    @Column(name = "payment_to_supplier_ref", length = 80)
    private String paymentToSupplierRef;

    @Column(name = "payment_to_supplier_journal_ref", length = 40)
    private String paymentToSupplierJournalRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "purchase_status", nullable = false, length = 20)
    private MurabahaDomainEnums.AssetPurchaseStatus purchaseStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "possession_type", length = 20)
    private MurabahaDomainEnums.PossessionType possessionType;

    @Column(name = "possession_date")
    private LocalDate possessionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "possession_evidence_type", length = 40)
    private MurabahaDomainEnums.OwnershipEvidenceType possessionEvidenceType;

    @Column(name = "possession_evidence_ref", length = 120)
    private String possessionEvidenceRef;

    @Column(name = "possession_evidence_document_path")
    private String possessionEvidenceDocumentPath;

    @Column(name = "possession_location")
    private String possessionLocation;

    @Column(name = "registered_in_bank_name", nullable = false)
    @lombok.Builder.Default
    private Boolean registeredInBankName = false;

    @Column(name = "bank_name_on_title", length = 200)
    private String bankNameOnTitle;

    @Column(name = "insurance_during_ownership", nullable = false)
    @lombok.Builder.Default
    private Boolean insuranceDuringOwnership = false;

    @Column(name = "insurance_policy_ref", length = 120)
    private String insurancePolicyRef;

    @Column(name = "insurance_provider", length = 200)
    private String insuranceProvider;

    @Column(name = "insurance_coverage_amount", precision = 18, scale = 2)
    private BigDecimal insuranceCoverageAmount;

    @Column(name = "risk_born_by_bank", nullable = false)
    @lombok.Builder.Default
    private Boolean riskBornByBank = false;

    @Column(name = "asset_inspected", nullable = false)
    @lombok.Builder.Default
    private Boolean assetInspected = false;

    @Column(name = "asset_inspection_date")
    private LocalDate assetInspectionDate;

    @Column(name = "asset_inspection_notes", columnDefinition = "TEXT")
    private String assetInspectionNotes;

    @Column(name = "ownership_verified", nullable = false)
    @lombok.Builder.Default
    private Boolean ownershipVerified = false;

    @Column(name = "ownership_verified_by", length = 100)
    private String ownershipVerifiedBy;

    @Column(name = "ownership_verified_at")
    private Instant ownershipVerifiedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "verification_checklist", columnDefinition = "jsonb")
    private List<Map<String, Object>> verificationChecklist;

    @Column(name = "transfer_to_customer_date")
    private LocalDate transferToCustomerDate;

    @Column(name = "transfer_document_ref", length = 120)
    private String transferDocumentRef;

    @Column(name = "asset_registered_to_customer", nullable = false)
    @lombok.Builder.Default
    private Boolean assetRegisteredToCustomer = false;

    @Column(name = "customer_acknowledgment_date")
    private LocalDate customerAcknowledgmentDate;

    @Column(name = "customer_acknowledgment_ref", length = 120)
    private String customerAcknowledgmentRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_status", nullable = false, length = 30)
    private MurabahaDomainEnums.AssetPurchaseOverallStatus overallStatus;

    @Column(name = "tenant_id")
    private Long tenantId;
}
