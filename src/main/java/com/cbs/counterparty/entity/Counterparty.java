package com.cbs.counterparty.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "counterparty")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class Counterparty extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String counterpartyCode;

    @Column(nullable = false, length = 200)
    private String counterpartyName;

    @Column(nullable = false, length = 20)
    private String counterpartyType;

    @Column(length = 20)
    private String lei;

    @Column(length = 11)
    private String bicCode;

    @Column(nullable = false, length = 3)
    private String country;

    @Column(length = 10)
    private String creditRating;

    @Column(length = 30)
    private String ratingAgency;

    private BigDecimal totalExposureLimit;

    @Builder.Default
    private BigDecimal currentExposure = BigDecimal.ZERO;

    private BigDecimal availableLimit;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> settlementInstructions;

    @Builder.Default
    private Boolean nettingAgreement = false;

    @Builder.Default
    private Boolean isdaAgreement = false;

    @Builder.Default
    private Boolean csaAgreement = false;

    @Column(length = 15)
    @Builder.Default
    private String kycStatus = "PENDING";

    private LocalDate kycReviewDate;

    @Column(length = 10)
    @Builder.Default
    private String riskCategory = "MEDIUM";

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";
}
