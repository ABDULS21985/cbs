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
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recurring_deposit", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RecurringDeposit extends AuditableEntity {

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

    @Column(name = "installment_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal installmentAmount;

    @Column(name = "frequency", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DepositFrequency frequency;

    @Column(name = "total_installments", nullable = false)
    private Integer totalInstallments;

    @Column(name = "completed_installments", nullable = false)
    @Builder.Default
    private Integer completedInstallments = 0;

    @Column(name = "missed_installments", nullable = false)
    @Builder.Default
    private Integer missedInstallments = 0;

    @Column(name = "next_due_date", nullable = false)
    private LocalDate nextDueDate;

    @Column(name = "total_deposited", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalDeposited = BigDecimal.ZERO;

    @Column(name = "accrued_interest", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "total_interest_earned", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalInterestEarned = BigDecimal.ZERO;

    @Column(name = "current_value", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal currentValue = BigDecimal.ZERO;

    @Column(name = "interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "day_count_convention", nullable = false, length = 20)
    @Builder.Default
    private String dayCountConvention = "ACT_365";

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "penalty_free", nullable = false)
    @Builder.Default
    private Boolean penaltyFree = false;

    @Column(name = "missed_penalty_rate", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal missedPenaltyRate = BigDecimal.ZERO;

    @Column(name = "total_penalties", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalPenalties = BigDecimal.ZERO;

    @Column(name = "maturity_action", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MaturityAction maturityAction = MaturityAction.CREDIT_ACCOUNT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_account_id")
    private Account payoutAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_account_id")
    private Account debitAccount;

    @Column(name = "auto_debit", nullable = false)
    @Builder.Default
    private Boolean autoDebit = true;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RecurringDepositStatus status = RecurringDepositStatus.ACTIVE;

    @OneToMany(mappedBy = "recurringDeposit", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RecurringDepositInstallment> installments = new ArrayList<>();

    public void addInstallment(RecurringDepositInstallment installment) {
        installments.add(installment);
        installment.setRecurringDeposit(this);
    }

    public LocalDate calculateNextDueDate() {
        return switch (frequency) {
            case WEEKLY -> nextDueDate.plusWeeks(1);
            case BI_WEEKLY -> nextDueDate.plusWeeks(2);
            case MONTHLY -> nextDueDate.plusMonths(1);
            case QUARTERLY -> nextDueDate.plusMonths(3);
        };
    }
}
