package com.cbs.murabaha.entity;

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

@Entity
@Table(name = "murabaha_installments", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MurabahaInstallment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "due_date_hijri", length = 40)
    private String dueDateHijri;

    @Column(name = "principal_component", nullable = false, precision = 18, scale = 2)
    private BigDecimal principalComponent;

    @Column(name = "profit_component", nullable = false, precision = 18, scale = 2)
    private BigDecimal profitComponent;

    @Column(name = "total_installment_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalInstallmentAmount;

    @Column(name = "outstanding_principal_before", nullable = false, precision = 18, scale = 2)
    private BigDecimal outstandingPrincipalBefore;

    @Column(name = "outstanding_principal_after", nullable = false, precision = 18, scale = 2)
    private BigDecimal outstandingPrincipalAfter;

    @Column(name = "cumulative_principal_paid", nullable = false, precision = 18, scale = 2)
    private BigDecimal cumulativePrincipalPaid;

    @Column(name = "cumulative_profit_paid", nullable = false, precision = 18, scale = 2)
    private BigDecimal cumulativeProfitPaid;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MurabahaDomainEnums.InstallmentStatus status;

    @Column(name = "paid_amount", precision = 18, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "paid_principal", precision = 18, scale = 2)
    private BigDecimal paidPrincipal;

    @Column(name = "paid_profit", precision = 18, scale = 2)
    private BigDecimal paidProfit;

    @Column(name = "transaction_ref", length = 60)
    private String transactionRef;

    @Column(name = "journal_ref", length = 40)
    private String journalRef;

    @Column(name = "days_overdue", nullable = false)
    @lombok.Builder.Default
    private Integer daysOverdue = 0;

    @Column(name = "late_penalty_amount", nullable = false, precision = 18, scale = 2)
    @lombok.Builder.Default
    private BigDecimal latePenaltyAmount = BigDecimal.ZERO;

    @Column(name = "late_penalty_charity_journal_ref", length = 40)
    private String latePenaltyCharityJournalRef;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
