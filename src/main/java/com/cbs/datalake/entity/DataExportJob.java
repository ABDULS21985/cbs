package com.cbs.datalake.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "data_export_job", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DataExportJob {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "job_name", nullable = false, length = 100) private String jobName;
    @Column(name = "source_entity", nullable = false, length = 50) private String sourceEntity;
    @Column(name = "export_format", nullable = false, length = 10) private String exportFormat;
    @Column(name = "schedule_cron", length = 50) private String scheduleCron;
    @Column(name = "last_run_at") private Instant lastRunAt;
    @Column(name = "next_run_at") private Instant nextRunAt;
    @Column(name = "date_column", length = 50) private String dateColumn;
    @Column(name = "last_exported_date") private LocalDate lastExportedDate;
    @Column(name = "incremental", nullable = false) @Builder.Default private Boolean incremental = true;
    @Column(name = "destination_type", nullable = false, length = 20) private String destinationType;
    @Column(name = "destination_path", nullable = false, length = 500) private String destinationPath;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "destination_config", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> destinationConfig = new HashMap<>();
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(name = "last_record_count") private Integer lastRecordCount;
    @Column(name = "last_file_size_bytes") private Long lastFileSizeBytes;
    @Column(name = "last_duration_ms") private Integer lastDurationMs;
    @Column(name = "error_message", columnDefinition = "TEXT") private String errorMessage;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
