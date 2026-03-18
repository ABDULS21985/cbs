package com.cbs.competitoranalysis.entity;

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
@Table(name = "competitor_profile")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CompetitorProfile extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String profileCode;

    @Column(nullable = false, length = 200)
    private String competitorName;

    @Column(nullable = false, length = 20)
    private String competitorType;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String country = "NGA";

    private BigDecimal totalAssets;
    private BigDecimal totalDeposits;
    private BigDecimal totalLoans;
    private Integer branchCount;
    private Long customerCount;
    private BigDecimal marketSharePct;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> keyProducts;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> pricingIntelligence;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> digitalCapabilities;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> strengths;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> weaknesses;

    @Column(length = 10)
    @Builder.Default
    private String threatLevel = "MEDIUM";

    private String strategicResponse;

    private LocalDate lastUpdatedDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";
}
