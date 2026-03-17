package com.cbs.aml.entity;

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
}
