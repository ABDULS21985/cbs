package com.cbs.gl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "subledger_recon_run", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SubledgerReconRun {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "recon_date", nullable = false) private LocalDate reconDate;
    @Column(name = "subledger_type", nullable = false, length = 20) private String subledgerType;
    @Column(name = "gl_code", nullable = false, length = 20) private String glCode;
    @Column(name = "gl_balance", nullable = false, precision = 18, scale = 2) private BigDecimal glBalance;
    @Column(name = "subledger_balance", nullable = false, precision = 18, scale = 2) private BigDecimal subledgerBalance;
    @Column(name = "difference", nullable = false, precision = 18, scale = 2) private BigDecimal difference;
    @Column(name = "is_balanced", nullable = false) private Boolean isBalanced;
    @Column(name = "exception_count", nullable = false) @Builder.Default private Integer exceptionCount = 0;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "COMPLETED";
    @Column(name = "resolved_by", length = 100) private String resolvedBy;
    @Column(name = "resolved_at") private Instant resolvedAt;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
