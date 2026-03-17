package com.cbs.account.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "account", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_number", nullable = false, unique = true, length = 20)
    private String accountNumber;

    @Column(name = "account_name", nullable = false, length = 200)
    private String accountName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "account_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private AccountType accountType;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AccountStatus status = AccountStatus.ACTIVE;

    // Balances
    @Column(name = "book_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal bookBalance = BigDecimal.ZERO;

    @Column(name = "available_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "lien_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal lienAmount = BigDecimal.ZERO;

    @Column(name = "overdraft_limit", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal overdraftLimit = BigDecimal.ZERO;

    // Interest state
    @Column(name = "accrued_interest", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "last_interest_calc_date")
    private LocalDate lastInterestCalcDate;

    @Column(name = "last_interest_post_date")
    private LocalDate lastInterestPostDate;

    @Column(name = "applicable_interest_rate", precision = 8, scale = 4)
    @Builder.Default
    private BigDecimal applicableInterestRate = BigDecimal.ZERO;

    // Lifecycle dates
    @Column(name = "opened_date", nullable = false)
    @Builder.Default
    private LocalDate openedDate = LocalDate.now();

    @Column(name = "activated_date")
    private LocalDate activatedDate;

    @Column(name = "last_transaction_date")
    private LocalDate lastTransactionDate;

    @Column(name = "dormancy_date")
    private LocalDate dormancyDate;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    // Operational
    @Column(name = "branch_code", length = 10)
    private String branchCode;

    @Column(name = "relationship_manager", length = 100)
    private String relationshipManager;

    @Column(name = "statement_frequency", length = 20)
    @Builder.Default
    private String statementFrequency = "MONTHLY";

    @Column(name = "allow_debit", nullable = false)
    @Builder.Default
    private Boolean allowDebit = true;

    @Column(name = "allow_credit", nullable = false)
    @Builder.Default
    private Boolean allowCredit = true;

    @Column(name = "requires_mandate", nullable = false)
    @Builder.Default
    private Boolean requiresMandate = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AccountSignatory> signatories = new ArrayList<>();

    // ========================================================================
    // BALANCE OPERATIONS (transaction-safe)
    // ========================================================================

    public void credit(BigDecimal amount) {
        this.bookBalance = this.bookBalance.add(amount);
        recalculateAvailableBalance();
        this.lastTransactionDate = LocalDate.now();
    }

    public void debit(BigDecimal amount) {
        this.bookBalance = this.bookBalance.subtract(amount);
        recalculateAvailableBalance();
        this.lastTransactionDate = LocalDate.now();
    }

    public void placeLien(BigDecimal amount) {
        this.lienAmount = this.lienAmount.add(amount);
        recalculateAvailableBalance();
    }

    public void releaseLien(BigDecimal amount) {
        this.lienAmount = this.lienAmount.subtract(amount);
        if (this.lienAmount.compareTo(BigDecimal.ZERO) < 0) {
            this.lienAmount = BigDecimal.ZERO;
        }
        recalculateAvailableBalance();
    }

    private void recalculateAvailableBalance() {
        this.availableBalance = this.bookBalance
                .subtract(this.lienAmount)
                .add(this.overdraftLimit);
    }

    public boolean hasSufficientBalance(BigDecimal amount) {
        return this.availableBalance.compareTo(amount) >= 0;
    }

    public boolean isActive() {
        return this.status == AccountStatus.ACTIVE;
    }

    public boolean isDebitAllowed() {
        return Boolean.TRUE.equals(allowDebit) && status != AccountStatus.FROZEN
                && status != AccountStatus.PND_DEBIT && status != AccountStatus.CLOSED;
    }

    public boolean isCreditAllowed() {
        return Boolean.TRUE.equals(allowCredit) && status != AccountStatus.FROZEN
                && status != AccountStatus.PND_CREDIT && status != AccountStatus.CLOSED;
    }

    public void addSignatory(AccountSignatory signatory) {
        signatories.add(signatory);
        signatory.setAccount(this);
    }
}
