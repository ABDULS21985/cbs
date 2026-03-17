package com.cbs.segmentation.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "customer_segment", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_customer_segment",
                columnNames = {"customer_id", "segment_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerSegment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "segment_id", nullable = false)
    private Segment segment;

    @Column(name = "assigned_at", nullable = false)
    @Builder.Default
    private Instant assignedAt = Instant.now();

    @Column(name = "assigned_by", length = 100)
    private String assignedBy;

    @Column(name = "assignment_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AssignmentType assignmentType = AssignmentType.AUTO;

    @Column(name = "confidence_score", precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "expires_at")
    private Instant expiresAt;
}
