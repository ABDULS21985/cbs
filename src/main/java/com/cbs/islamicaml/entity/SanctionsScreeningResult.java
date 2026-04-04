package com.cbs.islamicaml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "sanctions_screening_result", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SanctionsScreeningResult extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "screening_ref", nullable = false, unique = true, length = 50)
    private String screeningRef;

    @Column(name = "screening_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private SanctionsScreeningType screeningType;

    @Column(name = "entity_name", nullable = false, length = 300)
    private String entityName;

    @Column(name = "entity_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private SanctionsEntityType entityType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "entity_identifiers", columnDefinition = "jsonb")
    private Map<String, Object> entityIdentifiers;

    @Column(name = "entity_country", length = 3)
    private String entityCountry;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "lists_screened", columnDefinition = "jsonb")
    private List<String> listsScreened;

    @Column(name = "screening_timestamp")
    private LocalDateTime screeningTimestamp;

    @Column(name = "screening_duration_ms")
    private long screeningDurationMs;

    @Column(name = "overall_result", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private SanctionsOverallResult overallResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "match_details", columnDefinition = "jsonb")
    private List<Map<String, Object>> matchDetails;

    @Column(name = "highest_match_score", precision = 8, scale = 4)
    private BigDecimal highestMatchScore;

    @Column(name = "match_count", nullable = false)
    @Builder.Default private int matchCount = 0;

    @Column(name = "disposition_status", nullable = false, length = 40)
    @Enumerated(EnumType.STRING)
    @Builder.Default private SanctionsDispositionStatus dispositionStatus = SanctionsDispositionStatus.PENDING_REVIEW;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "contract_ref", length = 100)
    private String contractRef;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "tenant_id")
    private Long tenantId;
}
