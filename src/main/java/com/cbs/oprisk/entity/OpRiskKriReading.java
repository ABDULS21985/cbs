package com.cbs.oprisk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "oprisk_kri_reading", schema = "cbs", uniqueConstraints = @UniqueConstraint(columnNames = {"kri_id","reading_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpRiskKriReading {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "kri_id", nullable = false) private OpRiskKri kri;
    @Column(name = "reading_date", nullable = false) private LocalDate readingDate;
    @Column(name = "value", nullable = false, precision = 18, scale = 4) private BigDecimal value;
    @Column(name = "rag_status", nullable = false, length = 10) private String ragStatus;
    @Column(name = "commentary", columnDefinition = "TEXT") private String commentary;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
}
