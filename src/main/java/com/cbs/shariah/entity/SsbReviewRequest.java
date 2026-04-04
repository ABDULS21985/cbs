package com.cbs.shariah.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

@Entity @Table(name = "ssb_review_request", schema = "cbs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbReviewRequest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", nullable = false, unique = true, length = 30)
    private String requestCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private ReviewRequestType requestType;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "submitted_by", length = 80)
    private String submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "assigned_member_ids", columnDefinition = "jsonb")
    private List<Long> assignedMemberIds;

    @Column(name = "required_quorum", nullable = false) @Builder.Default
    private Integer requiredQuorum = 1;

    @Column(name = "current_approvals", nullable = false) @Builder.Default
    private Integer currentApprovals = 0;

    @Column(name = "current_rejections", nullable = false) @Builder.Default
    private Integer currentRejections = 0;

    @Column(name = "linked_fatwa_id")
    private Long linkedFatwaId;

    @Column(name = "linked_product_code", length = 60)
    private String linkedProductCode;

    @Column(name = "linked_transaction_ref", length = 60)
    private String linkedTransactionRef;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by", length = 80)
    private String resolvedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 25) @Builder.Default
    private ReviewRequestStatus status = ReviewRequestStatus.DRAFT;

    @Column(name = "priority", nullable = false, length = 15) @Builder.Default
    private String priority = "NORMAL";

    @Column(name = "sla_deadline")
    private Instant slaDeadline;

    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at") @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version @Column(name = "version")
    private Long version;

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}
