package com.cbs.fixedincome.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "coupon_payment", schema = "cbs", uniqueConstraints = @UniqueConstraint(columnNames = {"holding_id","coupon_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CouponPayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "holding_id", nullable = false) private Long holdingId;
    @Column(name = "coupon_date", nullable = false) private LocalDate couponDate;
    @Column(name = "coupon_amount", nullable = false, precision = 18, scale = 2) private BigDecimal couponAmount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "PROJECTED";
    @Column(name = "received_date") private LocalDate receivedDate;
    @Column(name = "journal_id") private Long journalId;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
}
