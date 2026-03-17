package com.cbs.goal.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "savings_goal", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SavingsGoal extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "goal_number", nullable = false, unique = true, length = 30)
    private String goalNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "goal_name", nullable = false, length = 100)
    private String goalName;

    @Column(name = "goal_description", columnDefinition = "TEXT")
    private String goalDescription;

    @Column(name = "goal_icon", length = 50)
    private String goalIcon;

    @Column(name = "target_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "current_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @Column(name = "progress_percentage", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    @Column(name = "auto_debit_enabled", nullable = false)
    @Builder.Default
    private Boolean autoDebitEnabled = false;

    @Column(name = "auto_debit_amount", precision = 18, scale = 2)
    private BigDecimal autoDebitAmount;

    @Column(name = "auto_debit_frequency", length = 20)
    private String autoDebitFrequency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auto_debit_account_id")
    private Account autoDebitAccount;

    @Column(name = "next_auto_debit_date")
    private LocalDate nextAutoDebitDate;

    @Column(name = "interest_bearing", nullable = false)
    @Builder.Default
    private Boolean interestBearing = false;

    @Column(name = "interest_rate", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal interestRate = BigDecimal.ZERO;

    @Column(name = "accrued_interest", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private GoalStatus status = GoalStatus.ACTIVE;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private Boolean isLocked = false;

    @Column(name = "allow_withdrawal_before_target", nullable = false)
    @Builder.Default
    private Boolean allowWithdrawalBeforeTarget = true;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @OneToMany(mappedBy = "savingsGoal", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SavingsGoalTransaction> transactions = new ArrayList<>();

    public void deposit(BigDecimal amount) {
        this.currentAmount = this.currentAmount.add(amount);
        recalculateProgress();
    }

    public void withdraw(BigDecimal amount) {
        this.currentAmount = this.currentAmount.subtract(amount);
        if (this.currentAmount.compareTo(BigDecimal.ZERO) < 0) {
            this.currentAmount = BigDecimal.ZERO;
        }
        recalculateProgress();
    }

    public void recalculateProgress() {
        if (targetAmount.compareTo(BigDecimal.ZERO) > 0) {
            this.progressPercentage = currentAmount
                    .multiply(BigDecimal.valueOf(100))
                    .divide(targetAmount, 2, RoundingMode.HALF_UP);
            if (this.progressPercentage.compareTo(BigDecimal.valueOf(100)) > 0) {
                this.progressPercentage = BigDecimal.valueOf(100);
            }
        }
        if (currentAmount.compareTo(targetAmount) >= 0 && status == GoalStatus.ACTIVE) {
            this.status = GoalStatus.COMPLETED;
            this.completedDate = LocalDate.now();
        }
    }

    public boolean isCompleted() {
        return currentAmount.compareTo(targetAmount) >= 0;
    }
}
