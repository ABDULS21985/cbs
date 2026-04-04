package com.cbs.fees.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "fee_charge_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeeChargeLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fee_code", nullable = false, length = 30)
    private String feeCode;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "base_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "fee_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal feeAmount;

    @Column(name = "tax_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "trigger_event", nullable = false, length = 50)
    private String triggerEvent;

    @Column(name = "trigger_ref", length = 50)
    private String triggerRef;

    @Column(name = "trigger_amount", precision = 18, scale = 2)
    private BigDecimal triggerAmount;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "islamic_fee_configuration_id")
    private Long islamicFeeConfigurationId;

    @Column(name = "charity_routed", nullable = false)
    @Builder.Default
    private Boolean charityRouted = false;

    @Column(name = "charity_fund_entry_id")
    private Long charityFundEntryId;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "contract_type_code", length = 30)
    private String contractTypeCode;

    @Column(name = "installment_id")
    private Long installmentId;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "receivable_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal receivableBalance = BigDecimal.ZERO;

    @Column(name = "deferred_total_amount", precision = 18, scale = 2)
    private BigDecimal deferredTotalAmount;

    @Column(name = "deferred_remaining_amount", precision = 18, scale = 2)
    private BigDecimal deferredRemainingAmount;

    @Column(name = "recognised_deferred_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal recognisedDeferredAmount = BigDecimal.ZERO;

    @Column(name = "deferral_months")
    private Integer deferralMonths;

    @Column(name = "last_deferred_recognition_date")
    private java.time.LocalDate lastDeferredRecognitionDate;

    @Column(name = "was_waived", nullable = false)
    @Builder.Default
    private Boolean wasWaived = false;

    @Column(name = "waived_by", length = 100)
    private String waivedBy;

    @Column(name = "waiver_reason", length = 300)
    private String waiverReason;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "CHARGED";

    @Column(name = "charged_at", nullable = false)
    @Builder.Default
    private Instant chargedAt = Instant.now();

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
