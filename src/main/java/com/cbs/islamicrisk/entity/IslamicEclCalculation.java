package com.cbs.islamicrisk.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "islamic_ecl_calculations", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicEclCalculation extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long versionLock;

    @Column(name = "calculation_ref", nullable = false, unique = true, length = 50)
    private String calculationRef;

    @Column(name = "calculation_date", nullable = false)
    private LocalDate calculationDate;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "contract_ref", nullable = false, length = 60)
    private String contractRef;

    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode;

    @Column(name = "config_id", nullable = false)
    private Long configId;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_stage", nullable = false, length = 20)
    private IslamicRiskDomainEnums.Stage currentStage;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_stage", length = 20)
    private IslamicRiskDomainEnums.Stage previousStage;

    @Column(name = "staging_reason", columnDefinition = "TEXT")
    private String stagingReason;

    @Column(name = "days_past_due")
    private Integer daysPastDue;

    @Column(name = "stage_changed", nullable = false)
    @Builder.Default
    private Boolean stageChanged = false;

    @Column(name = "pd_12_month", precision = 10, scale = 6)
    private BigDecimal pd12Month;

    @Column(name = "pd_lifetime", precision = 10, scale = 6)
    private BigDecimal pdLifetime;

    @Column(name = "applied_pd", precision = 10, scale = 6)
    private BigDecimal appliedPd;

    @Column(name = "lgd", precision = 10, scale = 6)
    private BigDecimal lgd;

    @Column(name = "ead", precision = 18, scale = 2)
    private BigDecimal ead;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ead_breakdown", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> eadBreakdown = new LinkedHashMap<>();

    @Column(name = "ecl_amount", precision = 18, scale = 2)
    private BigDecimal eclAmount;

    @Column(name = "ecl_amount_previous", precision = 18, scale = 2)
    private BigDecimal eclAmountPrevious;

    @Column(name = "ecl_change", precision = 18, scale = 2)
    private BigDecimal eclChange;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scenario_results", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> scenarioResults = new LinkedHashMap<>();

    @Column(name = "weighted_ecl", precision = 18, scale = 2)
    private BigDecimal weightedEcl;

    @Column(name = "collateral_value", precision = 18, scale = 2)
    private BigDecimal collateralValue;

    @Column(name = "collateral_haircut", precision = 10, scale = 6)
    private BigDecimal collateralHaircut;

    @Column(name = "collateral_adjusted_lgd", precision = 10, scale = 6)
    private BigDecimal collateralAdjustedLgd;

    @Column(name = "provision_journal_ref", length = 40)
    private String provisionJournalRef;

    @Column(name = "provision_amount", precision = 18, scale = 2)
    private BigDecimal provisionAmount;

    @Column(name = "provision_change", precision = 18, scale = 2)
    private BigDecimal provisionChange;

    @Column(name = "calculated_by", length = 100)
    private String calculatedBy;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
