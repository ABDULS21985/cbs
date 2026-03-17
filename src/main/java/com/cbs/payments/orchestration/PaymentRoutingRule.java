package com.cbs.payments.orchestration;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "payment_routing_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentRoutingRule {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "rule_name", nullable = false, length = 100) private String ruleName;
    @Column(name = "rule_priority", nullable = false) @Builder.Default private Integer rulePriority = 100;
    @Column(name = "source_country", length = 3) private String sourceCountry;
    @Column(name = "destination_country", length = 3) private String destinationCountry;
    @Column(name = "currency_code", length = 3) private String currencyCode;
    @Column(name = "min_amount", precision = 18, scale = 2) private BigDecimal minAmount;
    @Column(name = "max_amount", precision = 18, scale = 2) private BigDecimal maxAmount;
    @Column(name = "payment_type", length = 30) private String paymentType;
    @Column(name = "channel", length = 20) private String channel;
    @Column(name = "customer_segment", length = 30) private String customerSegment;
    @Column(name = "preferred_rail_code", nullable = false, length = 20) private String preferredRailCode;
    @Column(name = "fallback_rail_code", length = 20) private String fallbackRailCode;
    @Column(name = "optimize_for", nullable = false, length = 20) @Builder.Default private String optimizeFor = "COST";
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "effective_from", nullable = false) @Builder.Default private LocalDate effectiveFrom = LocalDate.now();
    @Column(name = "effective_to") private LocalDate effectiveTo;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    /** Checks if this rule matches the given payment context */
    public boolean matches(String srcCountry, String dstCountry, String ccy, BigDecimal amount, String pmtType) {
        if (sourceCountry != null && !sourceCountry.equals(srcCountry)) return false;
        if (destinationCountry != null && !destinationCountry.equals(dstCountry)) return false;
        if (currencyCode != null && !currencyCode.equals(ccy)) return false;
        if (minAmount != null && amount.compareTo(minAmount) < 0) return false;
        if (maxAmount != null && amount.compareTo(maxAmount) > 0) return false;
        if (paymentType != null && !paymentType.equals(pmtType)) return false;
        return true;
    }
}
