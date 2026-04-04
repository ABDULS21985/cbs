package com.cbs.profitdistribution.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pool_asset_assignment", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PoolAssetAssignment extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pool_id", nullable = false)
    private Long poolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false, length = 40)
    private AssetType assetType;

    @Column(name = "asset_reference_id")
    private Long assetReferenceId;

    @Column(name = "asset_reference_code", length = 100)
    private String assetReferenceCode;

    @Column(name = "asset_description", length = 500)
    private String assetDescription;

    @Column(name = "assigned_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal assignedAmount;

    @Column(name = "current_outstanding", nullable = false, precision = 18, scale = 2)
    private BigDecimal currentOutstanding;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "assigned_date", nullable = false)
    private LocalDate assignedDate;

    @Column(name = "unassigned_date")
    private LocalDate unassignedDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 20)
    private AssignmentStatus assignmentStatus = AssignmentStatus.ACTIVE;

    @Column(name = "expected_return_rate", precision = 8, scale = 4)
    private BigDecimal expectedReturnRate;

    @Column(name = "risk_weight", precision = 8, scale = 4)
    private BigDecimal riskWeight;

    @Column(name = "contract_type_code", length = 30)
    private String contractTypeCode;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "last_income_date")
    private LocalDate lastIncomeDate;

    @Column(name = "tenant_id")
    private Long tenantId;
}
