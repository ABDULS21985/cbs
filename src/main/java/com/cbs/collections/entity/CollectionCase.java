package com.cbs.collections.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import com.cbs.lending.entity.LoanAccount;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "collection_case", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CollectionCase extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", nullable = false, unique = true, length = 30)
    private String caseNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_account_id", nullable = false)
    private LoanAccount loanAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "assigned_team", length = 50)
    private String assignedTeam;

    @Column(name = "priority", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CollectionPriority priority = CollectionPriority.MEDIUM;

    @Column(name = "days_past_due", nullable = false)
    private Integer daysPastDue;

    @Column(name = "overdue_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal overdueAmount;

    @Column(name = "total_outstanding", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalOutstanding;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "delinquency_bucket", nullable = false, length = 10)
    private String delinquencyBucket;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CollectionCaseStatus status = CollectionCaseStatus.OPEN;

    @Column(name = "escalation_level", nullable = false)
    @Builder.Default
    private Integer escalationLevel = 0;

    @Column(name = "resolution_type", length = 30)
    private String resolutionType;

    @Column(name = "resolution_amount", precision = 18, scale = 2)
    private BigDecimal resolutionAmount;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @OneToMany(mappedBy = "collectionCase", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CollectionAction> actions = new ArrayList<>();

    public void addAction(CollectionAction action) {
        actions.add(action);
        action.setCollectionCase(this);
    }

    public void escalate() {
        this.escalationLevel++;
        if (this.escalationLevel >= 3) {
            this.status = CollectionCaseStatus.LEGAL;
        } else {
            this.status = CollectionCaseStatus.ESCALATED;
        }
    }
}
