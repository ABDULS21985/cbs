package com.cbs.oprisk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "oprisk_loss_event", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpRiskLossEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "event_ref", nullable = false, unique = true, length = 30) private String eventRef;
    @Column(name = "event_category", nullable = false, length = 30) private String eventCategory;
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "description", nullable = false, columnDefinition = "TEXT") private String description;
    @Column(name = "gross_loss", nullable = false, precision = 18, scale = 2) private BigDecimal grossLoss;
    @Column(name = "recovery_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal recoveryAmount = BigDecimal.ZERO;
    @Column(name = "net_loss", nullable = false, precision = 18, scale = 2) private BigDecimal netLoss;
    @Column(name = "currency_code", nullable = false, length = 3) @Builder.Default private String currencyCode = "USD";
    @Column(name = "business_line", length = 50) private String businessLine;
    @Column(name = "department", length = 100) private String department;
    @Column(name = "branch_code", length = 20) private String branchCode;
    @Column(name = "event_date", nullable = false) private LocalDate eventDate;
    @Column(name = "discovery_date", nullable = false) private LocalDate discoveryDate;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "REPORTED";
    @Column(name = "root_cause", columnDefinition = "TEXT") private String rootCause;
    @Column(name = "remediation_plan", columnDefinition = "TEXT") private String remediationPlan;
    @Column(name = "assigned_to", length = 100) private String assignedTo;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;
}
