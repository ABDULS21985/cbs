package com.cbs.marketorder.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "market_order")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketOrder extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String orderRef;

    @Column(nullable = false, length = 15)
    private String orderSource;

    private Long customerId;

    @Column(length = 80)
    private String dealerId;

    private Long deskId;

    @Column(length = 30)
    private String portfolioCode;

    @Column(nullable = false, length = 20)
    private String orderType;

    @Column(nullable = false, length = 4)
    private String side;

    @Column(nullable = false, length = 20)
    private String instrumentType;

    @Column(nullable = false, length = 30)
    private String instrumentCode;

    @Column(length = 300)
    private String instrumentName;

    @Column(length = 60)
    private String exchange;

    @Column(nullable = false)
    private BigDecimal quantity;

    private BigDecimal limitPrice;
    private BigDecimal stopPrice;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String timeInForce = "DAY";

    private LocalDate expiryDate;

    @Builder.Default
    private BigDecimal filledQuantity = BigDecimal.ZERO;

    private BigDecimal avgFilledPrice;

    @Builder.Default
    private BigDecimal filledAmount = BigDecimal.ZERO;

    private BigDecimal remainingQuantity;
    private BigDecimal commissionAmount;

    @Column(length = 3)
    private String commissionCurrency;

    private Long suitabilityCheckId;

    @Column(length = 10)
    private String suitabilityResult;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> validationErrors;

    @Column(length = 60)
    private String routedTo;

    private Instant routedAt;
    private Instant filledAt;
    private String cancelledReason;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "NEW";
}
