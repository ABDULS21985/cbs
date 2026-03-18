package com.cbs.fundmgmt.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "managed_fund")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ManagedFund extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String fundCode;

    @Column(nullable = false, length = 200)
    private String fundName;

    @Column(nullable = false, length = 20)
    private String fundType;

    @Column(nullable = false, length = 200)
    private String fundManager;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Builder.Default
    private BigDecimal navPerUnit = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalUnitsOutstanding = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalAum = BigDecimal.ZERO;

    private LocalDate navDate;

    @Column(name = "return_1m_pct")
    private BigDecimal return1mPct;

    @Column(name = "return_3m_pct")
    private BigDecimal return3mPct;

    @Column(name = "return_6m_pct")
    private BigDecimal return6mPct;

    @Column(name = "return_1y_pct")
    private BigDecimal return1yPct;

    @Column(name = "return_3y_annualized")
    private BigDecimal return3yAnnualized;

    private BigDecimal returnSinceInception;

    @Column(length = 40)
    private String benchmarkCode;

    private BigDecimal managementFeePct;
    private BigDecimal entryLoadPct;
    private BigDecimal exitLoadPct;
    private BigDecimal expenseRatioPct;
    private BigDecimal standardDeviation;
    private BigDecimal sharpeRatio;
    private BigDecimal beta;

    private Integer riskRating;
    private Integer morningstarRating;

    @Builder.Default
    private Boolean isShariaCompliant = false;

    private BigDecimal minInvestment;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";

    private LocalDate launchDate;
}
