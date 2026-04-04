package com.cbs.gl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity @Table(name = "chart_of_accounts", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChartOfAccounts {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "gl_code", nullable = false, unique = true, length = 20) private String glCode;
    @Column(name = "gl_name", nullable = false, length = 200) private String glName;
    @Column(name = "gl_category", nullable = false, length = 20) @Enumerated(EnumType.STRING) private GlCategory glCategory;
    @Column(name = "gl_sub_category", length = 30) private String glSubCategory;
    @Column(name = "parent_gl_code", length = 20) private String parentGlCode;
    @Column(name = "level_number", nullable = false) @Builder.Default private Integer levelNumber = 1;
    @Column(name = "is_header", nullable = false) @Builder.Default private Boolean isHeader = false;
    @Column(name = "is_postable", nullable = false) @Builder.Default private Boolean isPostable = true;
    @Column(name = "currency_code", length = 3) private String currencyCode;
    @Column(name = "is_multi_currency", nullable = false) @Builder.Default private Boolean isMultiCurrency = false;
    @Column(name = "branch_code", length = 20) private String branchCode;
    @Column(name = "is_inter_branch", nullable = false) @Builder.Default private Boolean isInterBranch = false;
    @Column(name = "normal_balance", nullable = false, length = 6) @Enumerated(EnumType.STRING) private NormalBalance normalBalance;
    @Column(name = "allow_manual_posting", nullable = false) @Builder.Default private Boolean allowManualPosting = true;
    @Column(name = "requires_cost_centre", nullable = false) @Builder.Default private Boolean requiresCostCentre = false;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "islamic_account_category", length = 80)
    @Enumerated(EnumType.STRING)
    private IslamicAccountCategory islamicAccountCategory;
    @Column(name = "contract_type_code", length = 30) private String contractTypeCode;
    @Column(name = "investment_pool_id") private Long investmentPoolId;
    @Column(name = "shariah_classification", length = 30)
    @Enumerated(EnumType.STRING)
    private ShariahClassification shariahClassification;
    @Column(name = "is_islamic_account", nullable = false) @Builder.Default private Boolean isIslamicAccount = false;
    @Column(name = "aaoifi_reference", length = 120) private String aaoifiReference;
    @Column(name = "aaoifi_line_item", length = 120) private String aaoifiLineItem;
    @Column(name = "profit_distribution_eligible", nullable = false) @Builder.Default private Boolean profitDistributionEligible = false;
    @Column(name = "profit_distribution_pool", length = 60) private String profitDistributionPool;
    @Column(name = "zakat_applicable", nullable = false) @Builder.Default private Boolean zakatApplicable = false;
    @Column(name = "purification_percentage", precision = 8, scale = 4) private BigDecimal purificationPercentage;
    @Column(name = "contra_account_code", length = 20) private String contraAccountCode;
    @Column(name = "is_reserve_account", nullable = false) @Builder.Default private Boolean isReserveAccount = false;
    @Column(name = "reserve_type", length = 10)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReserveType reserveType = ReserveType.NONE;
    @Column(name = "last_review_date") private LocalDate lastReviewDate;
    @Column(name = "next_review_date") private LocalDate nextReviewDate;
    @Column(name = "reviewed_by", length = 100) private String reviewedBy;
    @Column(name = "notes", columnDefinition = "TEXT") private String notes;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;
}
