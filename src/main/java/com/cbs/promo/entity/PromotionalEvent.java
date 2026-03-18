package com.cbs.promo.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map;

@Entity @Table(name = "promotional_event")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class PromotionalEvent extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String eventCode;
    @Column(nullable = false, length = 200) private String eventName;
    @Column(nullable = false, length = 20) private String eventType;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(length = 60) private String targetSegment;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> channels;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> offerDetails;
    @Column(columnDefinition = "TEXT") private String termsAndConditions;
    @Column(length = 30) private String promoCode;
    @Column(length = 15) private String discountType;
    private BigDecimal discountValue;
    private Integer maxRedemptions;
    @Builder.Default private Integer currentRedemptions = 0;
    @Column(nullable = false) private LocalDate startDate;
    private LocalDate endDate;
    @Column(length = 500) private String registrationUrl;
    private BigDecimal budgetAmount;
    @Builder.Default private BigDecimal spentAmount = BigDecimal.ZERO;
    @Builder.Default private Integer leadsGenerated = 0;
    @Builder.Default private Integer conversions = 0;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PLANNED";
}
