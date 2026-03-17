package com.cbs.overdraft.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "credit_facility", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CreditFacility extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "facility_number", nullable = false, unique = true, length = 30)
    private String facilityNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "facility_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private FacilityType facilityType;

    @Column(name = "sanctioned_limit", nullable = false, precision = 18, scale = 2)
    private BigDecimal sanctionedLimit;

    @Column(name = "available_limit", nullable = false, precision = 18, scale = 2)
    private BigDecimal availableLimit;

    @Column(name = "utilized_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal utilizedAmount = BigDecimal.ZERO;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "penalty_rate", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal penaltyRate = BigDecimal.ZERO;

    @Column(name = "day_count_convention", nullable = false, length = 20)
    @Builder.Default
    private String dayCountConvention = "ACT_365";

    @Column(name = "accrued_interest", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "total_interest_charged", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalInterestCharged = BigDecimal.ZERO;

    @Column(name = "total_interest_paid", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalInterestPaid = BigDecimal.ZERO;

    @Column(name = "interest_posting_day")
    @Builder.Default
    private Integer interestPostingDay = 1;

    @Column(name = "effective_date", nullable = false)
    @Builder.Default
    private LocalDate effectiveDate = LocalDate.now();

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "last_review_date")
    private LocalDate lastReviewDate;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "auto_renewal", nullable = false)
    @Builder.Default
    private Boolean autoRenewal = false;

    @Column(name = "renewal_count", nullable = false)
    @Builder.Default
    private Integer renewalCount = 0;

    @Column(name = "max_renewals")
    private Integer maxRenewals;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FacilityStatus status = FacilityStatus.ACTIVE;

    @OneToMany(mappedBy = "facility", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<FacilityUtilizationLog> utilizationLogs = new ArrayList<>();

    public void drawdown(BigDecimal amount) {
        this.utilizedAmount = this.utilizedAmount.add(amount);
        this.availableLimit = this.sanctionedLimit.subtract(this.utilizedAmount);
    }

    public void repay(BigDecimal amount) {
        this.utilizedAmount = this.utilizedAmount.subtract(amount);
        if (this.utilizedAmount.compareTo(BigDecimal.ZERO) < 0) {
            this.utilizedAmount = BigDecimal.ZERO;
        }
        this.availableLimit = this.sanctionedLimit.subtract(this.utilizedAmount);
    }

    public boolean hasAvailableLimit(BigDecimal amount) {
        return this.availableLimit.compareTo(amount) >= 0;
    }

    public boolean isExpired() {
        return LocalDate.now().isAfter(expiryDate);
    }

    public boolean isActive() {
        return status == FacilityStatus.ACTIVE && !isExpired();
    }
}
