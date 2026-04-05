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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cross_border_payment_extension", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CrossBorderPaymentExtension extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false, unique = true)
    private Long paymentId;

    @Column(name = "swift_message_ref", length = 50)
    private String swiftMessageRef;

    @Column(name = "message_type", length = 20)
    private String messageType;

    @Column(name = "correspondent_bank_swift", length = 20)
    private String correspondentBankSwift;

    @Column(name = "correspondent_bank_name", length = 200)
    private String correspondentBankName;

    @Column(name = "beneficiary_bank_swift", length = 20)
    private String beneficiaryBankSwift;

    @Column(name = "beneficiary_bank_name", length = 200)
    private String beneficiaryBankName;

    @Column(name = "beneficiary_bank_country", length = 10)
    private String beneficiaryBankCountry;

    @Column(name = "field72_narrative", columnDefinition = "TEXT")
    private String field72Narrative;

    @Column(name = "islamic_purpose_code", length = 40)
    private String islamicPurposeCode;

    @Column(name = "regulatory_reporting_code", length = 40)
    private String regulatoryReportingCode;

    @Column(name = "correspondent_screened", nullable = false)
    private boolean correspondentScreened;

    @Enumerated(EnumType.STRING)
    @Column(name = "correspondent_screening_result", length = 20)
    private IslamicPaymentDomainEnums.PaymentScreeningResult correspondentScreeningResult;

    @Column(name = "beneficiary_bank_screened", nullable = false)
    private boolean beneficiaryBankScreened;

    @Enumerated(EnumType.STRING)
    @Column(name = "beneficiary_bank_screening_result", length = 20)
    private IslamicPaymentDomainEnums.PaymentScreeningResult beneficiaryBankScreeningResult;

    @Enumerated(EnumType.STRING)
    @Column(name = "charges_option", length = 10)
    private IslamicPaymentDomainEnums.ChargesOption chargesOption;

    @Column(name = "estimated_charges", precision = 18, scale = 2)
    private BigDecimal estimatedCharges;

    @Column(name = "actual_charges", precision = 18, scale = 2)
    private BigDecimal actualCharges;

    @Column(name = "charges_gl_ref", length = 50)
    private String chargesGlRef;

    @Column(name = "fx_required", nullable = false)
    private boolean fxRequired;

    @Column(name = "source_currency", length = 3)
    private String sourceCurrency;

    @Column(name = "destination_currency", length = 3)
    private String destinationCurrency;

    @Column(name = "fx_rate", precision = 18, scale = 8)
    private BigDecimal fxRate;

    @Column(name = "fx_spot_date")
    private LocalDate fxSpotDate;

    @Column(name = "fx_deal_ref", length = 50)
    private String fxDealRef;

    @Column(name = "fx_settlement_amount", precision = 18, scale = 2)
    private BigDecimal fxSettlementAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "swift_status", nullable = false, length = 20)
    private IslamicPaymentDomainEnums.SwiftStatus swiftStatus;

    @Column(name = "swift_status_timestamp")
    private LocalDateTime swiftStatusTimestamp;

    @Column(name = "swift_tracking_url", length = 255)
    private String swiftTrackingUrl;

    @Column(name = "tenant_id")
    private Long tenantId;
}
