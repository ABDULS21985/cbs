package com.cbs.reports.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "report_execution", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportExecution {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long reportId;

    @Column(length = 15)
    @Builder.Default
    private String status = "RUNNING";

    private Integer rowCount;

    private Integer durationMs;

    @Column(length = 500)
    private String outputUrl;

    private String errorMessage;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant completedAt;
}
