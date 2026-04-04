package com.cbs.shariahcompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "charity_fund_ledger_entries", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CharityFundLedgerEntry extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_ref", nullable = false, unique = true, length = 50)
    private String entryRef;

    @Column(name = "entry_type", nullable = false, length = 20)
    private String entryType;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "running_balance", nullable = false, precision = 18, scale = 2)
    private BigDecimal runningBalance;

    @Column(name = "source_type", length = 30)
    private String sourceType;

    @Column(name = "source_reference", length = 100)
    private String sourceReference;

    @Column(name = "source_contract_ref", length = 50)
    private String sourceContractRef;

    @Column(name = "source_contract_type", length = 30)
    private String sourceContractType;

    @Column(name = "source_customer_id")
    private Long sourceCustomerId;

    @Column(name = "destination_type", length = 30)
    private String destinationType;

    @Column(name = "destination_reference", length = 100)
    private String destinationReference;

    @Column(name = "charity_recipient_id")
    private Long charityRecipientId;

    @Column(name = "charity_recipient_name", length = 200)
    private String charityRecipientName;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tenant_id")
    private Long tenantId;
}
