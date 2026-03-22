package com.cbs.aml.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "aml_alert", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AmlAlert extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alert_ref", nullable = false, unique = true, length = 30)
    private String alertRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private AmlRule rule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "alert_type", nullable = false, length = 30)
    private String alertType;

    @Column(name = "severity", nullable = false, length = 10)
    private String severity;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "trigger_amount", precision = 18, scale = 2)
    private BigDecimal triggerAmount;

    @Column(name = "trigger_count")
    private Integer triggerCount;

    @Column(name = "trigger_period", length = 50)
    private String triggerPeriod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trigger_transactions", columnDefinition = "jsonb")
    @Builder.Default private List<String> triggerTransactions = new ArrayList<>();

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default private AmlAlertStatus status = AmlAlertStatus.NEW;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "priority", nullable = false, length = 10)
    @Builder.Default private String priority = "MEDIUM";

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "sar_reference", length = 50)
    private String sarReference;

    @Column(name = "sar_filed_date")
    private LocalDate sarFiledDate;

    // ── Virtual JSON fields — expose flat values the frontend expects ──────────

    @JsonProperty("ruleId")
    public Long getRuleId() { return rule != null ? rule.getId() : null; }

    @JsonProperty("ruleName")
    public String getRuleName() { return rule != null ? rule.getRuleName() : null; }

    @JsonProperty("ruleCategory")
    public String getRuleCategory() { return rule != null ? rule.getRuleCategory() != null ? rule.getRuleCategory().name() : null : null; }

    @JsonProperty("customerId")
    public Long getCustomerIdVirtual() { return customer != null ? customer.getId() : null; }

    @JsonProperty("customerName")
    public String getCustomerName() {
        if (customer == null) return null;
        String fn = customer.getFirstName();
        String ln = customer.getLastName();
        if (fn != null && ln != null) return fn + " " + ln;
        if (fn != null) return fn;
        return customer.getDisplayName();
    }

    @JsonProperty("accountId")
    public Long getAccountIdVirtual() { return account != null ? account.getId() : null; }
}
