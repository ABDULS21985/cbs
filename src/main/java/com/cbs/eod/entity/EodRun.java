package com.cbs.eod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "eod_run", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"business_date","run_type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EodRun {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_date", nullable = false) private LocalDate businessDate;

    @Column(name = "run_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING) private EodRunType runType;

    @Column(name = "total_steps", nullable = false) @Builder.Default private Integer totalSteps = 0;
    @Column(name = "completed_steps", nullable = false) @Builder.Default private Integer completedSteps = 0;
    @Column(name = "failed_steps", nullable = false) @Builder.Default private Integer failedSteps = 0;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "duration_seconds") private Integer durationSeconds;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default private String status = "PENDING";

    @Column(name = "error_message", columnDefinition = "TEXT") private String errorMessage;
    @Column(name = "initiated_by", length = 100) private String initiatedBy;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    @OneToMany(mappedBy = "eodRun", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default private List<EodStep> steps = new ArrayList<>();

    public void addStep(EodStep step) { steps.add(step); step.setEodRun(this); totalSteps++; }
}
