package com.cbs.gl.islamic.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "islamic_posting_rule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicPostingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code", nullable = false, length = 40)
    private String ruleCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 40)
    private IslamicTransactionType transactionType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "entries", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<PostingRuleEntry> entries = new ArrayList<>();

    @Column(name = "condition_expression", columnDefinition = "TEXT")
    private String conditionExpression;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 100;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "aaoifi_reference", length = 120)
    private String aaoifiReference;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rule_version", nullable = false)
    @Builder.Default
    private Integer ruleVersion = 1;

    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
