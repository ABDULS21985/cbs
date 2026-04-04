package com.cbs.profitdistribution.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "pool_expense_record", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoolExpenseRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_type", nullable = false, length = 30)
    private ExpenseType expenseType;

    @Column(name = "amount", nullable = false, precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "description", length = 500)
    private String description;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_method", length = 30)
    private ExpenseAllocationMethod allocationMethod = ExpenseAllocationMethod.DIRECT;

    @Column(name = "allocation_basis", columnDefinition = "TEXT")
    private String allocationBasis;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100, updatable = false)
    private String createdBy;
}
