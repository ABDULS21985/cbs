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
@Table(name = "ijarah_transfer_mechanisms", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahTransferMechanism extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transfer_ref", nullable = false, unique = true, length = 50)
    private String transferRef;

    @Column(name = "ijarah_contract_id", nullable = false, unique = true)
    private Long ijarahContractId;

    @Column(name = "ijarah_contract_ref", nullable = false, length = 50)
    private String ijarahContractRef;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type", nullable = false, length = 30)
    private IjarahDomainEnums.TransferType transferType;

    @Column(name = "transfer_description", nullable = false, columnDefinition = "TEXT")
    private String transferDescription;

    @Column(name = "transfer_description_ar", nullable = false, columnDefinition = "TEXT")
    private String transferDescriptionAr;

    @Column(name = "is_separate_document", nullable = false)
    private Boolean isSeparateDocument;

    @Column(name = "document_date", nullable = false)
    private LocalDate documentDate;

    @Column(name = "document_reference", nullable = false, length = 100)
    private String documentReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 30)
    private IjarahDomainEnums.TransferDocumentType documentType;

    @Column(name = "signed_by_bank", nullable = false)
    @lombok.Builder.Default
    private Boolean signedByBank = false;

    @Column(name = "signed_by_bank_date")
    private LocalDate signedByBankDate;

    @Column(name = "signed_by_bank_representative", length = 100)
    private String signedByBankRepresentative;

    @Column(name = "signed_by_customer", nullable = false)
    @lombok.Builder.Default
    private Boolean signedByCustomer = false;

    @Column(name = "signed_by_customer_date")
    private LocalDate signedByCustomerDate;

    @Column(name = "gift_condition", columnDefinition = "TEXT")
    private String giftCondition;

    @Column(name = "gift_effective_date")
    private LocalDate giftEffectiveDate;

    @Column(name = "nominal_sale_price", precision = 18, scale = 2)
    private BigDecimal nominalSalePrice;

    @Column(name = "sale_currency", length = 3)
    private String saleCurrency;

    @Column(name = "sale_condition", columnDefinition = "TEXT")
    private String saleCondition;

    @Column(name = "fair_value_determination_method", length = 255)
    private String fairValueDeterminationMethod;

    @Column(name = "fair_value_appraiser", length = 120)
    private String fairValueAppraiser;

    @Column(name = "estimated_fair_value", precision = 18, scale = 2)
    private BigDecimal estimatedFairValue;

    @Column(name = "actual_fair_value", precision = 18, scale = 2)
    private BigDecimal actualFairValue;

    @Column(name = "actual_fair_value_date")
    private LocalDate actualFairValueDate;

    @Column(name = "total_transfer_units")
    private Integer totalTransferUnits;

    @Column(name = "units_transferred_to_date")
    private Integer unitsTransferredToDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_transfer_frequency", length = 20)
    private IjarahDomainEnums.UnitTransferFrequency unitTransferFrequency;

    @Column(name = "unit_transfer_amount", precision = 18, scale = 2)
    private BigDecimal unitTransferAmount;

    @Column(name = "next_unit_transfer_date")
    private LocalDate nextUnitTransferDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IjarahDomainEnums.TransferStatus status;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "title_transfer_date")
    private LocalDate titleTransferDate;

    @Column(name = "title_transfer_doc_ref", length = 120)
    private String titleTransferDocRef;

    @Column(name = "registration_authority", length = 120)
    private String registrationAuthority;

    @Column(name = "new_registration_number", length = 120)
    private String newRegistrationNumber;

    @Column(name = "asset_condition_at_transfer", columnDefinition = "TEXT")
    private String assetConditionAtTransfer;

    @Column(name = "customer_acknowledgment", nullable = false)
    @lombok.Builder.Default
    private Boolean customerAcknowledgment = false;

    @Column(name = "customer_acknowledgment_date")
    private LocalDate customerAcknowledgmentDate;

    @Column(name = "transfer_journal_ref", length = 40)
    private String transferJournalRef;

    @Column(name = "asset_net_book_value_at_transfer", precision = 18, scale = 2)
    private BigDecimal assetNetBookValueAtTransfer;

    @Column(name = "gain_loss_on_transfer", precision = 18, scale = 2)
    private BigDecimal gainLossOnTransfer;

    @Column(name = "tenant_id")
    private Long tenantId;
}
