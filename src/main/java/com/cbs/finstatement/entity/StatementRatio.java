package com.cbs.finstatement.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "statement_ratio", uniqueConstraints = @UniqueConstraint(columnNames = {"statement_id", "ratio_name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StatementRatio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long statementId;

    @Column(nullable = false, length = 20)
    private String ratioCategory;

    @Column(nullable = false, length = 60)
    private String ratioName;

    @Column(nullable = false)
    private BigDecimal ratioValue;

    private BigDecimal benchmarkValue;

    @Column(length = 10)
    private String rating;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
