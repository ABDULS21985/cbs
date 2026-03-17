package com.cbs.billing.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "biller", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class Biller extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "biller_code", nullable = false, unique = true, length = 20)
    private String billerCode;

    @Column(name = "biller_name", nullable = false, length = 200)
    private String billerName;

    @Column(name = "biller_category", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private BillerCategory billerCategory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_account_id")
    private Account settlementAccount;

    @Column(name = "settlement_bank_code", length = 20)
    private String settlementBankCode;

    @Column(name = "settlement_account_number", length = 34)
    private String settlementAccountNumber;

    @Column(name = "customer_id_label", length = 50)
    @Builder.Default
    private String customerIdLabel = "Account Number";

    @Column(name = "customer_id_regex", length = 100)
    private String customerIdRegex;

    @Column(name = "min_amount", precision = 18, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "max_amount", precision = 18, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "flat_fee", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal flatFee = BigDecimal.ZERO;

    @Column(name = "percentage_fee", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal percentageFee = BigDecimal.ZERO;

    @Column(name = "fee_cap", precision = 18, scale = 2)
    private BigDecimal feeCap;

    @Column(name = "fee_bearer", length = 10)
    @Builder.Default
    private String feeBearer = "CUSTOMER";

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    public BigDecimal calculateFee(BigDecimal billAmount) {
        BigDecimal fee = flatFee;
        if (percentageFee != null && percentageFee.compareTo(BigDecimal.ZERO) > 0) {
            fee = fee.add(billAmount.multiply(percentageFee).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP));
        }
        if (feeCap != null && fee.compareTo(feeCap) > 0) {
            fee = feeCap;
        }
        return fee;
    }
}
