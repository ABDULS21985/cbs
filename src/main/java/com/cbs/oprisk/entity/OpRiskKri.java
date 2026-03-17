package com.cbs.oprisk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "oprisk_kri", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpRiskKri {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "kri_code", nullable = false, unique = true, length = 20) private String kriCode;
    @Column(name = "kri_name", nullable = false, length = 200) private String kriName;
    @Column(name = "kri_category", nullable = false, length = 30) private String kriCategory;
    @Column(name = "measurement_unit", nullable = false, length = 30) private String measurementUnit;
    @Column(name = "threshold_amber", precision = 18, scale = 4) private BigDecimal thresholdAmber;
    @Column(name = "threshold_red", precision = 18, scale = 4) private BigDecimal thresholdRed;
    @Column(name = "frequency", nullable = false, length = 20) private String frequency;
    @Column(name = "owner", length = 100) private String owner;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public String evaluateRag(BigDecimal value) {
        if (thresholdRed != null && value.compareTo(thresholdRed) >= 0) return "RED";
        if (thresholdAmber != null && value.compareTo(thresholdAmber) >= 0) return "AMBER";
        return "GREEN";
    }
}
