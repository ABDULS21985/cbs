package com.cbs.lending.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "loan_repayment_schedule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LoanRepaymentSchedule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_account_id", nullable = false)
    private LoanAccount loanAccount;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "principal_due", nullable = false, precision = 18, scale = 2)
    private BigDecimal principalDue;

    @Column(name = "interest_due", nullable = false, precision = 18, scale = 2)
    private BigDecimal interestDue;

    @Column(name = "total_due", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalDue;

    @Column(name = "principal_paid", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal principalPaid = BigDecimal.ZERO;

    @Column(name = "interest_paid", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal interestPaid = BigDecimal.ZERO;

    @Column(name = "penalty_due", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal penaltyDue = BigDecimal.ZERO;

    @Column(name = "penalty_paid", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal penaltyPaid = BigDecimal.ZERO;

    @Column(name = "total_paid", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalPaid = BigDecimal.ZERO;

    @Column(name = "outstanding", nullable = false, precision = 18, scale = 2)
    private BigDecimal outstanding;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ScheduleInstallmentStatus status = ScheduleInstallmentStatus.PENDING;

    public boolean isOverdue() {
        return status == ScheduleInstallmentStatus.PENDING && LocalDate.now().isAfter(dueDate);
    }
}
