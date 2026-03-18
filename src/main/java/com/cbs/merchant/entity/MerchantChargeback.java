package com.cbs.merchant.entity;

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
@Table(name = "merchant_chargeback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MerchantChargeback extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long merchantId;

    @Column(length = 40)
    private String originalTransactionRef;

    private LocalDate transactionDate;

    private BigDecimal transactionAmount;

    @Column(length = 15)
    private String cardNetwork;

    @Column(length = 10)
    private String reasonCode;

    @Column(length = 200)
    private String reasonDescription;

    private BigDecimal chargebackAmount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "NGN";

    private LocalDate evidenceDeadline;

    @Column(length = 80)
    private String merchantResponseRef;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> merchantEvidence;

    @Builder.Default
    private Boolean representmentSubmitted = false;

    @Builder.Default
    private Boolean arbitrationRequired = false;

    @Column(length = 15)
    private String outcome;

    private BigDecimal financialImpact;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "RECEIVED";
}
