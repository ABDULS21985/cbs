package com.cbs.ecl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "ecl_calculation", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EclCalculation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "calculation_date", nullable = false) private LocalDate calculationDate;
    @Column(name = "loan_account_id", nullable = false) private Long loanAccountId;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "current_stage", nullable = false) private Integer currentStage;
    @Column(name = "previous_stage") private Integer previousStage;
    @Column(name = "stage_reason", length = 200) private String stageReason;
    @Column(name = "ead", nullable = false, precision = 18, scale = 2) private BigDecimal ead;
    @Column(name = "pd_used", nullable = false, precision = 8, scale = 6) private BigDecimal pdUsed;
    @Column(name = "lgd_used", nullable = false, precision = 8, scale = 6) private BigDecimal lgdUsed;
    @Column(name = "ecl_base", nullable = false, precision = 18, scale = 2) private BigDecimal eclBase;
    @Column(name = "ecl_optimistic", precision = 18, scale = 2) private BigDecimal eclOptimistic;
    @Column(name = "ecl_pessimistic", precision = 18, scale = 2) private BigDecimal eclPessimistic;
    @Column(name = "ecl_weighted", nullable = false, precision = 18, scale = 2) private BigDecimal eclWeighted;
    @Column(name = "previous_ecl", precision = 18, scale = 2) @Builder.Default private BigDecimal previousEcl = BigDecimal.ZERO;
    @Column(name = "ecl_movement", precision = 18, scale = 2) @Builder.Default private BigDecimal eclMovement = BigDecimal.ZERO;
    @Column(name = "segment", length = 30) private String segment;
    @Column(name = "product_code", length = 20) private String productCode;
    @Column(name = "days_past_due", nullable = false) @Builder.Default private Integer daysPastDue = 0;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
