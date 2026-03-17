package com.cbs.lending.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "loan_product", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanProduct extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "loan_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private LoanType loanType;

    @Column(name = "target_segment", nullable = false, length = 20)
    private String targetSegment;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "min_interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal minInterestRate;

    @Column(name = "max_interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal maxInterestRate;

    @Column(name = "default_interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal defaultInterestRate;

    @Column(name = "rate_type", nullable = false, length = 20)
    @Builder.Default
    private String rateType = "FIXED";

    @Column(name = "day_count_convention", nullable = false, length = 20)
    @Builder.Default
    private String dayCountConvention = "ACT_365";

    @Column(name = "min_loan_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal minLoanAmount;

    @Column(name = "max_loan_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal maxLoanAmount;

    @Column(name = "min_tenure_months", nullable = false)
    private Integer minTenureMonths;

    @Column(name = "max_tenure_months", nullable = false)
    private Integer maxTenureMonths;

    @Column(name = "allowed_schedules", length = 200)
    @Builder.Default
    private String allowedSchedules = "EQUAL_INSTALLMENT,EQUAL_PRINCIPAL,BULLET,BALLOON";

    @Column(name = "repayment_frequency", length = 20)
    @Builder.Default
    private String repaymentFrequency = "MONTHLY";

    @Column(name = "requires_collateral", nullable = false)
    @Builder.Default
    private Boolean requiresCollateral = false;

    @Column(name = "min_collateral_coverage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal minCollateralCoverage = new BigDecimal("100");

    @Column(name = "processing_fee_pct", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal processingFeePct = BigDecimal.ZERO;

    @Column(name = "processing_fee_flat", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal processingFeeFlat = BigDecimal.ZERO;

    @Column(name = "insurance_required", nullable = false)
    @Builder.Default
    private Boolean insuranceRequired = false;

    @Column(name = "is_islamic", nullable = false)
    @Builder.Default
    private Boolean isIslamic = false;

    @Column(name = "profit_sharing_ratio", length = 20)
    private String profitSharingRatio;

    @Column(name = "stage1_provision_pct", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal stage1ProvisionPct = new BigDecimal("1.00");

    @Column(name = "stage2_provision_pct", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal stage2ProvisionPct = new BigDecimal("5.00");

    @Column(name = "stage3_provision_pct", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal stage3ProvisionPct = new BigDecimal("20.00");

    @Column(name = "gl_loan_asset_code", length = 20)
    private String glLoanAssetCode;

    @Column(name = "gl_interest_income_code", length = 20)
    private String glInterestIncomeCode;

    @Column(name = "gl_provision_code", length = 20)
    private String glProvisionCode;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
