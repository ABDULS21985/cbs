package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "alm_regulatory_return", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmRegulatoryReturn {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 20) private String code;
    @Column(name = "name", nullable = false, length = 100) private String name;
    @Column(name = "frequency", nullable = false, length = 20) private String frequency;
    @Column(name = "due_date", nullable = false) private LocalDate dueDate;
    @Column(name = "next_due", nullable = false) private LocalDate nextDue;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "DRAFT";

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "data", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> data = new LinkedHashMap<>();

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "validation_errors", columnDefinition = "jsonb")
    @Builder.Default private List<Map<String, Object>> validationErrors = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "validation_warnings", columnDefinition = "jsonb")
    @Builder.Default private List<Map<String, Object>> validationWarnings = new ArrayList<>();

    @Column(name = "last_submission_date") private Instant lastSubmissionDate;
    @Column(name = "last_submitted_by", length = 100) private String lastSubmittedBy;

    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();

    @Version @Column(name = "version") private Long version;
}
