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
@Table(name = "investment_pool", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentPool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_code", nullable = false, length = 60)
    private String poolCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Enumerated(EnumType.STRING)
    @Column(name = "pool_type", nullable = false, length = 20)
    private PoolType poolType;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "investment_policy", columnDefinition = "TEXT")
    private String investmentPolicy;

    @Column(name = "restriction_details", columnDefinition = "TEXT")
    private String restrictionDetails;

    @Column(name = "total_pool_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalPoolBalance = BigDecimal.ZERO;

    @Column(name = "bank_share_percentage", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal bankSharePercentage = BigDecimal.ZERO;

    @Column(name = "profit_sharing_ratio_bank", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal profitSharingRatioBank = BigDecimal.ZERO;

    @Column(name = "profit_sharing_ratio_investors", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal profitSharingRatioInvestors = BigDecimal.ZERO;

    @Column(name = "per_policy_id")
    private Long perPolicyId;

    @Column(name = "irr_policy_id")
    private Long irrPolicyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "management_fee_type", length = 30)
    private ManagementFeeType managementFeeType;

    @Column(name = "management_fee_rate", precision = 18, scale = 6)
    @Builder.Default
    private BigDecimal managementFeeRate = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PoolStatus status = PoolStatus.ACTIVE;

    @Column(name = "inception_date", nullable = false)
    @Builder.Default
    private LocalDate inceptionDate = LocalDate.now();

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "fatwa_id")
    private Long fatwaId;

    @Column(name = "gl_asset_account_code", length = 20)
    private String glAssetAccountCode;

    @Column(name = "gl_liability_account_code", length = 20)
    private String glLiabilityAccountCode;

    @Column(name = "gl_profit_account_code", length = 20)
    private String glProfitAccountCode;

    @Column(name = "gl_per_account_code", length = 20)
    private String glPerAccountCode;

    @Column(name = "gl_irr_account_code", length = 20)
    private String glIrrAccountCode;

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
