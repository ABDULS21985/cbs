package com.cbs.bizriskmodel.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.LocalDate; import java.util.List; import java.util.Map;
@Entity @Table(name = "business_risk_assessment") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BusinessRiskAssessment extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String assessmentCode;
    @Column(nullable = false, length = 200) private String assessmentName;
    @Column(nullable = false, length = 25) private String riskDomain;
    @Column(nullable = false) private LocalDate assessmentDate;
    @Column(length = 200) private String assessor;
    @Column(nullable = false) private Integer inherentRiskScore;
    @Column(length = 15) private String controlEffectiveness;
    @Column(nullable = false) private Integer residualRiskScore;
    @Column(nullable = false, length = 10) private String riskRating;
    @Column(length = 15) private String riskAppetiteStatus;
    @Column(columnDefinition = "TEXT") private String description;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> keyRiskIndicators;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> riskDrivers;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> mitigationActions;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> impactAssessment;
    private LocalDate nextReviewDate;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
}
