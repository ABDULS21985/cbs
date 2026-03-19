package com.cbs.ecl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "ecl_batch_run", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EclBatchRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, unique = true, length = 60)
    private String jobId;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "run_date", nullable = false)
    @Builder.Default
    private LocalDate runDate = LocalDate.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "total_loans", nullable = false)
    @Builder.Default
    private Integer totalLoans = 0;

    @Column(name = "processed_loans", nullable = false)
    @Builder.Default
    private Integer processedLoans = 0;

    @Column(name = "failed_loans", nullable = false)
    @Builder.Default
    private Integer failedLoans = 0;

    @Column(name = "total_ecl", precision = 18, scale = 2)
    private BigDecimal totalEcl;

    @Column(name = "triggered_by", length = 100)
    private String triggeredBy;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;
}
