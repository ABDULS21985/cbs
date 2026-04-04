package com.cbs.shariahcompliance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "shariah_screening_result", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShariahScreeningResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "screening_ref", nullable = false, unique = true, length = 50)
    private String screeningRef;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "transaction_type", length = 50)
    private String transactionType;

    @Column(name = "transaction_amount", precision = 18, scale = 4)
    private BigDecimal transactionAmount;

    @Column(name = "transaction_currency", length = 3)
    private String transactionCurrency;

    @Column(name = "contract_ref", length = 100)
    private String contractRef;

    @Column(name = "contract_type_code", length = 30)
    private String contractTypeCode;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "counterparty_name", length = 200)
    private String counterpartyName;

    @Column(name = "merchant_category_code", length = 10)
    private String merchantCategoryCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_result", nullable = false, length = 20)
    private ScreeningOverallResult overallResult;

    @Column(name = "rules_evaluated")
    private int rulesEvaluated;

    @Column(name = "rules_passed")
    private int rulesPassed;

    @Column(name = "rules_failed")
    private int rulesFailed;

    @Column(name = "rules_alerted")
    private int rulesAlerted;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule_results", columnDefinition = "jsonb")
    private List<Map<String, Object>> ruleResults;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_taken", length = 30)
    private ScreeningActionTaken actionTaken;

    @Column(name = "block_reason", columnDefinition = "TEXT")
    private String blockReason;

    @Column(name = "block_reason_ar", columnDefinition = "TEXT")
    private String blockReasonAr;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "screened_at")
    private LocalDateTime screenedAt;

    @Column(name = "screened_by", length = 100)
    private String screenedBy;

    @Column(name = "processing_time_ms")
    private long processingTimeMs;

    @Column(name = "tenant_id")
    private Long tenantId;
}
