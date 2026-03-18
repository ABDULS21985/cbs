package com.cbs.investportfolio.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "investment_portfolio")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class InvestPortfolio extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String portfolioCode;

    @Column(nullable = false, length = 200)
    private String portfolioName;

    @JsonIgnore
    @Column(name = "ifrs9_classification", nullable = false, length = 30)
    @Builder.Default
    private String ifrs9Classification = "FVTPL";

    @JsonIgnore
    @Column(name = "business_model", nullable = false, length = 30)
    @Builder.Default
    private String businessModel = "TRADING";

    @JsonIgnore
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    private Long customerId;

    @Column(length = 20)
    private String portfolioType;

    @Column(length = 20)
    private String riskProfile;

    @Column(length = 30)
    private String investmentObjective;

    @Column(name = "currency_code", length = 3)
    @Builder.Default
    private String currency = "USD";

    private BigDecimal initialInvestment;

    @Builder.Default
    private BigDecimal currentValue = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalContributions = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalWithdrawals = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal unrealizedGainLoss = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal realizedGainLossYtd = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> targetAllocation;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> currentAllocation;

    private BigDecimal rebalanceThresholdPct;

    private Instant lastRebalancedAt;

    private BigDecimal returnMtdPct;
    private BigDecimal returnYtdPct;
    private BigDecimal returnSinceInception;

    @Column(length = 40)
    private String benchmarkCode;

    private BigDecimal benchmarkReturnYtd;

    private BigDecimal managementFeePct;
    private BigDecimal performanceFeePct;

    @Builder.Default
    private BigDecimal feesChargedYtd = BigDecimal.ZERO;

    @Column(length = 80)
    private String portfolioManagerId;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";

    private Instant openedAt;
    private Instant closedAt;
}
