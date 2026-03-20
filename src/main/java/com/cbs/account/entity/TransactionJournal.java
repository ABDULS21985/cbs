package com.cbs.account.entity;

import com.cbs.gl.entity.JournalEntry;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "transaction_journal", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionJournal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 30)
    private String transactionRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "transaction_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TransactionType transactionType;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "running_balance", nullable = false, precision = 18, scale = 2)
    private BigDecimal runningBalance;

    @Column(name = "narration", nullable = false, length = 500)
    private String narration;

    @Column(name = "value_date", nullable = false)
    @Builder.Default
    private LocalDate valueDate = LocalDate.now();

    @Column(name = "posting_date", nullable = false)
    @Builder.Default
    private LocalDate postingDate = LocalDate.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contra_account_id")
    private Account contraAccount;

    @Column(name = "contra_account_number", length = 20)
    private String contraAccountNumber;

    @Column(name = "channel", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TransactionChannel channel = TransactionChannel.SYSTEM;

    @Column(name = "external_ref", length = 50)
    private String externalRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_id")
    private JournalEntry journal;

    @Column(name = "posting_group_ref", length = 40)
    private String postingGroupRef;

    @Column(name = "batch_id", length = 30)
    private String batchId;

    @Column(name = "instrument_number", length = 20)
    private String instrumentNumber;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "POSTED";

    @Column(name = "reversal_ref", length = 30)
    private String reversalRef;

    @Column(name = "is_reversed", nullable = false)
    @Builder.Default
    private Boolean isReversed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reversed_transaction_id")
    private TransactionJournal reversedTransaction;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version
    @Column(name = "version")
    private Long version;
}
