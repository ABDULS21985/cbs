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
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "late_penalty_records", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LatePenaltyRecord extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "contract_ref", nullable = false, length = 50)
    private String contractRef;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "installment_id", nullable = false)
    private Long installmentId;

    @Column(name = "penalty_date", nullable = false)
    private LocalDate penaltyDate;

    @Column(name = "overdue_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal overdueAmount;

    @Column(name = "days_overdue", nullable = false)
    private Integer daysOverdue;

    @Column(name = "penalty_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal penaltyAmount;

    @Column(name = "fee_config_id", nullable = false)
    private Long feeConfigId;

    @Column(name = "calculation_method", columnDefinition = "TEXT")
    private String calculationMethod;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "fee_charge_log_id")
    private Long feeChargeLogId;

    @Column(name = "charity_fund_entry_id")
    private Long charityFundEntryId;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "reversed_at")
    private Instant reversedAt;

    @Column(name = "reversal_reason", columnDefinition = "TEXT")
    private String reversalReason;

    @Column(name = "reversal_journal_ref", length = 50)
    private String reversalJournalRef;

    @Column(name = "tenant_id")
    private Long tenantId;
}
