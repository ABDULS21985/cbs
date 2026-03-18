package com.cbs.survey.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.Instant; import java.util.List; import java.util.Map;

@Entity @Table(name = "survey_response")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SurveyResponse {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String responseRef;
    @Column(nullable = false) private Long surveyId;
    private Long customerId;
    @Column(nullable = false, length = 20) private String channel;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private List<Map<String, Object>> answers;
    private BigDecimal overallScore;
    @Column(length = 10) private String npsCategory;
    @Column(length = 10) private String sentiment;
    @Column(columnDefinition = "TEXT") private String verbatimFeedback;
    private Instant completedAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
