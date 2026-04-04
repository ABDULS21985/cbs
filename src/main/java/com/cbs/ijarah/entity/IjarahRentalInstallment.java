package com.cbs.ijarah.entity;

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
@Table(name = "ijarah_rental_installments", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahRentalInstallment extends AuditableEntity {

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

    @Column(name = "rental_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal rentalAmount;

    @Column(name = "maintenance_component", precision = 18, scale = 2)
    private BigDecimal maintenanceComponent;

    @Column(name = "net_rental_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal netRentalAmount;

    @Column(name = "is_advance_rental", nullable = false)
    @lombok.Builder.Default
    private Boolean isAdvanceRental = false;

    @Column(name = "rental_period_from")
    private LocalDate rentalPeriodFrom;

    @Column(name = "rental_period_to")
    private LocalDate rentalPeriodTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IjarahDomainEnums.RentalInstallmentStatus status;

    @Column(name = "paid_amount", precision = 18, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "journal_ref", length = 40)
    private String journalRef;

    @Column(name = "days_overdue")
    private Integer daysOverdue;

    @Column(name = "late_penalty_amount", precision = 18, scale = 2)
    private BigDecimal latePenaltyAmount;

    @Column(name = "late_penalty_charity_journal_ref", length = 40)
    private String latePenaltyCharityJournalRef;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
