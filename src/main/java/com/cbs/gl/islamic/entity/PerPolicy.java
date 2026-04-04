package com.cbs.gl.islamic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "per_policy", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_code", nullable = false, length = 40)
    private String policyCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "investment_pool_id", nullable = false)
    private Long investmentPoolId;

    @Column(name = "retention_rate", nullable = false, precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal retentionRate = BigDecimal.ZERO;

    @Column(name = "maximum_retention_rate", nullable = false, precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal maximumRetentionRate = BigDecimal.ZERO;

    @Column(name = "release_threshold", precision = 8, scale = 4)
    private BigDecimal releaseThreshold;

    @Column(name = "target_distribution_rate", nullable = false, precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal targetDistributionRate = BigDecimal.ZERO;

    @Column(name = "maximum_reserve_balance", precision = 18, scale = 2)
    private BigDecimal maximumReserveBalance;

    @Column(name = "maximum_reserve_percent_of_pool", precision = 8, scale = 4)
    private BigDecimal maximumReservePercentOfPool;

    @Column(name = "retention_from_bank_share", nullable = false)
    @Builder.Default
    private Boolean retentionFromBankShare = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "retention_allocation", nullable = false, length = 30)
    @Builder.Default
    private PerRetentionAllocation retentionAllocation = PerRetentionAllocation.FROM_GROSS_BEFORE_SPLIT;

    @Column(name = "approval_required", nullable = false)
    @Builder.Default
    private Boolean approvalRequired = false;

    @Column(name = "fatwa_id")
    private Long fatwaId;

    @Column(name = "ssb_review_date")
    private LocalDate ssbReviewDate;

    @Column(name = "next_ssb_review_date")
    private LocalDate nextSsbReviewDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ReservePolicyStatus status = ReservePolicyStatus.ACTIVE;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
