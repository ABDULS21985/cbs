package com.cbs.vault.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "vault_transaction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VaultTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vault_id", nullable = false)
    private Vault vault;

    @Column(name = "transaction_type", nullable = false, length = 20) private String transactionType;
    @Column(name = "amount", nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "running_balance", nullable = false, precision = 18, scale = 2) private BigDecimal runningBalance;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counterparty_vault_id")
    private Vault counterpartyVault;

    @Column(name = "reference", length = 50) private String reference;
    @Column(name = "narration", length = 300) private String narration;
    @Column(name = "performed_by", nullable = false, length = 100) private String performedBy;
    @Column(name = "approved_by", length = 100) private String approvedBy;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
