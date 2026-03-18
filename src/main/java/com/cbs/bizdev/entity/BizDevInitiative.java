package com.cbs.bizdev.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map;

@Entity @Table(name = "biz_dev_initiative")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BizDevInitiative extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String initiativeCode;
    @Column(nullable = false, length = 200) private String initiativeName;
    @Column(nullable = false, length = 25) private String initiativeType;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(length = 200) private String sponsor;
    @Column(length = 200) private String leadOwner;
    @Column(length = 60) private String targetSegment;
    @Column(length = 60) private String targetRegion;
    private BigDecimal estimatedRevenue;
    private BigDecimal estimatedCost;
    @Builder.Default private BigDecimal actualRevenue = BigDecimal.ZERO;
    @Builder.Default private BigDecimal actualCost = BigDecimal.ZERO;
    private BigDecimal roiTargetPct;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualStartDate;
    private LocalDate actualEndDate;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> milestones;
    @Builder.Default private BigDecimal progressPct = BigDecimal.ZERO;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> kpis;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> risks;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PROPOSED";
}
