package com.cbs.taxadvisory.entity;

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
@Table(name = "tax_advisory_engagement", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class TaxAdvisoryEngagement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "engagement_code", nullable = false, unique = true, length = 30)
    private String engagementCode;

    @Column(name = "engagement_name", nullable = false, length = 200)
    private String engagementName;

    @Column(name = "engagement_type", nullable = false, length = 25)
    private String engagementType;

    @Column(name = "client_name", nullable = false, length = 200)
    private String clientName;

    @Column(name = "client_customer_id")
    private Long clientCustomerId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "jurisdictions")
    private Map<String, Object> jurisdictions;

    @Column(name = "tax_authority", length = 60)
    private String taxAuthority;

    @Column(name = "lead_advisor", length = 200)
    private String leadAdvisor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "team_members")
    private Map<String, Object> teamMembers;

    @Column(name = "scope_description", columnDefinition = "TEXT")
    private String scopeDescription;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_issues")
    private Map<String, Object> keyIssues;

    @Column(name = "tax_exposure_estimate", precision = 20, scale = 4)
    private BigDecimal taxExposureEstimate;

    @Column(name = "tax_savings_identified", precision = 20, scale = 4)
    private BigDecimal taxSavingsIdentified;

    @Column(name = "advisory_fee", precision = 15, scale = 4)
    private BigDecimal advisoryFee;

    @Column(name = "fee_basis", length = 15)
    private String feeBasis;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "deliverables")
    private Map<String, Object> deliverables;

    @Column(name = "opinion", columnDefinition = "TEXT")
    private String opinion;

    @Column(name = "risk_rating", length = 10)
    private String riskRating;

    @Column(name = "disclaimers", columnDefinition = "TEXT")
    private String disclaimers;

    @Column(name = "engagement_start_date")
    private LocalDate engagementStartDate;

    @Column(name = "engagement_end_date")
    private LocalDate engagementEndDate;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "PROPOSAL";
}
