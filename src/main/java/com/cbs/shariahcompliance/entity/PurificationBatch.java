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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "purification_batch", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PurificationBatch extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_ref", nullable = false, unique = true, length = 50)
    private String batchRef;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "total_amount", precision = 18, scale = 4)
    private BigDecimal totalAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "item_count", nullable = false)
    private int itemCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PurificationBatchStatus status;

    @Column(name = "ssb_approval_ref", length = 100)
    private String ssbApprovalRef;

    @Column(name = "ssb_approved_by", length = 100)
    private String ssbApprovedBy;

    @Column(name = "ssb_approved_at")
    private LocalDateTime ssbApprovedAt;

    @Column(name = "ssb_comments", columnDefinition = "TEXT")
    private String ssbComments;

    @Column(name = "disbursed_at")
    private LocalDateTime disbursedAt;

    @Column(name = "disbursed_by", length = 100)
    private String disbursedBy;

    @Column(name = "total_disbursed", precision = 18, scale = 4)
    private BigDecimal totalDisbursed;

    @Column(name = "tenant_id")
    private Long tenantId;
}
