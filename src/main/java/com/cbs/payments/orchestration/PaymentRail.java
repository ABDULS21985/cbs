package com.cbs.payments.orchestration;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "payment_rail", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentRail {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "rail_code", nullable = false, unique = true, length = 20) private String railCode;
    @Column(name = "rail_name", nullable = false, length = 100) private String railName;
    @Column(name = "rail_type", nullable = false, length = 30) private String railType;
    @Column(name = "provider", length = 50) private String provider;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "supported_currencies", columnDefinition = "jsonb")
    @Builder.Default private List<String> supportedCurrencies = List.of("USD");

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "supported_countries", columnDefinition = "jsonb")
    @Builder.Default private List<String> supportedCountries = List.of("*");

    @Column(name = "max_amount", precision = 18, scale = 2) private BigDecimal maxAmount;
    @Column(name = "min_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal minAmount = BigDecimal.ZERO;
    @Column(name = "flat_fee", precision = 18, scale = 2) @Builder.Default private BigDecimal flatFee = BigDecimal.ZERO;
    @Column(name = "percentage_fee", precision = 8, scale = 4) @Builder.Default private BigDecimal percentageFee = BigDecimal.ZERO;
    @Column(name = "fee_currency", length = 3) @Builder.Default private String feeCurrency = "USD";
    @Column(name = "settlement_speed", nullable = false, length = 20) private String settlementSpeed;
    @Column(name = "avg_processing_ms") private Integer avgProcessingMs;
    @Column(name = "operating_hours", length = 200) @Builder.Default private String operatingHours = "24/7";
    @Column(name = "is_available", nullable = false) @Builder.Default private Boolean isAvailable = true;
    @Column(name = "uptime_pct", precision = 5, scale = 2) @Builder.Default private BigDecimal uptimePct = new BigDecimal("99.9");
    @Column(name = "last_health_check") private Instant lastHealthCheck;
    @Column(name = "priority_rank", nullable = false) @Builder.Default private Integer priorityRank = 100;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public BigDecimal calculateFee(BigDecimal amount) {
        BigDecimal pctFee = amount.multiply(percentageFee).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        return flatFee.add(pctFee);
    }

    public boolean supportsCountry(String country) {
        return supportedCountries.contains("*") || supportedCountries.contains(country);
    }

    public boolean supportsCurrency(String currency) {
        return supportedCurrencies.contains("*") || supportedCurrencies.contains(currency);
    }

    public boolean supportsAmount(BigDecimal amount) {
        if (minAmount != null && amount.compareTo(minAmount) < 0) return false;
        if (maxAmount != null && amount.compareTo(maxAmount) > 0) return false;
        return true;
    }
}
