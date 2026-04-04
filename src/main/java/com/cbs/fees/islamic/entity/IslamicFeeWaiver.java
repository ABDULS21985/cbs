package com.cbs.fees.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "islamic_fee_waivers", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicFeeWaiver extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "waiver_ref", nullable = false, unique = true, length = 50)
    private String waiverRef;

    @Column(name = "fee_config_id", nullable = false)
    private Long feeConfigId;

    @Column(name = "fee_charge_log_id")
    private Long feeChargeLogId;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "account_id")
    private Long accountId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "original_fee_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal originalFeeAmount;

    @Column(name = "waived_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal waivedAmount;

    @Column(name = "remaining_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "waiver_type", nullable = false, length = 20)
    private String waiverType;

    @Column(name = "reason", nullable = false, length = 30)
    private String reason;

    @Column(name = "justification_detail", columnDefinition = "TEXT")
    private String justificationDetail;

    @Column(name = "shariah_implication", columnDefinition = "TEXT")
    private String shariahImplication;

    @Column(name = "affects_charity_fund", nullable = false)
    private boolean affectsCharityFund;

    @Column(name = "affects_pool_income", nullable = false)
    private boolean affectsPoolIncome;

    @Column(name = "deferred_until")
    private LocalDate deferredUntil;

    @Column(name = "converted_fee_code", length = 30)
    private String convertedFeeCode;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "requested_by", nullable = false, length = 100)
    private String requestedBy;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejected_by", length = 100)
    private String rejectedBy;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "applied_at")
    private Instant appliedAt;

    @Column(name = "applied_by", length = 100)
    private String appliedBy;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "authority_level", nullable = false, length = 20)
    private String authorityLevel;

    @Column(name = "tenant_id")
    private Long tenantId;
}
