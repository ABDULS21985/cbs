package com.cbs.trustservices.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "trust_account")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TrustAccount extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String trustCode;

    @Column(nullable = false, length = 200)
    private String trustName;

    @Column(nullable = false, length = 20)
    private String trustType;

    @Column(nullable = false)
    private Long grantorCustomerId;

    @Column(nullable = false, length = 20)
    private String trusteeType;

    @Column(nullable = false, length = 200)
    private String trusteeName;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Builder.Default
    private BigDecimal corpusValue = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal incomeYtd = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal distributionsYtd = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> beneficiaries;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> distributionRules;

    @Column(columnDefinition = "TEXT")
    private String investmentPolicy;

    private BigDecimal annualFeePct;

    @Column(length = 40)
    private String taxId;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";

    @Column(nullable = false)
    private LocalDate inceptionDate;

    private LocalDate terminationDate;
}
