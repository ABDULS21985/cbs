package com.cbs.positionmgmt.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "financial_position")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FinancialPosition extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String positionCode;
    @Column(nullable = false, length = 25) private String positionType;
    @Column(nullable = false, length = 20) private String positionCategory;
    @Column(nullable = false, length = 80) private String identifier;
    @Column(length = 200) private String identifierName;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private BigDecimal longPosition = BigDecimal.ZERO;
    @Builder.Default private BigDecimal shortPosition = BigDecimal.ZERO;
    @Builder.Default private BigDecimal netPosition = BigDecimal.ZERO;
    private BigDecimal positionLimit;
    private BigDecimal limitUtilizationPct;
    @Builder.Default private Boolean limitBreach = false;
    private BigDecimal avgCost;
    private BigDecimal markToMarket;
    private BigDecimal unrealizedPnl;
    @Column(nullable = false) private LocalDate positionDate;
}
