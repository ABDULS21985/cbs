package com.cbs.maadvisory.entity;

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
@Table(name = "ma_engagement", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MaEngagement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "engagement_code", nullable = false, unique = true, length = 30)
    private String engagementCode;

    @Column(name = "engagement_name", nullable = false, length = 300)
    private String engagementName;

    @Column(name = "engagement_type", nullable = false, length = 20)
    private String engagementType;

    @Column(name = "client_name", nullable = false, length = 200)
    private String clientName;

    @Column(name = "client_customer_id")
    private Long clientCustomerId;

    @Column(name = "client_sector", length = 40)
    private String clientSector;

    @Column(name = "target_name", length = 200)
    private String targetName;

    @Column(name = "target_sector", length = 40)
    private String targetSector;

    @Column(name = "target_country", length = 3)
    private String targetCountry;

    @Column(name = "transaction_currency", length = 3)
    @Builder.Default
    private String transactionCurrency = "USD";

    @Column(name = "estimated_deal_value", precision = 20, scale = 4)
    private BigDecimal estimatedDealValue;

    @Column(name = "actual_deal_value", precision = 20, scale = 4)
    private BigDecimal actualDealValue;

    @Column(name = "deal_structure", length = 20)
    private String dealStructure;

    @Column(name = "our_role", nullable = false, length = 25)
    private String ourRole;

    @Column(name = "lead_banker", length = 200)
    private String leadBanker;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "team_members")
    private Map<String, Object> teamMembers;

    @Column(name = "retainer_fee", precision = 15, scale = 4)
    private BigDecimal retainerFee;

    @Column(name = "retainer_frequency", length = 10)
    private String retainerFrequency;

    @Column(name = "success_fee_pct", precision = 5, scale = 4)
    private BigDecimal successFeePct;

    @Column(name = "success_fee_min", precision = 15, scale = 4)
    private BigDecimal successFeeMin;

    @Column(name = "success_fee_cap", precision = 15, scale = 4)
    private BigDecimal successFeeCap;

    @Column(name = "expense_reimbursement")
    @Builder.Default
    private Boolean expenseReimbursement = true;

    @Column(name = "total_fees_earned", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal totalFeesEarned = BigDecimal.ZERO;

    @Column(name = "mandate_date")
    private LocalDate mandateDate;

    @Column(name = "information_memo_date")
    private LocalDate informationMemoDate;

    @Column(name = "data_room_open_date")
    private LocalDate dataRoomOpenDate;

    @Column(name = "indicative_bid_deadline")
    private LocalDate indicativeBidDeadline;

    @Column(name = "due_diligence_start")
    private LocalDate dueDiligenceStart;

    @Column(name = "due_diligence_end")
    private LocalDate dueDiligenceEnd;

    @Column(name = "binding_bid_deadline")
    private LocalDate bindingBidDeadline;

    @Column(name = "signing_date")
    private LocalDate signingDate;

    @Column(name = "regulatory_approval_date")
    private LocalDate regulatoryApprovalDate;

    @Column(name = "closing_date")
    private LocalDate closingDate;

    @Column(name = "competing_bidders")
    private Integer competingBidders;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "confidentiality_agreements")
    private Map<String, Object> confidentialityAgreements;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "regulatory_approvals")
    private Map<String, Object> regulatoryApprovals;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PITCHING";
}
