package com.cbs.syndicatedloan.entity;

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
@Table(name = "syndicated_loan_facility")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SyndicatedLoanFacility extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String facilityCode;

    @Column(nullable = false, length = 200)
    private String facilityName;

    @Column(nullable = false, length = 20)
    private String facilityType;

    @Column(nullable = false, length = 200)
    private String borrowerName;

    private Long borrowerId;

    @Column(nullable = false, length = 200)
    private String leadArranger;

    @Column(nullable = false, length = 20)
    private String ourRole;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(nullable = false)
    private BigDecimal totalFacilityAmount;

    @Column(nullable = false)
    private BigDecimal ourCommitment;

    private BigDecimal ourSharePct;

    @Builder.Default
    private BigDecimal drawnAmount = BigDecimal.ZERO;

    private BigDecimal undrawnAmount;

    @Column(length = 20)
    @Builder.Default
    private String baseRate = "SOFR";

    @Column(nullable = false)
    private Integer marginBps;

    private BigDecimal upfrontFeePct;
    private Integer commitmentFeeBps;
    private BigDecimal agentFee;

    @Column(nullable = false)
    private Integer tenorMonths;

    private LocalDate signingDate;
    private LocalDate maturityDate;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> repaymentSchedule;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> financialCovenants;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "STRUCTURING";
}
