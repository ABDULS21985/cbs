package com.cbs.card.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "card", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Card extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "card_number_hash", nullable = false, length = 64)
    private String cardNumberHash;

    @Column(name = "card_number_masked", nullable = false, length = 20)
    private String cardNumberMasked;

    @Column(name = "card_reference", nullable = false, unique = true, length = 30)
    private String cardReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "card_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CardType cardType;

    @Column(name = "card_scheme", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CardScheme cardScheme;

    @Column(name = "card_tier", nullable = false, length = 20)
    @Builder.Default private String cardTier = "CLASSIC";

    @Column(name = "cardholder_name", nullable = false, length = 100)
    private String cardholderName;

    @Column(name = "issue_date", nullable = false)
    @Builder.Default private LocalDate issueDate = LocalDate.now();

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "last_used_date")
    private LocalDate lastUsedDate;

    // Limits
    @Column(name = "daily_pos_limit", precision = 18, scale = 2)
    private BigDecimal dailyPosLimit;

    @Column(name = "daily_atm_limit", precision = 18, scale = 2)
    private BigDecimal dailyAtmLimit;

    @Column(name = "daily_online_limit", precision = 18, scale = 2)
    private BigDecimal dailyOnlineLimit;

    @Column(name = "single_txn_limit", precision = 18, scale = 2)
    private BigDecimal singleTxnLimit;

    @Column(name = "monthly_limit", precision = 18, scale = 2)
    private BigDecimal monthlyLimit;

    // Credit card
    @Column(name = "credit_limit", precision = 18, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "available_credit", precision = 18, scale = 2)
    private BigDecimal availableCredit;

    @Column(name = "outstanding_balance", precision = 18, scale = 2)
    @Builder.Default private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @Column(name = "minimum_payment", precision = 18, scale = 2)
    private BigDecimal minimumPayment;

    @Column(name = "payment_due_date")
    private LocalDate paymentDueDate;

    @Column(name = "interest_rate", precision = 8, scale = 4)
    private BigDecimal interestRate;

    // Controls
    @Column(name = "is_contactless_enabled", nullable = false)
    @Builder.Default private Boolean isContactlessEnabled = true;

    @Column(name = "is_online_enabled", nullable = false)
    @Builder.Default private Boolean isOnlineEnabled = true;

    @Column(name = "is_international_enabled", nullable = false)
    @Builder.Default private Boolean isInternationalEnabled = false;

    @Column(name = "is_atm_enabled", nullable = false)
    @Builder.Default private Boolean isAtmEnabled = true;

    @Column(name = "is_pos_enabled", nullable = false)
    @Builder.Default private Boolean isPosEnabled = true;

    @Column(name = "pin_retries_remaining", nullable = false)
    @Builder.Default private Integer pinRetriesRemaining = 3;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default private CardStatus status = CardStatus.ACTIVE;

    @Column(name = "block_reason", length = 200)
    private String blockReason;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "branch_code", length = 20)
    private String branchCode;

    public boolean isActive() { return status == CardStatus.ACTIVE; }
    public boolean isExpired() { return LocalDate.now().isAfter(expiryDate); }

    public boolean canTransact(String channel, boolean international) {
        if (!isActive() || isExpired()) return false;
        if (international && !Boolean.TRUE.equals(isInternationalEnabled)) return false;
        return switch (channel) {
            case "ATM" -> Boolean.TRUE.equals(isAtmEnabled);
            case "POS" -> Boolean.TRUE.equals(isPosEnabled);
            case "ONLINE" -> Boolean.TRUE.equals(isOnlineEnabled);
            case "CONTACTLESS" -> Boolean.TRUE.equals(isContactlessEnabled);
            default -> true;
        };
    }

    public BigDecimal getChannelLimit(String channel) {
        return switch (channel) {
            case "ATM" -> dailyAtmLimit;
            case "POS" -> dailyPosLimit;
            case "ONLINE" -> dailyOnlineLimit;
            default -> singleTxnLimit;
        };
    }
}
