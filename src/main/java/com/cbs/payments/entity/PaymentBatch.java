package com.cbs.payments.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "payment_batch", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentBatch extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_ref", nullable = false, unique = true, length = 30)
    private String batchRef;

    @Column(name = "batch_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private BatchType batchType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_account_id", nullable = false)
    private Account debitAccount;

    @Column(name = "total_records", nullable = false)
    @Builder.Default private Integer totalRecords = 0;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "successful_count", nullable = false)
    @Builder.Default private Integer successfulCount = 0;

    @Column(name = "failed_count", nullable = false)
    @Builder.Default private Integer failedCount = 0;

    @Column(name = "successful_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal successfulAmount = BigDecimal.ZERO;

    @Column(name = "failed_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal failedAmount = BigDecimal.ZERO;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "value_date", nullable = false)
    @Builder.Default private LocalDate valueDate = LocalDate.now();

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default private String status = "PENDING";

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "narration", length = 300)
    private String narration;
}
