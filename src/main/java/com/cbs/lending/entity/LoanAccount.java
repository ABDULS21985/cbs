package com.cbs.lending.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "loan_account", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LoanAccount extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "loan_number", nullable = false, unique = true, length = 30)
    private String loanNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    private LoanApplication application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_product_id", nullable = false)
    private LoanProduct loanProduct;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disbursement_account_id")
    private Account disbursementAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repayment_account_id")
    private Account repaymentAccount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "sanctioned_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal sanctionedAmount;

    @Column(name = "disbursed_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal disbursedAmount = BigDecimal.ZERO;

    @Column(name = "outstanding_principal", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal outstandingPrincipal = BigDecimal.ZERO;

    @Column(name = "interest_rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "rate_type", nullable = false, length = 20)
    @Builder.Default
    private String rateType = "FIXED";

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

    @Column(name = "repayment_schedule_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RepaymentScheduleType repaymentScheduleType = RepaymentScheduleType.EQUAL_INSTALLMENT;

    @Column(name = "repayment_frequency", nullable = false, length = 20)
    @Builder.Default
    private String repaymentFrequency = "MONTHLY";

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths;

    @Column(name = "total_installments", nullable = false)
    private Integer totalInstallments;

    @Column(name = "paid_installments", nullable = false)
    @Builder.Default
    private Integer paidInstallments = 0;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "emi_amount", precision = 18, scale = 2)
    private BigDecimal emiAmount;

    // Islamic
    @Column(name = "is_islamic", nullable = false)
    @Builder.Default
    private Boolean isIslamic = false;

    @Column(name = "islamic_structure", length = 30)
    private String islamicStructure;

    @Column(name = "total_profit", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalProfit = BigDecimal.ZERO;

    @Column(name = "profit_paid", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal profitPaid = BigDecimal.ZERO;

    // Delinquency
    @Column(name = "days_past_due", nullable = false)
    @Builder.Default
    private Integer daysPastDue = 0;

    @Column(name = "delinquency_bucket", length = 10)
    @Builder.Default
    private String delinquencyBucket = "CURRENT";

    @Column(name = "ifrs9_stage", nullable = false)
    @Builder.Default
    private Integer ifrs9Stage = 1;

    @Column(name = "provision_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal provisionAmount = BigDecimal.ZERO;

    // Penalties
    @Column(name = "total_penalties", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalPenalties = BigDecimal.ZERO;

    @Column(name = "total_penalties_paid", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalPenaltiesPaid = BigDecimal.ZERO;

    // Dates
    @Column(name = "disbursement_date")
    private LocalDate disbursementDate;

    @Column(name = "first_repayment_date")
    private LocalDate firstRepaymentDate;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "last_payment_date")
    private LocalDate lastPaymentDate;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LoanAccountStatus status = LoanAccountStatus.PENDING_DISBURSEMENT;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    @Column(name = "branch_code", length = 20)
    private String branchCode;

    @Column(name = "relationship_manager", length = 100)
    private String relationshipManager;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @OneToMany(mappedBy = "loanAccount", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LoanRepaymentSchedule> repaymentSchedules = new ArrayList<>();

    @OneToMany(mappedBy = "loanAccount", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LoanCollateralLink> collateralLinks = new ArrayList<>();

    public void addScheduleEntry(LoanRepaymentSchedule entry) {
        repaymentSchedules.add(entry);
        entry.setLoanAccount(this);
    }

    public void updateDelinquency() {
        if (daysPastDue <= 0) {
            delinquencyBucket = "CURRENT";
            ifrs9Stage = 1;
        } else if (daysPastDue <= 30) {
            delinquencyBucket = "1-30";
            ifrs9Stage = 1;
        } else if (daysPastDue <= 60) {
            delinquencyBucket = "31-60";
            ifrs9Stage = 2;
        } else if (daysPastDue <= 90) {
            delinquencyBucket = "61-90";
            ifrs9Stage = 2;
        } else if (daysPastDue <= 180) {
            delinquencyBucket = "91-180";
            ifrs9Stage = 3;
        } else {
            delinquencyBucket = "180+";
            ifrs9Stage = 3;
        }
    }

    public boolean isActive() {
        return status == LoanAccountStatus.ACTIVE || status == LoanAccountStatus.DELINQUENT;
    }
}
