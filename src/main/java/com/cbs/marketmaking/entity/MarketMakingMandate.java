package com.cbs.marketmaking.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "market_making_mandate")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketMakingMandate extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String mandateCode;

    @Column(length = 200)
    private String mandateName;

    @Column(nullable = false, length = 20)
    private String instrumentType;

    @Column(length = 30)
    private String instrumentCode;

    @Column(length = 60)
    private String exchange;

    @Column(nullable = false, length = 15)
    private String mandateType;

    @Column(nullable = false)
    private Long deskId;

    @Column(nullable = false, length = 15)
    private String quoteObligation;

    private BigDecimal minQuoteSize;
    private BigDecimal maxQuoteSize;
    private BigDecimal maxSpreadBps;
    private Integer minQuoteDurationSeconds;
    private Integer dailyQuoteHours;
    private BigDecimal inventoryLimit;

    @Column(length = 20)
    private String hedgingStrategy;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> performanceMetrics;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Column(length = 80)
    private String regulatoryRef;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";
}
