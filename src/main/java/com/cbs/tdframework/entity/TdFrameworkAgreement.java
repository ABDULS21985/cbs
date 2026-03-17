package com.cbs.tdframework.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity @Table(name = "td_framework_agreement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TdFrameworkAgreement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String agreementNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 30) private String agreementType;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal minDepositAmount;
    private BigDecimal maxDepositAmount;
    @Builder.Default private Integer minTenorDays = 30;
    @Builder.Default private Integer maxTenorDays = 3650;
    @Column(nullable = false, length = 20) @Builder.Default private String rateStructure = "FIXED";
    private BigDecimal baseRate;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> rateTiers;
    private String benchmarkReference;
    private BigDecimal spreadOverBenchmark;
    @Builder.Default private Boolean autoRolloverEnabled = false;
    private Integer rolloverTenorDays;
    @Builder.Default private String rolloverRateType = "PREVAILING";
    @Builder.Default private String maturityInstruction = "CREDIT_ACCOUNT";
    @Builder.Default private Boolean earlyWithdrawalAllowed = false;
    private BigDecimal earlyWithdrawalPenaltyPct;
    @Builder.Default private Boolean partialWithdrawalAllowed = false;
    private BigDecimal partialWithdrawalMin;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    @Column(nullable = false) private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private String approvedBy;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
