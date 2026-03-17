package com.cbs.account.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "currency_wallet", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"account_id","currency_code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CurrencyWallet {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "book_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal bookBalance = BigDecimal.ZERO;

    @Column(name = "available_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "lien_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal lienAmount = BigDecimal.ZERO;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default private Boolean isPrimary = false;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default private String status = "ACTIVE";

    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public void credit(BigDecimal amount) {
        this.bookBalance = this.bookBalance.add(amount);
        this.availableBalance = this.bookBalance.subtract(this.lienAmount);
    }

    public void debit(BigDecimal amount) {
        this.bookBalance = this.bookBalance.subtract(amount);
        this.availableBalance = this.bookBalance.subtract(this.lienAmount);
    }
}
