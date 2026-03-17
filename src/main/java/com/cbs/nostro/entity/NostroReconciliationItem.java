package com.cbs.nostro.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "nostro_reconciliation_item", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NostroReconciliationItem extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private NostroVostroPosition position;

    @Column(name = "item_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReconItemType itemType;

    @Column(name = "reference", nullable = false, length = 100)
    private String reference;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "value_date", nullable = false)
    private LocalDate valueDate;

    @Column(name = "narration", length = 300)
    private String narration;

    @Column(name = "match_reference", length = 100)
    private String matchReference;

    @Column(name = "match_status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MatchStatus matchStatus = MatchStatus.UNMATCHED;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
