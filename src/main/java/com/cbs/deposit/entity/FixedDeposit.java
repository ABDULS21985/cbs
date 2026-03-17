package com.cbs.deposit.entity;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "fixed_deposit", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FixedDeposit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deposit_number", nullable = false, unique = true, length = 30)
    private String depositNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "principal_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "current_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal currentValue;

    @Column(name = "accrued_interest", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "total_interest_earned", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalInterestEarned = BigDecimal.ZERO;

    @Column(name = "interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "effective_rate", precision = 8, scale = 4)
    private BigDecimal effectiveRate;

    @Column(name = "day_count_convention", nullable = false, length = 20)
    @Builder.Default
    private String dayCountConvention = "ACT_365";

    @Column(name = "compounding_frequency", nullable = false, length = 20)
    @Builder.Default
    private String compoundingFrequency = "NONE";

    @Column(name = "tenure_days", nullable = false)
    private Integer tenureDays;

    @Column(name = "tenure_months")
    private Integer tenureMonths;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "maturity_action", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MaturityAction maturityAction = MaturityAction.CREDIT_ACCOUNT;

    @Column(name = "rollover_count", nullable = false)
    @Builder.Default
    private Integer rolloverCount = 0;

    @Column(name = "max_rollovers")
    private Integer maxRollovers;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rollover_product_id")
    private Product rolloverProduct;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_account_id")
    private Account payoutAccount;

    @Column(name = "allows_early_termination", nullable = false)
    @Builder.Default
    private Boolean allowsEarlyTermination = true;

    @Column(name = "early_termination_penalty_type", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PenaltyType earlyTerminationPenaltyType = PenaltyType.RATE_REDUCTION;

    @Column(name = "early_termination_penalty_value", precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal earlyTerminationPenaltyValue = BigDecimal.ZERO;

    @Column(name = "allows_partial_liquidation", nullable = false)
    @Builder.Default
    private Boolean allowsPartialLiquidation = false;

    @Column(name = "min_partial_amount", precision = 18, scale = 2)
    private BigDecimal minPartialAmount;

    @Column(name = "min_remaining_balance", precision = 18, scale = 2)
    private BigDecimal minRemainingBalance;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FixedDepositStatus status = FixedDepositStatus.ACTIVE;

    @Column(name = "broken_date")
    private LocalDate brokenDate;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funding_account_id")
    private Account fundingAccount;

    public boolean isMatured() {
        return !LocalDate.now().isBefore(maturityDate);
    }

    public boolean isActive() {
        return status == FixedDepositStatus.ACTIVE;
    }

    public long daysElapsed() {
        return java.time.temporal.ChronoUnit.DAYS.between(startDate, LocalDate.now());
    }

    public long daysRemaining() {
        long remaining = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), maturityDate);
        return Math.max(0, remaining);
    }
}
