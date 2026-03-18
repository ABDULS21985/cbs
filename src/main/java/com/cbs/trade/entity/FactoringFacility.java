package com.cbs.trade.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "factoring_facility", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FactoringFacility extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "facility_code", nullable = false, unique = true, length = 30)
    private String facilityCode;

    @Column(name = "facility_type", nullable = false, length = 25)
    private String facilityType;

    @Column(name = "seller_customer_id")
    private Long sellerCustomerId;

    @Column(name = "seller_name", length = 200)
    private String sellerName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "buyer_customer_ids")
    private Map<String, Object> buyerCustomerIds;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "facility_limit", precision = 20, scale = 4)
    private BigDecimal facilityLimit;

    @Column(name = "utilized_amount", precision = 20, scale = 4)
    @Builder.Default
    private BigDecimal utilizedAmount = BigDecimal.ZERO;

    @Column(name = "available_amount", precision = 20, scale = 4)
    private BigDecimal availableAmount;

    @Column(name = "advance_rate_pct", precision = 5, scale = 2)
    private BigDecimal advanceRatePct;

    @Column(name = "discount_rate_pct", precision = 8, scale = 4)
    private BigDecimal discountRatePct;

    @Column(name = "service_fee_rate_pct", precision = 6, scale = 4)
    private BigDecimal serviceFeeRatePct;

    @Column(name = "collection_period_days")
    private Integer collectionPeriodDays;

    @Column(name = "dilution_reserve_pct", precision = 5, scale = 2)
    private BigDecimal dilutionReservePct;

    @Column(name = "max_invoice_age")
    private Integer maxInvoiceAge;

    @Column(name = "max_concentration_pct", precision = 5, scale = 2)
    private BigDecimal maxConcentrationPct;

    @Column(name = "credit_insurance_provider", length = 200)
    private String creditInsuranceProvider;

    @Column(name = "credit_insurance_policy_ref", length = 80)
    private String creditInsurancePolicyRef;

    @Column(name = "notification_required")
    @Builder.Default
    private Boolean notificationRequired = true;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "APPROVED";
}
