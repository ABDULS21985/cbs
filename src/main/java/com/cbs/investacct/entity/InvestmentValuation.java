package com.cbs.investacct.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "investment_valuation", schema = "cbs", uniqueConstraints = @UniqueConstraint(columnNames = {"holding_id","valuation_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvestmentValuation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "holding_id", nullable = false) private Long holdingId;
    @Column(name = "portfolio_code", nullable = false, length = 20) private String portfolioCode;
    @Column(name = "valuation_date", nullable = false) private LocalDate valuationDate;
    @Column(name = "ifrs9_classification", nullable = false, length = 30)
    @Enumerated(EnumType.STRING) private Ifrs9Classification ifrs9Classification;
    @Column(name = "amortised_cost", nullable = false, precision = 18, scale = 2) private BigDecimal amortisedCost;
    @Column(name = "fair_value", nullable = false, precision = 18, scale = 2) private BigDecimal fairValue;
    @Column(name = "carrying_amount", nullable = false, precision = 18, scale = 2) private BigDecimal carryingAmount;
    @Column(name = "interest_income", precision = 18, scale = 2) @Builder.Default private BigDecimal interestIncome = BigDecimal.ZERO;
    @Column(name = "amortisation_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal amortisationAmount = BigDecimal.ZERO;
    @Column(name = "unrealised_gain_loss", precision = 18, scale = 2) @Builder.Default private BigDecimal unrealisedGainLoss = BigDecimal.ZERO;
    @Column(name = "realised_gain_loss", precision = 18, scale = 2) @Builder.Default private BigDecimal realisedGainLoss = BigDecimal.ZERO;
    @Column(name = "ecl_stage") private Integer eclStage;
    @Column(name = "ecl_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal eclAmount = BigDecimal.ZERO;
    @Column(name = "ecl_movement", precision = 18, scale = 2) @Builder.Default private BigDecimal eclMovement = BigDecimal.ZERO;
    @Column(name = "oci_reserve", precision = 18, scale = 2) @Builder.Default private BigDecimal ociReserve = BigDecimal.ZERO;
    @Column(name = "oci_movement", precision = 18, scale = 2) @Builder.Default private BigDecimal ociMovement = BigDecimal.ZERO;
    @Column(name = "journal_id") private Long journalId;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
