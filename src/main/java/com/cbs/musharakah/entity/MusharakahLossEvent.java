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
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "musharakah_loss_events", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahLossEvent extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "loss_event_ref", nullable = false, unique = true, length = 50)
    private String lossEventRef;

    @Column(name = "loss_date", nullable = false)
    private LocalDate lossDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "loss_type", nullable = false, length = 30)
    private MusharakahDomainEnums.LossType lossType;

    @Column(name = "total_loss_amount", precision = 18, scale = 2)
    private BigDecimal totalLossAmount;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "cause", columnDefinition = "TEXT")
    private String cause;

    @Column(name = "evidence_reference", length = 120)
    private String evidenceReference;

    @Column(name = "bank_capital_ratio_at_loss", precision = 10, scale = 4)
    private BigDecimal bankCapitalRatioAtLoss;

    @Column(name = "customer_capital_ratio_at_loss", precision = 10, scale = 4)
    private BigDecimal customerCapitalRatioAtLoss;

    @Column(name = "bank_loss_share", precision = 18, scale = 2)
    private BigDecimal bankLossShare;

    @Column(name = "customer_loss_share", precision = 18, scale = 2)
    private BigDecimal customerLossShare;

    @Column(name = "allocation_method", columnDefinition = "TEXT")
    private String allocationMethod;

    @Column(name = "verified_by_compliance", nullable = false)
    @lombok.Builder.Default
    private Boolean verifiedByCompliance = false;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "bank_loss_journal_ref", length = 40)
    private String bankLossJournalRef;

    @Column(name = "customer_loss_journal_ref", length = 40)
    private String customerLossJournalRef;

    @Column(name = "bank_share_value_after_loss", precision = 18, scale = 2)
    private BigDecimal bankShareValueAfterLoss;

    @Column(name = "customer_share_value_after_loss", precision = 18, scale = 2)
    private BigDecimal customerShareValueAfterLoss;

    @Column(name = "asset_value_after_loss", precision = 18, scale = 2)
    private BigDecimal assetValueAfterLoss;

    @Column(name = "insured", nullable = false)
    @lombok.Builder.Default
    private Boolean insured = false;

    @Column(name = "insurance_claim_ref", length = 120)
    private String insuranceClaimRef;

    @Column(name = "insurance_recovery_expected", precision = 18, scale = 2)
    private BigDecimal insuranceRecoveryExpected;

    @Column(name = "insurance_recovery_received", precision = 18, scale = 2)
    private BigDecimal insuranceRecoveryReceived;

    @Column(name = "net_loss_after_insurance", precision = 18, scale = 2)
    private BigDecimal netLossAfterInsurance;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MusharakahDomainEnums.LossStatus status;

    @Column(name = "tenant_id")
    private Long tenantId;
}
