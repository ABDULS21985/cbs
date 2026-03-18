package com.cbs.secposition.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "instrument_valuation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InstrumentValuation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long runId;

    @Column(length = 30)
    private String instrumentCode;

    @Column(length = 12)
    private String isin;

    @Column(length = 30)
    private String modelUsed;

    @Column(length = 10)
    private String fairValueLevel;

    private BigDecimal modelPrice;

    private BigDecimal marketPrice;

    private BigDecimal priceDeviation;

    @Builder.Default
    private Boolean deviationBreached = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> inputsUsed;

    private BigDecimal sensitivityDelta;

    private BigDecimal sensitivityGamma;

    private BigDecimal sensitivityVega;

    private BigDecimal duration;

    private BigDecimal modifiedDuration;

    private BigDecimal convexity;

    private BigDecimal yieldToMaturity;

    private BigDecimal spreadToBenchmark;

    @Column(length = 20)
    private String dayCountConvention;

    private Integer accrualDays;

    private BigDecimal accruedAmount;

    private BigDecimal cleanPrice;

    private BigDecimal dirtyPrice;

    private BigDecimal previousValuation;

    private BigDecimal valuationChange;

    @Column(length = 15)
    @Builder.Default
    private String status = "PRICED";

    @Builder.Default
    private Instant createdAt = Instant.now();
}
