package com.cbs.card.entity;

import com.cbs.account.entity.Account;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "card_transaction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 40)
    private String transactionRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "transaction_type", nullable = false, length = 20)
    private String transactionType;

    @Column(name = "channel", nullable = false, length = 20)
    private String channel;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "billing_amount", precision = 18, scale = 2)
    private BigDecimal billingAmount;

    @Column(name = "billing_currency", length = 3)
    private String billingCurrency;

    @Column(name = "fx_rate", precision = 18, scale = 8)
    private BigDecimal fxRate;

    @Column(name = "merchant_name", length = 200)
    private String merchantName;

    @Column(name = "merchant_id", length = 30)
    private String merchantId;

    @Column(name = "merchant_category_code", length = 4)
    private String merchantCategoryCode;

    @Column(name = "terminal_id", length = 20)
    private String terminalId;

    @Column(name = "merchant_city", length = 100)
    private String merchantCity;

    @Column(name = "merchant_country", length = 3)
    private String merchantCountry;

    @Column(name = "is_international", nullable = false)
    @Builder.Default private Boolean isInternational = false;

    @Column(name = "auth_code", length = 10)
    private String authCode;

    @Column(name = "response_code", length = 4)
    private String responseCode;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default private String status = "PENDING";

    @Column(name = "decline_reason", length = 200)
    private String declineReason;

    @Column(name = "is_disputed", nullable = false)
    @Builder.Default private Boolean isDisputed = false;

    @Column(name = "dispute_reason", length = 300)
    private String disputeReason;

    @Column(name = "dispute_date")
    private LocalDate disputeDate;

    @Column(name = "transaction_date", nullable = false)
    @Builder.Default private Instant transactionDate = Instant.now();

    @Column(name = "settlement_date")
    private LocalDate settlementDate;

    @Column(name = "created_at", nullable = false)
    @Builder.Default private Instant createdAt = Instant.now();

    @Version @Column(name = "version")
    private Long version;
}
