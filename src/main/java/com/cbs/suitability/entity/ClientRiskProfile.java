package com.cbs.suitability.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "client_risk_profile") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ClientRiskProfile extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String profileCode;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private LocalDate profileDate;
    @Column(nullable = false, length = 20) private String investmentObjective;
    @Column(nullable = false, length = 15) private String riskTolerance;
    @Column(nullable = false, length = 15) private String investmentHorizon;
    private BigDecimal annualIncome;
    private BigDecimal netWorth;
    private BigDecimal liquidNetWorth;
    @Column(length = 15) private String investmentExperience;
    @Column(columnDefinition = "JSONB") private String instrumentExperience;
    private BigDecimal knowledgeAssessmentScore;
    @Column(columnDefinition = "JSONB") private String concentrationLimits;
    private BigDecimal maxSingleInvestmentPct;
    @Builder.Default private Boolean derivativesApproved = false;
    @Builder.Default private Boolean leverageApproved = false;
    private BigDecimal maxLeverageRatio;
    @Column(length = 200) private String assessedBy;
    private LocalDate nextReviewDate;
    @Column(length = 20) private String regulatoryBasis;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
