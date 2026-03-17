package com.cbs.eod.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "eod_step", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EodStep {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eod_run_id", nullable = false)
    private EodRun eodRun;

    @Column(name = "step_order", nullable = false) private Integer stepOrder;
    @Column(name = "step_name", nullable = false, length = 100) private String stepName;
    @Column(name = "step_description", length = 300) private String stepDescription;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "duration_ms") private Integer durationMs;
    @Column(name = "records_processed") @Builder.Default private Integer recordsProcessed = 0;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(name = "error_message", columnDefinition = "TEXT") private String errorMessage;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
