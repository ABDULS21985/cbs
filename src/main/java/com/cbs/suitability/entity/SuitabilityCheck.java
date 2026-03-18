package com.cbs.suitability.entity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name = "suitability_check") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SuitabilityCheck {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String checkRef;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long profileId;
    @Column(nullable = false, length = 20) private String checkType;
    @Column(nullable = false, length = 20) private String instrumentType;
    @Column(length = 30) private String instrumentCode;
    @Column(length = 15) private String instrumentRiskRating;
    private BigDecimal proposedAmount;
    private BigDecimal proposedPctOfPortfolio;
    private BigDecimal proposedPctOfNetWorth;
    private Boolean riskToleranceMatch;
    private Boolean experienceMatch;
    private Boolean concentrationCheck;
    private Boolean liquidityCheck;
    private Boolean knowledgeCheck;
    private Boolean leverageCheck;
    @Column(nullable = false, length = 20) private String overallResult;
    @Column(columnDefinition = "JSONB") private String warningMessages;
    @Column(columnDefinition = "JSONB") private String rejectionReasons;
    @Builder.Default private Boolean overrideApplied = false;
    @Column(columnDefinition = "TEXT") private String overrideJustification;
    @Column(length = 80) private String overrideApprovedBy;
    @Column(columnDefinition = "TEXT") private String regulatoryDisclosure;
    @Builder.Default private Boolean clientAcknowledged = false;
    private Instant clientAcknowledgedAt;
    private Instant checkedAt;
    @Column(length = 100) private String createdBy;
    @Column(nullable = false) private Instant createdAt;
    @PrePersist protected void onCreate() { this.createdAt = Instant.now(); if (this.checkedAt == null) this.checkedAt = Instant.now(); }
}
