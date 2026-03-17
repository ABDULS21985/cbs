package com.cbs.nostro.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "nostro_vostro_position", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(name = "uq_nv_account_bank",
                columnNames = {"account_id", "correspondent_bank_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NostroVostroPosition extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "correspondent_bank_id", nullable = false)
    private CorrespondentBank correspondentBank;

    @Column(name = "position_type", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private PositionType positionType;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "book_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal bookBalance = BigDecimal.ZERO;

    @Column(name = "statement_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal statementBalance = BigDecimal.ZERO;

    @Column(name = "unreconciled_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal unreconciledAmount = BigDecimal.ZERO;

    @Column(name = "last_statement_date")
    private LocalDate lastStatementDate;

    @Column(name = "last_reconciled_date")
    private LocalDate lastReconciledDate;

    @Column(name = "reconciliation_status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReconciliationStatus reconciliationStatus = ReconciliationStatus.PENDING;

    @Column(name = "outstanding_items_count", nullable = false)
    @Builder.Default
    private Integer outstandingItemsCount = 0;

    @Column(name = "credit_limit", precision = 18, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "debit_limit", precision = 18, scale = 2)
    private BigDecimal debitLimit;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<NostroReconciliationItem> reconciliationItems = new ArrayList<>();

    public void recalculateUnreconciled() {
        this.unreconciledAmount = this.bookBalance.subtract(this.statementBalance).abs();
    }
}
