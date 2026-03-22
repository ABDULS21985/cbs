package com.cbs.dspm.entity;

import com.cbs.common.audit.AuditableEntity;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "dspm_data_source")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DspmDataSource extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_code", nullable = false, unique = true, length = 30)
    private String sourceCode;

    @Column(name = "source_name", nullable = false, length = 200)
    private String sourceName;

    @Column(name = "source_type", nullable = false, length = 30)
    @Builder.Default
    private String sourceType = "DATABASE";

    @Column(name = "connection_ref", length = 200)
    private String connectionRef;

    @Column(name = "environment", nullable = false, length = 20)
    @Builder.Default
    private String environment = "PRODUCTION";

    @Column(length = 100)
    private String owner;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String classification = "UNCLASSIFIED";

    @Column(name = "sensitivity_level", nullable = false, length = 20)
    @Builder.Default
    private String sensitivityLevel = "LOW";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private List<String> tags = List.of();

    @Column(name = "last_scan_at")
    private Instant lastScanAt;

    /**
     * Serialised as a JSON string (not a number) to avoid IEEE-754 precision loss
     * for values that exceed Number.MAX_SAFE_INTEGER (~9×10¹⁵) in JavaScript clients.
     * Frontend must treat this field as string and format with Intl.NumberFormat.
     */
    @JsonSerialize(using = ToStringSerializer.class)
    @Column(name = "record_count")
    @Builder.Default
    private Long recordCount = 0L;

    @Column(name = "pii_fields_count")
    @Builder.Default
    private Integer piiFieldsCount = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";
}
