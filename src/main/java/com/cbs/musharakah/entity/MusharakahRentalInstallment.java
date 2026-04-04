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

@Entity
@Table(name = "musharakah_rental_installments", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahRentalInstallment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "due_date_hijri", length = 20)
    private String dueDateHijri;

    @Column(name = "rental_period_from")
    private LocalDate rentalPeriodFrom;

    @Column(name = "rental_period_to")
    private LocalDate rentalPeriodTo;

    @Column(name = "bank_ownership_at_period_start", precision = 10, scale = 4)
    private BigDecimal bankOwnershipAtPeriodStart;

    @Column(name = "bank_share_value_at_period_start", precision = 18, scale = 2)
    private BigDecimal bankShareValueAtPeriodStart;

    @Column(name = "applicable_rental_rate", precision = 10, scale = 4)
    private BigDecimal applicableRentalRate;

    @Column(name = "days_in_period")
    private Integer daysInPeriod;

    @Column(name = "rental_amount", precision = 18, scale = 2)
    private BigDecimal rentalAmount;

    @Column(name = "calculation_method", columnDefinition = "TEXT")
    private String calculationMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MusharakahDomainEnums.InstallmentStatus status;

    @Column(name = "paid_amount", precision = 18, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "transaction_ref", length = 80)
    private String transactionRef;

    @Column(name = "journal_ref", length = 40)
    private String journalRef;

    @Column(name = "days_overdue")
    private Integer daysOverdue;

    @Column(name = "late_penalty_amount", precision = 18, scale = 2)
    private BigDecimal latePenaltyAmount;

    @Column(name = "late_penalty_charity_journal_ref", length = 40)
    private String latePenaltyCharityJournalRef;
}
