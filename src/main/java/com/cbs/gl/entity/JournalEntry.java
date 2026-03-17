package com.cbs.gl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "journal_entry", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JournalEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "journal_number", nullable = false, unique = true, length = 30) private String journalNumber;
    @Column(name = "journal_type", nullable = false, length = 20) private String journalType;
    @Column(name = "description", nullable = false, length = 500) private String description;
    @Column(name = "source_module", length = 30) private String sourceModule;
    @Column(name = "source_ref", length = 50) private String sourceRef;
    @Column(name = "value_date", nullable = false) @Builder.Default private LocalDate valueDate = LocalDate.now();
    @Column(name = "posting_date", nullable = false) @Builder.Default private LocalDate postingDate = LocalDate.now();
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(name = "total_debit", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal totalDebit = BigDecimal.ZERO;
    @Column(name = "total_credit", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal totalCredit = BigDecimal.ZERO;
    @Column(name = "created_by", nullable = false, length = 100) private String createdBy;
    @Column(name = "approved_by", length = 100) private String approvedBy;
    @Column(name = "posted_at") private Instant postedAt;
    @Column(name = "reversed_at") private Instant reversedAt;
    @Column(name = "reversal_journal_id") private Long reversalJournalId;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    @OneToMany(mappedBy = "journal", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default private List<JournalLine> lines = new ArrayList<>();

    public void addLine(JournalLine line) {
        lines.add(line);
        line.setJournal(this);
        recalculateTotals();
    }

    public void recalculateTotals() {
        this.totalDebit = lines.stream().map(JournalLine::getLocalDebit).reduce(BigDecimal.ZERO, BigDecimal::add);
        this.totalCredit = lines.stream().map(JournalLine::getLocalCredit).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Double-entry validation: total debits must equal total credits */
    public boolean isBalanced() {
        recalculateTotals();
        return totalDebit.compareTo(totalCredit) == 0 && totalDebit.compareTo(BigDecimal.ZERO) > 0;
    }
}
