package com.cbs.campaign.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
@Entity @Table(name = "marketing_campaign")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketingCampaign {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String campaignCode;
    @Column(nullable = false, length = 200) private String campaignName;
    @Column(nullable = false, length = 20) private String campaignType;
    @Column(nullable = false, length = 30) private String targetAudience;
    @Column(nullable = false, length = 20) private String channel;
    private String targetSegment;
    private Integer targetCount;
    @Column(columnDefinition = "TEXT") private String messageTemplate;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> offerDetails;
    private String callToAction;
    private String landingUrl;
    @Column(nullable = false) private LocalDate startDate;
    private LocalDate endDate;
    private String sendTime;
    private BigDecimal budgetAmount;
    @Builder.Default private BigDecimal spentAmount = BigDecimal.ZERO;
    @Builder.Default private Integer sentCount = 0;
    @Builder.Default private Integer deliveredCount = 0;
    @Builder.Default private Integer openedCount = 0;
    @Builder.Default private Integer clickedCount = 0;
    @Builder.Default private Integer convertedCount = 0;
    @Builder.Default private Integer unsubscribedCount = 0;
    @Builder.Default private BigDecimal revenueGenerated = BigDecimal.ZERO;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
    private String approvedBy;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
