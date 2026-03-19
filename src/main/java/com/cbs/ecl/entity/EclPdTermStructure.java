package com.cbs.ecl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "ecl_pd_term_structure", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EclPdTermStructure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rating_grade", nullable = false, length = 20)
    private String ratingGrade;

    @Column(name = "tenor_1y", nullable = false, precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal tenor1y = BigDecimal.ZERO;

    @Column(name = "tenor_3y", nullable = false, precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal tenor3y = BigDecimal.ZERO;

    @Column(name = "tenor_5y", nullable = false, precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal tenor5y = BigDecimal.ZERO;

    @Column(name = "tenor_10y", nullable = false, precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal tenor10y = BigDecimal.ZERO;

    @Column(name = "effective_date", nullable = false)
    @Builder.Default
    private LocalDate effectiveDate = LocalDate.now();

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version
    @Column(name = "version")
    private Long version;
}
