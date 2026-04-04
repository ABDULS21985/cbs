package com.cbs.qard.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "qard_repayment_schedule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QardRepaymentSchedule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "qard_account_id", nullable = false)
    private Long qardAccountId;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "principal_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal principalAmount;

    @Builder.Default
    @Column(name = "paid_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private QardDomainEnums.ScheduleStatus status = QardDomainEnums.ScheduleStatus.PENDING;

    @Column(name = "transaction_ref", length = 40)
    private String transactionRef;
}
