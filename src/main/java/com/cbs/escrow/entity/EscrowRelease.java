package com.cbs.escrow.entity;

import com.cbs.account.entity.Account;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "escrow_release", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EscrowRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mandate_id", nullable = false)
    private EscrowMandate mandate;

    @Column(name = "release_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal releaseAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "release_to_account_id")
    private Account releaseToAccount;

    @Column(name = "release_reason", nullable = false, columnDefinition = "TEXT")
    private String releaseReason;

    @Column(name = "approved_by", length = 200)
    private String approvedBy;

    @Column(name = "approval_date")
    private Instant approvalDate;

    @Column(name = "transaction_ref", length = 40)
    private String transactionRef;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version
    @Column(name = "version")
    private Long version;
}
