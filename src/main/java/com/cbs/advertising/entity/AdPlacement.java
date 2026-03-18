package com.cbs.advertising.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.Map;

@Entity @Table(name = "ad_placement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AdPlacement extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String placementCode;
    private Long campaignId;
    @Column(nullable = false, length = 200) private String placementName;
    @Column(nullable = false, length = 20) private String mediaType;
    @Column(length = 60) private String platform;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> targetAudience;
    @Column(nullable = false) private BigDecimal budgetAmount;
    @Builder.Default private BigDecimal spentAmount = BigDecimal.ZERO;
    @Column(nullable = false, length = 15) private String costModel;
    private BigDecimal unitCost;
    @Builder.Default private Long impressions = 0L;
    @Builder.Default private Long clicks = 0L;
    @Builder.Default private Integer conversions = 0;
    private BigDecimal ctrPct;
    private BigDecimal conversionRatePct;
    private BigDecimal costPerAcquisition;
    @Builder.Default private BigDecimal revenueAttributed = BigDecimal.ZERO;
    private BigDecimal roasPct;
    @Column(nullable = false) private LocalDate startDate;
    private LocalDate endDate;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
}
