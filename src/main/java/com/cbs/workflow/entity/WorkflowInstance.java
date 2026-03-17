package com.cbs.workflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflow_instance", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowInstance {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "workflow_code", nullable = false, length = 30) private String workflowCode;
    @Column(name = "entity_type", nullable = false, length = 50) private String entityType;
    @Column(name = "entity_id", nullable = false) private Long entityId;
    @Column(name = "entity_ref", length = 50) private String entityRef;
    @Column(name = "current_step", nullable = false) @Builder.Default private Integer currentStep = 1;
    @Column(name = "total_steps", nullable = false) private Integer totalSteps;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) @Builder.Default private WorkflowStatus status = WorkflowStatus.PENDING;

    @Column(name = "initiated_by", nullable = false, length = 100) private String initiatedBy;
    @Column(name = "initiated_at", nullable = false) @Builder.Default private Instant initiatedAt = Instant.now();
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "amount", precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "currency_code", length = 3) private String currencyCode;
    @Column(name = "sla_deadline") private Instant slaDeadline;
    @Column(name = "is_sla_breached", nullable = false) @Builder.Default private Boolean isSlaBreached = false;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    @OneToMany(mappedBy = "instance", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default private List<WorkflowStepAction> stepActions = new ArrayList<>();

    public void addStepAction(WorkflowStepAction action) { stepActions.add(action); action.setInstance(this); }

    public void advanceStep() {
        this.currentStep++;
        if (this.currentStep > this.totalSteps) { this.status = WorkflowStatus.APPROVED; this.completedAt = Instant.now(); }
        else { this.status = WorkflowStatus.IN_PROGRESS; }
    }
}
