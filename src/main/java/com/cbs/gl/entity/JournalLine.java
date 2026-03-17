package com.cbs.gl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "journal_line", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JournalLine {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_id", nullable = false)
    private JournalEntry journal;

    @Column(name = "line_number", nullable = false) private Integer lineNumber;
    @Column(name = "gl_code", nullable = false, length = 20) private String glCode;
    @Column(name = "debit_amount", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal debitAmount = BigDecimal.ZERO;
    @Column(name = "credit_amount", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal creditAmount = BigDecimal.ZERO;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "local_debit", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal localDebit = BigDecimal.ZERO;
    @Column(name = "local_credit", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal localCredit = BigDecimal.ZERO;
    @Column(name = "fx_rate", precision = 18, scale = 8) @Builder.Default private BigDecimal fxRate = BigDecimal.ONE;
    @Column(name = "narration", length = 300) private String narration;
    @Column(name = "cost_centre", length = 20) private String costCentre;
    @Column(name = "branch_code", length = 20) private String branchCode;
    @Column(name = "account_id") private Long accountId;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
