package com.cbs.fees.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "special_pricing_agreement", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SpecialPricingAgreement extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agreement_code", nullable = false, unique = true, length = 30)
    private String agreementCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "agreement_type", length = 25)
    private String agreementType;

    @Column(name = "negotiated_by")
    private String negotiatedBy;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approval_level")
    private String approvalLevel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fee_overrides", columnDefinition = "jsonb")
    private Map<String, Object> feeOverrides;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rate_overrides", columnDefinition = "jsonb")
    private Map<String, Object> rateOverrides;

    @Column(name = "fx_margin_override", precision = 8, scale = 4)
    private BigDecimal fxMarginOverride;

    @Column(name = "free_transaction_allowance")
    private Integer freeTransactionAllowance;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "waived_fees", columnDefinition = "jsonb")
    private List<String> waivedFees;

    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "review_frequency")
    private String reviewFrequency;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "relationship_value_at_approval", precision = 18, scale = 2)
    private BigDecimal relationshipValueAtApproval;

    @Column(name = "current_relationship_value", precision = 18, scale = 2)
    private BigDecimal currentRelationshipValue;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";
}
