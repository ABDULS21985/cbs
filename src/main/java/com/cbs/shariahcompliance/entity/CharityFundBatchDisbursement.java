package com.cbs.shariahcompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "charity_fund_batch_disbursements", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CharityFundBatchDisbursement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_ref", nullable = false, unique = true, length = 50)
    private String batchRef;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "disbursement_count", nullable = false)
    private Integer disbursementCount;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "allocation_method", nullable = false, length = 40)
    private String allocationMethod;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allocations", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<Map<String, Object>> allocations = new ArrayList<>();

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
