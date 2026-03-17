package com.cbs.deposit.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "recurring_deposit_installment", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RecurringDepositInstallment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recurring_deposit_id", nullable = false)
    private RecurringDeposit recurringDeposit;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "amount_due", nullable = false, precision = 18, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "amount_paid", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "penalty_amount", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal penaltyAmount = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InstallmentStatus status = InstallmentStatus.PENDING;

    @Column(name = "transaction_ref", length = 40)
    private String transactionRef;

    public boolean isOverdue() {
        return status == InstallmentStatus.PENDING && LocalDate.now().isAfter(dueDate);
    }
}
