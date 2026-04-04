package com.cbs.wadiah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hibah_distribution_batch", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HibahDistributionBatch extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_id")
    private Long policyId;

    @Column(name = "batch_ref", nullable = false, unique = true, length = 50)
    private String batchRef;

    @Column(name = "distribution_date", nullable = false)
    private LocalDate distributionDate;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Builder.Default
    @Column(name = "total_distribution_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalDistributionAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "account_count", nullable = false)
    private Integer accountCount = 0;

    @Column(name = "average_hibah_rate", precision = 8, scale = 4)
    private BigDecimal averageHibahRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "distribution_method", nullable = false, length = 30)
    private WadiahDomainEnums.HibahDistributionMethod distributionMethod;

    @Column(name = "decision_table_code", length = 100)
    private String decisionTableCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "funding_source", nullable = false, length = 30)
    private WadiahDomainEnums.HibahFundingSource fundingSource;

    @Column(name = "funding_source_gl", nullable = false, length = 20)
    private String fundingSourceGl;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WadiahDomainEnums.HibahBatchStatus status = WadiahDomainEnums.HibahBatchStatus.DRAFT;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Builder.Default
    @Column(name = "shariah_board_notified", nullable = false)
    private Boolean shariahBoardNotified = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "processed_by", length = 100)
    private String processedBy;

    @Builder.Default
    @Column(name = "total_journal_entries", nullable = false)
    private Integer totalJournalEntries = 0;

    @Column(name = "journal_batch_ref", length = 50)
    private String journalBatchRef;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tenant_id")
    private Long tenantId;
}
