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
@Table(name = "musharakah_buyout_installments", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahBuyoutInstallment extends AuditableEntity {

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

    @Column(name = "units_to_transfer", precision = 19, scale = 4)
    private BigDecimal unitsToTransfer;

    @Column(name = "price_per_unit", precision = 18, scale = 6)
    private BigDecimal pricePerUnit;

    @Column(name = "total_buyout_amount", precision = 18, scale = 2)
    private BigDecimal totalBuyoutAmount;

    @Column(name = "cumulative_units_bought", precision = 19, scale = 4)
    private BigDecimal cumulativeUnitsBought;

    @Column(name = "bank_units_after_this_installment", precision = 19, scale = 4)
    private BigDecimal bankUnitsAfterThisInstallment;

    @Column(name = "bank_percentage_after", precision = 10, scale = 4)
    private BigDecimal bankPercentageAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MusharakahDomainEnums.InstallmentStatus status;

    @Column(name = "paid_amount", precision = 18, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "actual_units_transferred", precision = 19, scale = 4)
    private BigDecimal actualUnitsTransferred;

    @Column(name = "transaction_ref", length = 80)
    private String transactionRef;

    @Column(name = "unit_transfer_id")
    private Long unitTransferId;

    @Column(name = "late_penalty_amount", precision = 18, scale = 2)
    private BigDecimal latePenaltyAmount;

    @Column(name = "late_penalty_charity_journal_ref", length = 40)
    private String latePenaltyCharityJournalRef;
}
