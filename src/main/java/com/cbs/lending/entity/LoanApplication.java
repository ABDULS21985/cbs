package com.cbs.lending.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "loan_application", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LoanApplication extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_number", nullable = false, unique = true, length = 30)
    private String applicationNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_product_id", nullable = false)
    private LoanProduct loanProduct;

    @Column(name = "requested_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "approved_amount", precision = 18, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "requested_tenure_months", nullable = false)
    private Integer requestedTenureMonths;

    @Column(name = "approved_tenure_months")
    private Integer approvedTenureMonths;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "proposed_rate", precision = 8, scale = 4)
    private BigDecimal proposedRate;

    @Column(name = "approved_rate", precision = 8, scale = 4)
    private BigDecimal approvedRate;

    @Column(name = "rate_type", length = 20)
    @Builder.Default
    private String rateType = "FIXED";

    @Column(name = "repayment_schedule_type", length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RepaymentScheduleType repaymentScheduleType = RepaymentScheduleType.EQUAL_INSTALLMENT;

    @Column(name = "repayment_frequency", length = 20)
    @Builder.Default
    private String repaymentFrequency = "MONTHLY";

    // Islamic finance
    @Column(name = "is_islamic", nullable = false)
    @Builder.Default
    private Boolean isIslamic = false;

    @Column(name = "islamic_structure", length = 30)
    private String islamicStructure;

    @Column(name = "asset_description", columnDefinition = "TEXT")
    private String assetDescription;

    @Column(name = "asset_cost", precision = 18, scale = 2)
    private BigDecimal assetCost;

    @Column(name = "profit_rate", precision = 8, scale = 4)
    private BigDecimal profitRate;

    // Credit decisioning
    @Column(name = "credit_score")
    private Integer creditScore;

    @Column(name = "risk_grade", length = 10)
    private String riskGrade;

    @Column(name = "debt_to_income_ratio", precision = 5, scale = 2)
    private BigDecimal debtToIncomeRatio;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "decision_engine_result", columnDefinition = "jsonb")
    private Map<String, Object> decisionEngineResult;

    // Workflow
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LoanApplicationStatus status = LoanApplicationStatus.DRAFT;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "decline_reason", columnDefinition = "TEXT")
    private String declineReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conditions", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> conditions = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disbursement_account_id")
    private Account disbursementAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repayment_account_id")
    private Account repaymentAccount;
}
