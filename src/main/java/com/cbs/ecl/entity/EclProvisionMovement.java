package com.cbs.ecl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "ecl_provision_movement", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EclProvisionMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_date", nullable = false)
    private LocalDate runDate;

    @Column(name = "label", nullable = false, length = 50)
    private String label;

    @Column(name = "stage1", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal stage1 = BigDecimal.ZERO;

    @Column(name = "stage2", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal stage2 = BigDecimal.ZERO;

    @Column(name = "stage3", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal stage3 = BigDecimal.ZERO;

    @Column(name = "total", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "is_total_row", nullable = false)
    @Builder.Default
    private Boolean isTotalRow = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
