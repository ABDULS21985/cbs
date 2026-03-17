package com.cbs.credit.entity;

import com.cbs.customer.entity.Customer;
import com.cbs.lending.entity.LoanApplication;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "credit_decision_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreditDecisionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private LoanApplication application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "model_code", nullable = false, length = 30)
    private String modelCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_data", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> inputData;

    @Column(name = "score")
    private Integer score;

    @Column(name = "risk_grade", length = 10)
    private String riskGrade;

    @Column(name = "decision", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CreditDecision decision;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "decision_reasons", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> decisionReasons = new ArrayList<>();

    @Column(name = "recommended_amount", precision = 18, scale = 2)
    private BigDecimal recommendedAmount;

    @Column(name = "recommended_rate", precision = 8, scale = 4)
    private BigDecimal recommendedRate;

    @Column(name = "recommended_tenure")
    private Integer recommendedTenure;

    @Column(name = "was_overridden", nullable = false)
    @Builder.Default
    private Boolean wasOverridden = false;

    @Column(name = "override_decision", length = 20)
    private String overrideDecision;

    @Column(name = "override_by", length = 100)
    private String overrideBy;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;

    @Column(name = "executed_at", nullable = false)
    @Builder.Default
    private Instant executedAt = Instant.now();

    @Column(name = "execution_time_ms")
    private Integer executionTimeMs;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
