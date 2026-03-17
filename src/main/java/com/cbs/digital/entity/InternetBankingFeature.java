package com.cbs.digital.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "internet_banking_feature")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InternetBankingFeature {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String featureCode;
    @Column(nullable = false, length = 200) private String featureName;
    @Column(nullable = false, length = 30) private String featureCategory;
    @Column(columnDefinition = "TEXT") private String description;
    @Builder.Default private Boolean requiresMfa = false;
    @Builder.Default private Boolean requiresSca = false;
    private BigDecimal dailyLimit;
    @Builder.Default private Boolean isEnabled = true;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> allowedSegments;
    @Builder.Default private Instant createdAt = Instant.now();
}
