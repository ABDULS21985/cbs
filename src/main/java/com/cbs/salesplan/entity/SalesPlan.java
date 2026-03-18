package com.cbs.salesplan.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map;

@Entity @Table(name = "sales_plan")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SalesPlan extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String planCode;
    @Column(nullable = false, length = 200) private String planName;
    @Column(nullable = false, length = 10) private String planPeriod;
    @Column(nullable = false) private LocalDate periodStart;
    @Column(nullable = false) private LocalDate periodEnd;
    @Column(length = 60) private String region;
    private Long branchId;
    @Column(nullable = false) private BigDecimal revenueTarget;
    @Builder.Default private BigDecimal revenueActual = BigDecimal.ZERO;
    @Builder.Default private Integer newCustomerTarget = 0;
    @Builder.Default private Integer newCustomerActual = 0;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> productTargets;
    @Column(length = 200) private String teamLead;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> teamMembers;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> territoryAssignments;
    @Builder.Default private BigDecimal achievementPct = BigDecimal.ZERO;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
}
