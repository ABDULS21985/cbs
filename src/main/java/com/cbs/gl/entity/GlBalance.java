package com.cbs.gl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "gl_balance", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"gl_code","branch_code","currency_code","balance_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GlBalance {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "gl_code", nullable = false, length = 20) private String glCode;
    @Column(name = "branch_code", nullable = false, length = 20) @Builder.Default private String branchCode = "HEAD";
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "balance_date", nullable = false) private LocalDate balanceDate;
    @Column(name = "opening_balance", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal openingBalance = BigDecimal.ZERO;
    @Column(name = "debit_total", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal debitTotal = BigDecimal.ZERO;
    @Column(name = "credit_total", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal creditTotal = BigDecimal.ZERO;
    @Column(name = "closing_balance", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal closingBalance = BigDecimal.ZERO;
    @Column(name = "transaction_count", nullable = false) @Builder.Default private Integer transactionCount = 0;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public void applyDebit(BigDecimal amount) {
        this.debitTotal = this.debitTotal.add(amount);
        this.closingBalance = this.openingBalance.add(this.debitTotal).subtract(this.creditTotal);
        this.transactionCount++;
    }

    public void applyCredit(BigDecimal amount) {
        this.creditTotal = this.creditTotal.add(amount);
        this.closingBalance = this.openingBalance.add(this.debitTotal).subtract(this.creditTotal);
        this.transactionCount++;
    }
}
