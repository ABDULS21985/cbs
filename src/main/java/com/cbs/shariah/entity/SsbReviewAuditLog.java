package com.cbs.shariah.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "ssb_review_audit_log", schema = "cbs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbReviewAuditLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_request_id")
    private Long reviewRequestId;

    @Column(name = "fatwa_id")
    private Long fatwaId;

    @Column(name = "action", nullable = false, length = 60)
    private String action;

    @Column(name = "performed_by", nullable = false, length = 80)
    private String performedBy;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "details", columnDefinition = "jsonb")
    private Map<String, Object> details;

    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default
    private Instant createdAt = Instant.now();
}
