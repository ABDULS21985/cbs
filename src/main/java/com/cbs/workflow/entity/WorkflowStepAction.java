package com.cbs.workflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "workflow_step_action", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowStepAction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instance_id", nullable = false)
    private WorkflowInstance instance;

    @Column(name = "step_number", nullable = false) private Integer stepNumber;
    @Column(name = "step_name", nullable = false, length = 100) private String stepName;
    @Column(name = "required_role", length = 50) private String requiredRole;
    @Column(name = "action", length = 20) private String action;
    @Column(name = "action_by", length = 100) private String actionBy;
    @Column(name = "action_at") private Instant actionAt;
    @Column(name = "comments", columnDefinition = "TEXT") private String comments;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
