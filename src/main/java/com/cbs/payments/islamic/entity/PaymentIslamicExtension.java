package com.cbs.payments.islamic.entity;

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

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_islamic_extension", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentIslamicExtension extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false, unique = true)
    private Long paymentId;

    @Column(name = "shariah_screened", nullable = false)
    private boolean shariahScreened;

    @Column(name = "shariah_screening_ref", length = 50)
    private String shariahScreeningRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "shariah_screening_result", length = 20)
    private IslamicPaymentDomainEnums.PaymentScreeningResult shariahScreeningResult;

    @Column(name = "shariah_screened_at")
    private LocalDateTime shariahScreenedAt;

    @Column(name = "merchant_category_code", length = 10)
    private String merchantCategoryCode;

    @Column(name = "merchant_name", length = 200)
    private String merchantName;

    @Column(name = "merchant_country", length = 10)
    private String merchantCountry;

    @Column(name = "is_haram_mcc", nullable = false)
    private boolean isHaramMcc;

    @Column(name = "counterparty_on_exclusion_list", nullable = false)
    private boolean counterpartyOnExclusionList;

    @Column(name = "exclusion_list_match_details", columnDefinition = "TEXT")
    private String exclusionListMatchDetails;

    @Column(name = "source_account_is_islamic", nullable = false)
    private boolean sourceAccountIsIslamic;

    @Column(name = "source_contract_type_code", length = 30)
    private String sourceContractTypeCode;

    @Column(name = "source_product_code", length = 30)
    private String sourceProductCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_purpose", length = 40)
    private IslamicPaymentDomainEnums.PaymentPurpose paymentPurpose;

    @Column(name = "purpose_description", columnDefinition = "TEXT")
    private String purposeDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "shariah_purpose_flag", length = 30)
    private IslamicPaymentDomainEnums.ShariahPurposeFlag shariahPurposeFlag;

    @Column(name = "islamic_transaction_code", length = 50)
    private String islamicTransactionCode;

    @Column(name = "aaoifi_reporting_category", length = 100)
    private String aaoifiReportingCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "compliance_action_taken", length = 30)
    private IslamicPaymentDomainEnums.PaymentComplianceAction complianceActionTaken;

    @Column(name = "manual_override_by", length = 100)
    private String manualOverrideBy;

    @Column(name = "manual_override_reason", columnDefinition = "TEXT")
    private String manualOverrideReason;

    @Column(name = "manual_override_approved_by", length = 100)
    private String manualOverrideApprovedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
