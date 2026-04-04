package com.cbs.wadiah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "hibah_policy", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HibahPolicy extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_code", nullable = false, unique = true, length = 40)
    private String policyCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "minimum_balance_for_eligibility", precision = 18, scale = 2)
    private BigDecimal minimumBalanceForEligibility;

    @Builder.Default
    @Column(name = "minimum_days_active", nullable = false)
    private Integer minimumDaysActive = 0;

    @Builder.Default
    @Column(name = "exclude_dormant_accounts", nullable = false)
    private Boolean excludeDormantAccounts = true;

    @Builder.Default
    @Column(name = "exclude_blocked_accounts", nullable = false)
    private Boolean excludeBlockedAccounts = true;

    @Builder.Default
    @Column(name = "maximum_distributions_per_year", nullable = false)
    private Integer maximumDistributionsPerYear = 4;

    @Builder.Default
    @Column(name = "minimum_days_between_distributions", nullable = false)
    private Integer minimumDaysBetweenDistributions = 60;

    @Column(name = "maximum_hibah_rate_per_annum", precision = 8, scale = 4)
    private BigDecimal maximumHibahRatePerAnnum;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "variability_requirement", nullable = false, length = 30)
    private WadiahDomainEnums.HibahVariabilityRequirement variabilityRequirement =
            WadiahDomainEnums.HibahVariabilityRequirement.MANDATORY_VARIATION;

    @Builder.Default
    @Column(name = "maximum_consecutive_same_rate", nullable = false)
    private Integer maximumConsecutiveSameRate = 2;

    @Column(name = "maximum_total_distribution_per_period", precision = 18, scale = 2)
    private BigDecimal maximumTotalDistributionPerPeriod;

    @Column(name = "funding_source_gl", nullable = false, length = 20)
    private String fundingSourceGl;

    @Column(name = "fatwa_id")
    private Long fatwaId;

    @Builder.Default
    @Column(name = "approval_required", nullable = false)
    private Boolean approvalRequired = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "ssb_review_frequency", nullable = false, length = 20)
    private WadiahDomainEnums.SsbReviewFrequency ssbReviewFrequency;

    @Column(name = "last_ssb_review")
    private LocalDate lastSsbReview;

    @Column(name = "next_ssb_review")
    private LocalDate nextSsbReview;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WadiahDomainEnums.HibahPolicyStatus status = WadiahDomainEnums.HibahPolicyStatus.ACTIVE;

    @Column(name = "tenant_id")
    private Long tenantId;
}
