package com.cbs.projectfinance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "project_finance_facility")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProjectFinanceFacility extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String facilityCode;

    @Column(nullable = false, length = 200)
    private String projectName;

    @Column(nullable = false, length = 25)
    private String projectType;

    @Column(nullable = false, length = 200)
    private String borrowerName;

    @Column(length = 200)
    private String spvName;

    @Column(nullable = false, length = 3)
    private String country;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(nullable = false)
    private BigDecimal totalProjectCost;

    @Column(nullable = false)
    private BigDecimal debtAmount;

    private BigDecimal equityAmount;
    private BigDecimal ourShare;

    @Builder.Default
    private BigDecimal disbursedAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer tenorMonths;

    @Builder.Default
    private Integer gracePeriodMonths = 0;

    @Column(length = 20)
    @Builder.Default
    private String baseRate = "SOFR";

    @Column(nullable = false)
    private Integer marginBps;

    @Column(length = 10)
    private String creditRating;

    @Column(length = 10)
    private String countryRisk;

    @Column(length = 5)
    private String environmentalCategory;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> financialCovenants;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> securityPackage;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "APPRAISAL";
}
