package com.cbs.customer.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "customer_onboarding_draft")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OnboardingDraft {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) @Builder.Default private String createdBy = "SYSTEM";
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") @Builder.Default
    private Map<String, Object> formData = new java.util.HashMap<>();
    @Column(nullable = false) @Builder.Default private Integer currentStep = 1;
    @Column(length = 20) private String customerType;
    @Column(length = 200) private String displayLabel;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
