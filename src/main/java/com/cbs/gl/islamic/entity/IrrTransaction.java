package com.cbs.gl.islamic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "irr_transaction", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IrrTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_id", nullable = false)
    private Long policyId;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private IrrTransactionType transactionType;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, precision = 18, scale = 2)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 18, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "trigger_event", length = 200)
    private String triggerEvent;

    @Column(name = "loss_amount", precision = 18, scale = 2)
    private BigDecimal lossAmount;

    @Column(name = "loss_absorbed", precision = 18, scale = 2)
    private BigDecimal lossAbsorbed;

    @Column(name = "remaining_loss", precision = 18, scale = 2)
    private BigDecimal remainingLoss;

    @Column(name = "journal_ref", length = 30)
    private String journalRef;

    @Column(name = "narration", columnDefinition = "TEXT")
    private String narration;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "processed_at", nullable = false)
    @Builder.Default
    private Instant processedAt = Instant.now();

    @Column(name = "processed_by", nullable = false, length = 100)
    private String processedBy;

    @Version
    @Column(name = "version")
    private Long version;
}
