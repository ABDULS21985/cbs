package com.cbs.fees.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "fee_definition", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FeeDefinition extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fee_code", nullable = false, unique = true, length = 30)
    private String feeCode;

    @Column(name = "fee_name", nullable = false, length = 100)
    private String feeName;

    @Column(name = "fee_category", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private FeeCategory feeCategory;

    @Column(name = "trigger_event", nullable = false, length = 50)
    private String triggerEvent;

    @Column(name = "calculation_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private FeeCalculationType calculationType;

    @Column(name = "flat_amount", precision = 18, scale = 2)
    private BigDecimal flatAmount;

    @Column(name = "percentage", precision = 8, scale = 4)
    private BigDecimal percentage;

    @Column(name = "min_fee", precision = 18, scale = 2)
    private BigDecimal minFee;

    @Column(name = "max_fee", precision = 18, scale = 2)
    private BigDecimal maxFee;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tier_config", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> tierConfig = new ArrayList<>();

    @Column(name = "applicable_products", length = 200)
    private String applicableProducts;

    @Column(name = "applicable_channels", length = 200)
    @Builder.Default
    private String applicableChannels = "ALL";

    @Column(name = "applicable_customer_types", length = 200)
    @Builder.Default
    private String applicableCustomerTypes = "ALL";

    @Column(name = "tax_applicable", nullable = false)
    @Builder.Default
    private Boolean taxApplicable = false;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "fee_income_gl_code", length = 20)
    private String feeIncomeGlCode;

    @Column(name = "tax_gl_code", length = 20)
    private String taxGlCode;

    @Column(name = "waivable", nullable = false)
    @Builder.Default
    private Boolean waivable = true;

    @Column(name = "waiver_authority_level", length = 20)
    @Builder.Default
    private String waiverAuthorityLevel = "OFFICER";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;
}
