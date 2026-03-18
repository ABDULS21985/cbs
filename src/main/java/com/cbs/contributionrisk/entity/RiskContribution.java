package com.cbs.contributionrisk.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "risk_contribution") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class RiskContribution extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String contributionCode;
    @Column(nullable = false) private LocalDate calcDate;
    @Column(nullable = false, length = 30) private String portfolioCode;
    @Column(length = 60) private String businessUnit;
    @Column(length = 80) private String positionIdentifier;
    @Column(length = 200) private String positionName;
    @Column(nullable = false, length = 20) private String riskMeasure;
    private BigDecimal standaloneRisk;
    @Column(nullable = false) private BigDecimal marginalContribution;
    private BigDecimal incrementalContribution;
    private BigDecimal componentContribution;
    private BigDecimal contributionPct;
    private BigDecimal diversificationBenefit;
    private BigDecimal correlationToPortfolio;
    private BigDecimal totalPortfolioRisk;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "CALCULATED";
}
