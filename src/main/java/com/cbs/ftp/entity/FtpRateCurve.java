package com.cbs.ftp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "ftp_rate_curve", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"curve_name","currency_code","effective_date","tenor_days"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FtpRateCurve {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "curve_name", nullable = false, length = 50) private String curveName;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate;
    @Column(name = "tenor_days", nullable = false) private Integer tenorDays;
    @Column(name = "rate", nullable = false, precision = 8, scale = 4) private BigDecimal rate;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
