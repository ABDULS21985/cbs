package com.cbs.orderexecution.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "order_execution")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String executionRef;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false, length = 15)
    private String executionType;

    @Column(nullable = false, length = 60)
    private String executionVenue;

    @Column(nullable = false)
    private BigDecimal executionPrice;

    @Column(nullable = false)
    private BigDecimal executionQuantity;

    @Column(nullable = false)
    private BigDecimal executionAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(length = 30)
    private String counterpartyCode;

    @Column(length = 200)
    private String counterpartyName;

    private BigDecimal commissionCharged;
    private BigDecimal stampDuty;
    private BigDecimal levyAmount;
    private BigDecimal netSettlementAmount;

    @Column(nullable = false)
    private LocalDate tradeDate;

    @Column(nullable = false)
    private LocalDate settlementDate;

    @Column(length = 5)
    private String settlementCycle;

    @Column(length = 30)
    private String confirmationRef;

    @Column(nullable = false)
    private Instant executedAt;

    @Builder.Default
    private Boolean reportedToExchange = false;

    private Instant reportedAt;

    @Column(length = 30)
    private String exchangeTradeId;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "EXECUTED";

    @Builder.Default
    private Instant createdAt = Instant.now();
}
