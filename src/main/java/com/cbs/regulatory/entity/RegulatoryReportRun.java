package com.cbs.regulatory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "regulatory_report_run", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegulatoryReportRun {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_code", nullable = false, length = 30)
    private String reportCode;

    @Column(name = "reporting_period_start", nullable = false)
    private LocalDate reportingPeriodStart;

    @Column(name = "reporting_period_end", nullable = false)
    private LocalDate reportingPeriodEnd;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default private String status = "PENDING";

    @Column(name = "record_count")
    private Integer recordCount;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "generation_time_ms")
    private Integer generationTimeMs;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "submission_ref", length = 50)
    private String submissionRef;

    @Column(name = "regulator_ack_ref", length = 50)
    private String regulatorAckRef;

    @Column(name = "generated_by", length = 100)
    private String generatedBy;

    @Column(name = "generated_at")
    private Instant generatedAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default private Instant createdAt = Instant.now();

    @Version @Column(name = "version")
    private Long version;
}
