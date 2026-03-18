package com.cbs.leasing.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "corporate_lease_portfolio", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CorporateLeasePortfolio extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "corporate_customer_id", nullable = false)
    private Long corporateCustomerId;

    @Column(name = "total_leases")
    @Builder.Default
    private Integer totalLeases = 0;

    @Column(name = "active_leases")
    @Builder.Default
    private Integer activeLeases = 0;

    @Column(name = "total_rou_asset_value", precision = 20, scale = 4)
    private BigDecimal totalRouAssetValue;

    @Column(name = "total_lease_liability", precision = 20, scale = 4)
    private BigDecimal totalLeaseLiability;

    @Column(name = "weighted_avg_term", precision = 8, scale = 2)
    private BigDecimal weightedAvgTerm;

    @Column(name = "weighted_avg_rate", precision = 8, scale = 4)
    private BigDecimal weightedAvgRate;

    @Column(name = "annual_lease_expense", precision = 20, scale = 4)
    private BigDecimal annualLeaseExpense;

    @Column(name = "expiring_next_90_days")
    @Builder.Default
    private Integer expiringNext90Days = 0;

    @Column(name = "expiring_next_180_days")
    @Builder.Default
    private Integer expiringNext180Days = 0;

    @Column(name = "as_of_date", nullable = false)
    private LocalDate asOfDate;
}
