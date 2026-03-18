package com.cbs.commission.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map;

@Entity @Table(name = "commission_agreement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CommissionAgreement extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String agreementCode;
    @Column(nullable = false, length = 200) private String agreementName;
    @Column(nullable = false, length = 20) private String agreementType;
    @Column(nullable = false, length = 80) private String partyId;
    @Column(nullable = false, length = 200) private String partyName;
    @Column(nullable = false, length = 20) private String commissionBasis;
    private BigDecimal baseRatePct;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> tierStructure;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> applicableProducts;
    private BigDecimal minPayout;
    private BigDecimal maxPayoutMonthly;
    private BigDecimal maxPayoutAnnual;
    private Integer clawbackPeriodDays;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> clawbackConditions;
    @Column(nullable = false) private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
}
