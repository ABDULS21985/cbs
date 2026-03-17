package com.cbs.sanctions.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "screening_request", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScreeningRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "screening_ref", nullable = false, unique = true, length = 30) private String screeningRef;
    @Column(name = "screening_type", nullable = false, length = 20) private String screeningType;
    @Column(name = "subject_name", nullable = false, length = 300) private String subjectName;
    @Column(name = "subject_type", nullable = false, length = 20) private String subjectType;
    @Column(name = "subject_dob") private LocalDate subjectDob;
    @Column(name = "subject_nationality", length = 3) private String subjectNationality;
    @Column(name = "subject_id_number", length = 50) private String subjectIdNumber;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "transaction_ref", length = 50) private String transactionRef;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "lists_screened", columnDefinition = "jsonb")
    @Builder.Default private List<String> listsScreened = List.of("OFAC_SDN","UN_CONSOLIDATED","EU_CONSOLIDATED","PEP");
    @Column(name = "match_threshold", nullable = false, precision = 5, scale = 2) @Builder.Default private BigDecimal matchThreshold = new BigDecimal("85.00");
    @Column(name = "total_matches", nullable = false) @Builder.Default private Integer totalMatches = 0;
    @Column(name = "true_matches", nullable = false) @Builder.Default private Integer trueMatches = 0;
    @Column(name = "false_positives", nullable = false) @Builder.Default private Integer falsePositives = 0;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(name = "reviewed_by", length = 100) private String reviewedBy;
    @Column(name = "reviewed_at") private Instant reviewedAt;
    @Column(name = "review_notes", columnDefinition = "TEXT") private String reviewNotes;
    @Column(name = "screening_time_ms") private Integer screeningTimeMs;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    @OneToMany(mappedBy = "screening", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default private List<ScreeningMatch> matches = new ArrayList<>();
}
