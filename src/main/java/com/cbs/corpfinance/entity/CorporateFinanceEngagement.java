package com.cbs.corpfinance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Entity
@Table(name = "corporate_finance_engagement", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CorporateFinanceEngagement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "engagement_code", nullable = false, unique = true, length = 30)
    private String engagementCode;

    @Column(name = "engagement_name", nullable = false, length = 300)
    private String engagementName;

    @Column(name = "engagement_type", nullable = false, length = 25)
    private String engagementType;

    @Column(name = "client_name", nullable = false, length = 200)
    private String clientName;

    @Column(name = "client_customer_id")
    private Long clientCustomerId;

    @Column(name = "client_sector", length = 40)
    private String clientSector;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "deal_value_estimate", precision = 20, scale = 4)
    private BigDecimal dealValueEstimate;

    @Column(name = "our_role", nullable = false, length = 20)
    private String ourRole;

    @Column(name = "lead_banker", length = 200)
    private String leadBanker;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "team_members")
    private Map<String, Object> teamMembers;

    @Column(name = "scope_of_work", columnDefinition = "TEXT")
    private String scopeOfWork;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_assumptions")
    private Map<String, Object> keyAssumptions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "deliverables")
    private Map<String, Object> deliverables;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "financial_model")
    private Map<String, Object> financialModel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "valuation_range")
    private Map<String, Object> valuationRange;

    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations;

    @Column(name = "retainer_fee", precision = 15, scale = 4)
    private BigDecimal retainerFee;

    @Column(name = "success_fee", precision = 15, scale = 4)
    private BigDecimal successFee;

    @Column(name = "total_fees_invoiced", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal totalFeesInvoiced = BigDecimal.ZERO;

    @Column(name = "total_fees_paid", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal totalFeesPaid = BigDecimal.ZERO;

    @Column(name = "mandate_date")
    private LocalDate mandateDate;

    @Column(name = "kickoff_date")
    private LocalDate kickoffDate;

    @Column(name = "draft_delivery_date")
    private LocalDate draftDeliveryDate;

    @Column(name = "final_delivery_date")
    private LocalDate finalDeliveryDate;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linked_deals")
    private Map<String, Object> linkedDeals;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "PROPOSAL";
}
