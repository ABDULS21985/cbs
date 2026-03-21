package com.cbs.nostro.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "reconciliation_break", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ReconciliationBreak extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position_id")
    private Long positionId;

    @Column(name = "recon_item_id")
    private Long reconItemId;

    @Column(name = "account_number", nullable = false, length = 40)
    private String accountNumber;

    @Column(name = "bank_name", nullable = false, length = 200)
    private String bankName;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "direction", nullable = false, length = 1)
    private String direction;

    @Column(name = "detected_date", nullable = false)
    @Builder.Default
    private LocalDate detectedDate = LocalDate.now();

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "escalation_level", length = 15)
    @Builder.Default
    private String escalationLevel = "OFFICER";

    @Column(name = "sla_deadline")
    private Instant slaDeadline;

    @Column(name = "resolution_type", length = 20)
    private String resolutionType;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @OneToMany(mappedBy = "reconBreak", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("timestamp DESC")
    @Builder.Default
    private List<BreakTimelineEntry> timeline = new ArrayList<>();

    /** Computed: days since detected */
    @Transient
    public int getAgingDays() {
        return (int) java.time.temporal.ChronoUnit.DAYS.between(detectedDate, LocalDate.now());
    }
}
