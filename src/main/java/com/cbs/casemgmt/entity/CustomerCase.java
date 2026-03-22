package com.cbs.casemgmt.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name = "customer_case")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerCase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String caseNumber;
    @Column(nullable = false) private Long customerId;
    @Column(name = "customer_name", length = 200) private String customerName;
    @Column(nullable = false, length = 30) private String caseType;
    @Column(nullable = false, length = 30) private String caseCategory;
    @Column(name = "sub_category", length = 60) private String subCategory;
    @Column(nullable = false, length = 10) @Builder.Default private String priority = "MEDIUM";
    @Column(nullable = false, length = 300) private String subject;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "channel_originated", length = 20) private String channelOriginated;
    private String assignedTo;
    private String assignedTeam;
    @Column(name = "sla_due_at") private Instant slaDueAt;
    @Builder.Default private Boolean slaBreached = false;
    @Column(columnDefinition = "TEXT") private String resolutionSummary;
    private String resolutionType;
    private BigDecimal compensationAmount;
    @Column(name = "compensation_approved") private Boolean compensationApproved;
    @Column(name = "compensation_approved_by", length = 80) private String compensationApprovedBy;
    @Column(name = "compensation_approved_at") private Instant compensationApprovedAt;
    @Column(name = "compensation_rejection_reason", columnDefinition = "TEXT") private String compensationRejectionReason;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "OPEN";
    @Column(columnDefinition = "TEXT") private String rootCause;
    private Long linkedCaseId;
    private Long linkedTransactionId;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
    private Instant resolvedAt;
    private Instant closedAt;
}
