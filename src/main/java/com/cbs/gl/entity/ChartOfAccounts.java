package com.cbs.gl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

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
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;
}
