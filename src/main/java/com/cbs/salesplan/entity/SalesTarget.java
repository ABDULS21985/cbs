package com.cbs.salesplan.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;

@Entity @Table(name = "sales_target")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SalesTarget extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String targetCode;
    @Column(nullable = false) private Long planId;
    @Column(nullable = false, length = 80) private String officerId;
    @Column(nullable = false, length = 200) private String officerName;
    @Column(length = 30) private String productCode;
    @Column(length = 200) private String productName;
    @Column(nullable = false, length = 20) private String targetType;
    @Column(length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal targetValue;
    @Builder.Default private BigDecimal actualValue = BigDecimal.ZERO;
    @Builder.Default private BigDecimal achievementPct = BigDecimal.ZERO;
    @Column(nullable = false) private LocalDate periodStart;
    @Column(nullable = false) private LocalDate periodEnd;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
