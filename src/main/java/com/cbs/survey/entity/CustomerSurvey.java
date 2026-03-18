package com.cbs.survey.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map;

@Entity @Table(name = "customer_survey")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CustomerSurvey extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String surveyCode;
    @Column(nullable = false, length = 200) private String surveyName;
    @Column(nullable = false, length = 20) private String surveyType;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(length = 60) private String targetSegment;
    @Column(nullable = false, length = 20) private String deliveryChannel;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private List<Map<String, Object>> questions;
    @Column(nullable = false) private LocalDate startDate;
    private LocalDate endDate;
    @Builder.Default private Integer totalSent = 0;
    @Builder.Default private Integer totalResponses = 0;
    @Builder.Default private BigDecimal responseRatePct = BigDecimal.ZERO;
    private BigDecimal avgScore;
    private Integer npsScore;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> scoreDistribution;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> keyThemes;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> actionItems;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
}
