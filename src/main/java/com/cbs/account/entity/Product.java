package com.cbs.account.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "product_category", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ProductCategory productCategory;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "min_opening_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal minOpeningBalance = BigDecimal.ZERO;

    @Column(name = "min_operating_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal minOperatingBalance = BigDecimal.ZERO;

    @Column(name = "max_balance", precision = 18, scale = 2)
    private BigDecimal maxBalance;

    @Column(name = "allows_overdraft", nullable = false)
    @Builder.Default
    private Boolean allowsOverdraft = false;

    @Column(name = "max_overdraft_limit", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal maxOverdraftLimit = BigDecimal.ZERO;

    @Column(name = "allows_cheque_book", nullable = false)
    @Builder.Default
    private Boolean allowsChequeBook = false;

    @Column(name = "allows_debit_card", nullable = false)
    @Builder.Default
    private Boolean allowsDebitCard = false;

    @Column(name = "allows_mobile", nullable = false)
    @Builder.Default
    private Boolean allowsMobile = true;

    @Column(name = "allows_internet", nullable = false)
    @Builder.Default
    private Boolean allowsInternet = true;

    @Column(name = "allows_sweep", nullable = false)
    @Builder.Default
    private Boolean allowsSweep = false;

    @Column(name = "dormancy_days", nullable = false)
    @Builder.Default
    private Integer dormancyDays = 365;

    // Interest configuration
    @Column(name = "interest_bearing", nullable = false)
    @Builder.Default
    private Boolean interestBearing = false;

    @Column(name = "base_interest_rate", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal baseInterestRate = BigDecimal.ZERO;

    @Column(name = "interest_calc_method", length = 20)
    @Builder.Default
    private String interestCalcMethod = "DAILY_BALANCE";

    @Column(name = "interest_posting_frequency", length = 20)
    @Builder.Default
    private String interestPostingFrequency = "MONTHLY";

    @Column(name = "interest_accrual_method", length = 20)
    @Builder.Default
    private String interestAccrualMethod = "SIMPLE";

    // Fees
    @Column(name = "monthly_maintenance_fee", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal monthlyMaintenanceFee = BigDecimal.ZERO;

    @Column(name = "sms_alert_fee", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal smsAlertFee = BigDecimal.ZERO;

    // GL mapping
    @Column(name = "gl_account_code", length = 20)
    private String glAccountCode;

    @Column(name = "gl_interest_expense_code", length = 20)
    private String glInterestExpenseCode;

    @Column(name = "gl_interest_payable_code", length = 20)
    private String glInterestPayableCode;

    @Column(name = "gl_fee_income_code", length = 20)
    private String glFeeIncomeCode;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InterestTier> interestTiers = new ArrayList<>();

    public void addInterestTier(InterestTier tier) {
        interestTiers.add(tier);
        tier.setProduct(this);
    }

    public boolean isCurrentAccount() {
        return productCategory == ProductCategory.CURRENT;
    }

    public boolean isSavingsAccount() {
        return productCategory == ProductCategory.SAVINGS;
    }
}
