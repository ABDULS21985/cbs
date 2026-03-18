package com.cbs.finstatement.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "financial_statement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FinancialStatement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String statementCode;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 20)
    private String statementType;

    @Column(nullable = false, length = 10)
    private String reportingPeriod;

    @Column(nullable = false)
    private LocalDate periodStartDate;

    @Column(nullable = false)
    private LocalDate periodEndDate;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    private BigDecimal totalAssets;
    private BigDecimal totalLiabilities;
    private BigDecimal totalEquity;
    private BigDecimal currentAssets;
    private BigDecimal currentLiabilities;
    private BigDecimal totalRevenue;
    private BigDecimal costOfRevenue;
    private BigDecimal grossProfit;
    private BigDecimal operatingIncome;
    private BigDecimal netIncome;
    private BigDecimal ebitda;
    private BigDecimal operatingCashFlow;
    private BigDecimal investingCashFlow;
    private BigDecimal financingCashFlow;
    private BigDecimal netCashFlow;

    @Column(length = 200)
    private String auditorName;

    @Column(length = 20)
    private String auditOpinion;

    @Column(length = 200)
    private String sourceDocumentRef;

    private String notes;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";
}
