package com.cbs.shariahcompliance.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "purification_disbursement", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PurificationDisbursement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(name = "amount", precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snci_record_ids", columnDefinition = "jsonb")
    private List<Long> snciRecordIds;

    @Column(name = "payment_ref", length = 100)
    private String paymentRef;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private DisbursementPaymentStatus paymentStatus;

    @Column(name = "journal_ref", length = 50)
    private String journalRef;

    @Column(name = "receipt_ref", length = 100)
    private String receiptRef;

    @Column(name = "receipt_date")
    private LocalDate receiptDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tenant_id")
    private Long tenantId;
}
