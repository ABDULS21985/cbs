package com.cbs.secposition.entity;

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
@Table(name = "valuation_run")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ValuationRun extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String runRef;

    private LocalDate valuationDate;

    private Long modelId;

    @Column(length = 15)
    private String runType;

    @Builder.Default
    private Integer instrumentsValued = 0;

    private BigDecimal totalMarketValue;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    private BigDecimal unrealizedGainLoss;

    @Column(name = "fair_value_level1_total")
    private BigDecimal fairValueLevel1Total;

    @Column(name = "fair_value_level2_total")
    private BigDecimal fairValueLevel2Total;

    @Column(name = "fair_value_level3_total")
    private BigDecimal fairValueLevel3Total;

    @Builder.Default
    private Integer ipvBreachCount = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> pricingExceptions;

    private Instant runStartedAt;

    private Instant runCompletedAt;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "RUNNING";
}
