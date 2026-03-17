package com.cbs.payments.remittance;

import com.cbs.payments.orchestration.PaymentRail;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "remittance_corridor", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"source_country","destination_country"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RemittanceCorridor {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "corridor_code", nullable = false, unique = true, length = 20) private String corridorCode;
    @Column(name = "source_country", nullable = false, length = 3) private String sourceCountry;
    @Column(name = "destination_country", nullable = false, length = 3) private String destinationCountry;
    @Column(name = "source_currency", nullable = false, length = 3) private String sourceCurrency;
    @Column(name = "destination_currency", nullable = false, length = 3) private String destinationCurrency;
    @Column(name = "flat_fee", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal flatFee = BigDecimal.ZERO;
    @Column(name = "percentage_fee", nullable = false, precision = 8, scale = 4) @Builder.Default private BigDecimal percentageFee = BigDecimal.ZERO;
    @Column(name = "fee_cap", precision = 18, scale = 2) private BigDecimal feeCap;
    @Column(name = "fx_markup_pct", precision = 8, scale = 4) @Builder.Default private BigDecimal fxMarkupPct = BigDecimal.ZERO;
    @Column(name = "min_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal minAmount = BigDecimal.ZERO;
    @Column(name = "max_amount", precision = 18, scale = 2) private BigDecimal maxAmount;
    @Column(name = "daily_limit", precision = 18, scale = 2) private BigDecimal dailyLimit;
    @Column(name = "monthly_limit", precision = 18, scale = 2) private BigDecimal monthlyLimit;
    @Column(name = "requires_purpose_code", nullable = false) @Builder.Default private Boolean requiresPurposeCode = false;
    @Column(name = "requires_source_of_funds", nullable = false) @Builder.Default private Boolean requiresSourceOfFunds = false;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "blocked_purpose_codes", columnDefinition = "jsonb")
    @Builder.Default private List<String> blockedPurposeCodes = new ArrayList<>();

    @Column(name = "preferred_rail_code", length = 20) private String preferredRailCode;
    @Column(name = "settlement_days", nullable = false) @Builder.Default private Integer settlementDays = 2;
    @Column(name = "imto_partner_code", length = 30) private String imtoPartnerCode;
    @Column(name = "imto_partner_name", length = 100) private String imtoPartnerName;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public BigDecimal calculateFee(BigDecimal amount) {
        BigDecimal pctFee = amount.multiply(percentageFee).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalFee = flatFee.add(pctFee);
        if (feeCap != null && totalFee.compareTo(feeCap) > 0) totalFee = feeCap;
        return totalFee;
    }
}
