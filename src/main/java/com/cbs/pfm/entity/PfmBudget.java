package com.cbs.pfm.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "pfm_budget")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PfmBudget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long categoryId;
    @Column(nullable = false) private LocalDate budgetMonth;
    @Column(nullable = false) private BigDecimal budgetAmount;
    @Builder.Default private BigDecimal spentAmount = BigDecimal.ZERO;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Builder.Default private Integer alertThresholdPct = 80;
    @Builder.Default private Boolean alertSent = false;
    @Builder.Default private Instant createdAt = Instant.now();
    public BigDecimal getUtilizationPct() {
        if (budgetAmount.signum() == 0) return BigDecimal.ZERO;
        return spentAmount.divide(budgetAmount, 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }
}
