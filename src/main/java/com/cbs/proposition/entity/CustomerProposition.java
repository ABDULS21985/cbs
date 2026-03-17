package com.cbs.proposition.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
@Entity @Table(name = "customer_proposition")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerProposition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String propositionCode;
    @Column(nullable = false, length = 200) private String propositionName;
    private String targetSegment;
    @Column(nullable = false, columnDefinition = "TEXT") private String valueStatement;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) private List<String> includedProducts;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> pricingSummary;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> eligibilityRules;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> onboardingSteps;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    @Builder.Default private Instant createdAt = Instant.now();
}
