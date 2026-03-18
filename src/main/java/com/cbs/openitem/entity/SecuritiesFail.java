package com.cbs.openitem.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "securities_fail", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SecuritiesFail extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fail_ref", nullable = false, unique = true, length = 30)
    private String failRef;

    @Column(name = "settlement_instruction_id")
    private Long settlementInstructionId;

    @Column(name = "instrument_code", length = 30)
    private String instrumentCode;

    @Column(name = "instrument_name", length = 300)
    private String instrumentName;

    @Column(name = "isin", length = 12)
    private String isin;

    @Column(name = "fail_type", nullable = false, length = 20)
    private String failType;

    @Column(name = "counterparty_code", length = 30)
    private String counterpartyCode;

    @Column(name = "counterparty_name", length = 200)
    private String counterpartyName;

    @Column(name = "original_settlement_date")
    private LocalDate originalSettlementDate;

    @Column(name = "current_expected_date")
    private LocalDate currentExpectedDate;

    @Column(name = "fail_start_date", nullable = false)
    private LocalDate failStartDate;

    @Column(name = "aging_days")
    @Builder.Default
    private Integer agingDays = 0;

    @Column(name = "aging_bucket", length = 15)
    private String agingBucket;

    @Column(name = "quantity", precision = 20, scale = 6)
    private BigDecimal quantity;

    @Column(name = "amount", precision = 20, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "penalty_accrued", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal penaltyAccrued = BigDecimal.ZERO;

    @Column(name = "buy_in_eligible")
    @Builder.Default
    private Boolean buyInEligible = false;

    @Column(name = "buy_in_deadline")
    private LocalDate buyInDeadline;

    @Column(name = "escalation_level", length = 20)
    private String escalationLevel;

    @Column(name = "resolution_action", length = 20)
    private String resolutionAction;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "OPEN";
}
