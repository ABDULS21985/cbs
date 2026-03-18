package com.cbs.fees.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "discount_scheme", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DiscountScheme extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scheme_code", nullable = false, unique = true, length = 30)
    private String schemeCode;

    @Column(name = "scheme_name", nullable = false)
    private String schemeName;

    @Column(name = "scheme_type", length = 20)
    private String schemeType;

    @Column(name = "discount_basis", length = 20)
    private String discountBasis;

    @Column(name = "discount_value", precision = 18, scale = 4)
    private BigDecimal discountValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_fee_ids", columnDefinition = "jsonb")
    private List<String> applicableFeeIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_products", columnDefinition = "jsonb")
    private List<String> applicableProducts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_segments", columnDefinition = "jsonb")
    private List<String> applicableSegments;

    @Column(name = "min_relationship_value", precision = 18, scale = 2)
    private BigDecimal minRelationshipValue;

    @Column(name = "min_transaction_volume")
    private Integer minTransactionVolume;

    @Column(name = "loyalty_tier_required", length = 10)
    private String loyaltyTierRequired;

    @Column(name = "max_discount_amount", precision = 18, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "max_usage_per_customer")
    private Integer maxUsagePerCustomer;

    @Column(name = "max_total_budget", precision = 18, scale = 2)
    private BigDecimal maxTotalBudget;

    @Column(name = "current_utilization", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal currentUtilization = BigDecimal.ZERO;

    @Column(name = "combinable_with_other_discounts", nullable = false)
    @Builder.Default
    private Boolean combinableWithOtherDiscounts = false;

    @Column(name = "priority_order")
    private Integer priorityOrder;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";
}
