package com.cbs.tax.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "tax_rule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaxRule {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "tax_code", nullable = false, unique = true, length = 20) private String taxCode;
    @Column(name = "tax_name", nullable = false, length = 100) private String taxName;
    @Column(name = "tax_type", nullable = false, length = 20) private String taxType;
    @Column(name = "tax_rate", nullable = false, precision = 8, scale = 4) private BigDecimal taxRate;
    @Column(name = "applies_to", nullable = false, length = 30) private String appliesTo;
    @Column(name = "threshold_amount", precision = 18, scale = 2) private BigDecimal thresholdAmount;
    @Column(name = "currency_code", length = 3) private String currencyCode;
    @Column(name = "exempt_customer_types", length = 200) @Builder.Default private String exemptCustomerTypes = "";
    @Column(name = "exempt_product_codes", length = 500) @Builder.Default private String exemptProductCodes = "";
    @Column(name = "tax_receivable_gl", length = 20) private String taxReceivableGl;
    @Column(name = "tax_payable_gl", length = 20) private String taxPayableGl;
    @Column(name = "effective_from", nullable = false) @Builder.Default private LocalDate effectiveFrom = LocalDate.now();
    @Column(name = "effective_to") private LocalDate effectiveTo;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;

    public boolean isExempt(String customerType, String productCode) {
        if (exemptCustomerTypes != null && !exemptCustomerTypes.isEmpty() && exemptCustomerTypes.contains(customerType)) return true;
        if (exemptProductCodes != null && !exemptProductCodes.isEmpty() && exemptProductCodes.contains(productCode)) return true;
        return false;
    }
}
