package com.cbs.payments.entity;

import com.cbs.account.entity.Account;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "qr_code", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QrCode {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "qr_reference", nullable = false, unique = true, length = 40)
    private String qrReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "qr_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private QrType qrType;

    @Column(name = "amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "min_amount", precision = 18, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "max_amount", precision = 18, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "merchant_name", length = 200)
    private String merchantName;

    @Column(name = "merchant_category_code", length = 4)
    private String merchantCategoryCode;

    @Column(name = "payload_data", nullable = false, columnDefinition = "TEXT")
    private String payloadData;

    @Column(name = "valid_from", nullable = false)
    @Builder.Default
    private Instant validFrom = Instant.now();

    @Column(name = "valid_until")
    private Instant validUntil;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "current_uses", nullable = false)
    @Builder.Default
    private Integer currentUses = 0;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version @Column(name = "version")
    private Long version;

    public boolean isValid() {
        if (!"ACTIVE".equals(status)) return false;
        if (validUntil != null && Instant.now().isAfter(validUntil)) return false;
        if (maxUses != null && currentUses >= maxUses) return false;
        return true;
    }

    public void recordUse() {
        this.currentUses++;
        if (qrType == QrType.ONE_TIME || (maxUses != null && currentUses >= maxUses)) {
            this.status = "CONSUMED";
        }
    }
}
