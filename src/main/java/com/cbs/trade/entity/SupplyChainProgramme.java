package com.cbs.trade.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "supply_chain_programme", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupplyChainProgramme extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "programme_code", nullable = false, unique = true, length = 20) private String programmeCode;
    @Column(name = "programme_name", nullable = false, length = 200) private String programmeName;
    @Column(name = "programme_type", nullable = false, length = 30) @Enumerated(EnumType.STRING) private ScfProgrammeType programmeType;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "anchor_customer_id", nullable = false) private Customer anchorCustomer;
    @Column(name = "programme_limit", nullable = false, precision = 18, scale = 2) private BigDecimal programmeLimit;
    @Column(name = "utilized_amount", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal utilizedAmount = BigDecimal.ZERO;
    @Column(name = "available_amount", nullable = false, precision = 18, scale = 2) private BigDecimal availableAmount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "discount_rate", precision = 8, scale = 4) private BigDecimal discountRate;
    @Column(name = "margin_over_base", precision = 8, scale = 4) private BigDecimal marginOverBase;
    @Column(name = "effective_date", nullable = false) @Builder.Default private LocalDate effectiveDate = LocalDate.now();
    @Column(name = "expiry_date", nullable = false) private LocalDate expiryDate;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";

    public void utilize(BigDecimal amount) {
        this.utilizedAmount = this.utilizedAmount.add(amount);
        this.availableAmount = this.programmeLimit.subtract(this.utilizedAmount);
    }
}
