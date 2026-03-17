package com.cbs.payments.entity;

import com.cbs.account.entity.Account;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "mobile_money_link", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"account_id","provider","mobile_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MobileMoneyLink {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "provider", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private MobileMoneyProvider provider;

    @Column(name = "mobile_number", nullable = false, length = 20)
    private String mobileNumber;

    @Column(name = "wallet_id", length = 50)
    private String walletId;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "daily_limit", precision = 18, scale = 2)
    private BigDecimal dailyLimit;

    @Column(name = "monthly_limit", precision = 18, scale = 2)
    private BigDecimal monthlyLimit;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING_VERIFICATION";

    @Column(name = "linked_at", nullable = false)
    @Builder.Default
    private Instant linkedAt = Instant.now();

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version @Column(name = "version")
    private Long version;
}
