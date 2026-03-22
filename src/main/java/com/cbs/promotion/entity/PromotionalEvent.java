package com.cbs.promotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity(name = "PromotionPromotionalEvent")
@Table(name = "promotional_event", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromotionalEvent {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_code", nullable = false, unique = true, length = 50)
    private String eventCode;

    @Column(name = "event_name", nullable = false, length = 150)
    private String eventName;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "target_segment", length = 100)
    private String targetSegment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "channels", columnDefinition = "jsonb")
    private List<String> channels;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "offer_details", columnDefinition = "jsonb")
    private Map<String, Object> offerDetails;

    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "promo_code", unique = true, length = 50)
    private String promoCode;

    @Column(name = "discount_type", length = 20)
    private String discountType;

    @Column(name = "discount_value", precision = 18, scale = 4)
    private BigDecimal discountValue;

    @Column(name = "max_redemptions", nullable = false)
    @Builder.Default
    private Integer maxRedemptions = 0;

    @Column(name = "current_redemptions", nullable = false)
    @Builder.Default
    private Integer currentRedemptions = 0;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "registration_url", length = 500)
    private String registrationUrl;

    @Column(name = "budget_amount", precision = 18, scale = 4)
    private BigDecimal budgetAmount;

    @Column(name = "spent_amount", precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal spentAmount = BigDecimal.ZERO;

    @Column(name = "leads_generated", nullable = false)
    @Builder.Default
    private Integer leadsGenerated = 0;

    @Column(name = "conversions", nullable = false)
    @Builder.Default
    private Integer conversions = 0;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Version
    @Column(name = "version")
    private Long version;
}
