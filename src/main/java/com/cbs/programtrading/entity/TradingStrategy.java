package com.cbs.programtrading.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "trading_strategy")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TradingStrategy extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String strategyCode;

    @Column(nullable = false, length = 200)
    private String strategyName;

    @Column(nullable = false, length = 25)
    private String strategyType;

    private Long deskId;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> instrumentScope;

    @Column(length = 30)
    private String executionAlgorithm;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> parameters;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> riskLimits;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> preTradeChecks;

    @Column(length = 80)
    private String approvedBy;

    private LocalDate approvalDate;

    @Column(length = 10)
    private String modelRiskTier;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";
}
