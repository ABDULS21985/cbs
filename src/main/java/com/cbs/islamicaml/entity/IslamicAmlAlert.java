package com.cbs.islamicaml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "islamic_aml_alert", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class IslamicAmlAlert extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_alert_id")
    private Long baseAlertId;

    @Column(name = "alert_ref", nullable = false, unique = true, length = 50)
    private String alertRef;

    @Column(name = "rule_id", nullable = false)
    private Long ruleId;

    @Column(name = "rule_code", length = 50)
    private String ruleCode;

    @Column(name = "detection_date")
    private LocalDateTime detectionDate;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "customer_name", length = 300)
    private String customerName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "islamic_context", columnDefinition = "jsonb")
    private Map<String, Object> islamicContext;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "involved_transactions", columnDefinition = "jsonb")
    private List<String> involvedTransactions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "involved_contracts", columnDefinition = "jsonb")
    private List<String> involvedContracts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "involved_accounts", columnDefinition = "jsonb")
    private List<String> involvedAccounts;

    @Column(name = "total_amount_involved", precision = 18, scale = 4)
    private BigDecimal totalAmountInvolved;

    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "risk_score", precision = 8, scale = 4)
    private BigDecimal riskScore;

    @Column(name = "assessment_notes", columnDefinition = "TEXT")
    private String assessmentNotes;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default private IslamicAmlAlertStatus status = IslamicAmlAlertStatus.NEW;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "investigated_by", length = 100)
    private String investigatedBy;

    @Column(name = "investigation_notes", columnDefinition = "TEXT")
    private String investigationNotes;

    @Column(name = "sar_filed", nullable = false)
    @Builder.Default private boolean sarFiled = false;

    @Column(name = "sar_reference", length = 100)
    private String sarReference;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closure_reason", columnDefinition = "TEXT")
    private String closureReason;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @Column(name = "sla_breach", nullable = false)
    @Builder.Default private boolean slaBreach = false;

    @Column(name = "tenant_id")
    private Long tenantId;
}
