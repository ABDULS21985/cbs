package com.cbs.virtualaccount.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "va_matching_rule")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VaMatchingRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long vaId;
    @Column(nullable = false, length = 20) private String ruleType;
    @Column(nullable = false, length = 200) private String ruleValue;
    @Column(nullable = false) @Builder.Default private Integer priority = 1;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
