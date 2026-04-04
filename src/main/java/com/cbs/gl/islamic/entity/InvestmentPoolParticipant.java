package com.cbs.gl.islamic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "investment_pool_participant", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvestmentPoolParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "participation_date", nullable = false)
    @Builder.Default
    private LocalDate participationDate = LocalDate.now();

    @Column(name = "participation_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal participationBalance = BigDecimal.ZERO;

    @Column(name = "participation_weight", nullable = false, precision = 18, scale = 8)
    @Builder.Default
    private BigDecimal participationWeight = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "profit_distribution_method", nullable = false, length = 30)
    @Builder.Default
    private ProfitDistributionMethod profitDistributionMethod = ProfitDistributionMethod.DAILY_PRODUCT;

    @Column(name = "last_profit_distribution_date")
    private LocalDate lastProfitDistributionDate;

    @Column(name = "cumulative_profit_distributed", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal cumulativeProfitDistributed = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private InvestmentPoolParticipantStatus status = InvestmentPoolParticipantStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
