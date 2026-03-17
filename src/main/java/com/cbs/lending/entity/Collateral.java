package com.cbs.lending.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "collateral", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Collateral extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collateral_number", nullable = false, unique = true, length = 30)
    private String collateralNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "collateral_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private CollateralType collateralType;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "market_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal marketValue;

    @Column(name = "forced_sale_value", precision = 18, scale = 2)
    private BigDecimal forcedSaleValue;

    @Column(name = "last_valuation_date")
    private LocalDate lastValuationDate;

    @Column(name = "next_valuation_date")
    private LocalDate nextValuationDate;

    @Column(name = "valuation_source", length = 100)
    private String valuationSource;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "lien_status", nullable = false, length = 20)
    @Builder.Default
    private String lienStatus = "FREE";

    @Column(name = "lien_amount", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal lienAmount = BigDecimal.ZERO;

    @Column(name = "lien_reference", length = 50)
    private String lienReference;

    @Column(name = "is_insured", nullable = false)
    @Builder.Default
    private Boolean isInsured = false;

    @Column(name = "insurance_policy_number", length = 50)
    private String insurancePolicyNumber;

    @Column(name = "insurance_expiry_date")
    private LocalDate insuranceExpiryDate;

    @Column(name = "insurance_value", precision = 18, scale = 2)
    private BigDecimal insuranceValue;

    @Column(name = "location", columnDefinition = "TEXT")
    private String location;

    @Column(name = "registration_number", length = 50)
    private String registrationNumber;

    @Column(name = "registration_authority", length = 100)
    private String registrationAuthority;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    public void markLien(BigDecimal amount, String reference) {
        this.lienAmount = this.lienAmount.add(amount);
        this.lienStatus = "LIEN_MARKED";
        this.lienReference = reference;
    }

    public void releaseLien() {
        this.lienAmount = BigDecimal.ZERO;
        this.lienStatus = "RELEASED";
        this.lienReference = null;
    }
}
