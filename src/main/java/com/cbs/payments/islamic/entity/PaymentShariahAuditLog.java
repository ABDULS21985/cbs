package com.cbs.payments.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "payment_shariah_audit_log", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentShariahAuditLog extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false, unique = true)
    private Long paymentId;

    @Column(name = "payment_ref", nullable = false, length = 40)
    private String paymentRef;

    @Column(name = "screening_timestamp", nullable = false)
    private LocalDateTime screeningTimestamp;

    @Column(name = "screening_duration_ms", nullable = false)
    private long screeningDurationMs;

    @Column(name = "source_account_number", length = 34)
    private String sourceAccountNumber;

    @Column(name = "destination_account_number", length = 34)
    private String destinationAccountNumber;

    @Column(name = "beneficiary_name", length = 200)
    private String beneficiaryName;

    @Column(name = "beneficiary_bank_swift", length = 20)
    private String beneficiaryBankSwift;

    @Column(name = "mcc_code", length = 10)
    private String mccCode;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "payment_channel", nullable = false, length = 20)
    private String paymentChannel;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_result", nullable = false, length = 20)
    private IslamicPaymentDomainEnums.PaymentScreeningResult overallResult;

    @Column(name = "rules_checked", nullable = false)
    private int rulesChecked;

    @Column(name = "rules_failed", nullable = false)
    private int rulesFailed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "failed_rule_codes", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> failedRuleCodes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "failed_rule_descriptions", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> failedRuleDescriptions = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "action_taken", nullable = false, length = 30)
    private IslamicPaymentDomainEnums.AuditActionTaken actionTaken;

    @Column(name = "alert_generated", nullable = false)
    private boolean alertGenerated;

    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "tenant_id")
    private Long tenantId;

    public String getRecommendedAction() {
        if (actionTaken == null) {
            return null;
        }
        return switch (actionTaken) {
            case BLOCKED -> "BLOCK";
            case ALLOWED_WITH_ALERT, MANUAL_OVERRIDE -> "REVIEW";
            case ALLOWED -> "ALLOW";
        };
    }

    public Boolean getOverrideApplied() {
        return actionTaken == IslamicPaymentDomainEnums.AuditActionTaken.MANUAL_OVERRIDE;
    }
}
