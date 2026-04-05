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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "islamic_collateral_extensions", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicCollateralExtension extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_collateral_id", nullable = false, unique = true)
    private Long baseCollateralId;

    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "contract_type_code", length = 30)
    private String contractTypeCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "shariah_permissibility", nullable = false, length = 30)
    private IslamicRiskDomainEnums.ShariahPermissibility shariahPermissibility;

    @Column(name = "shariah_classification_reason", columnDefinition = "TEXT")
    private String shariahClassificationReason;

    @Column(name = "shariah_screened", nullable = false)
    @Builder.Default
    private Boolean shariahScreened = false;

    @Column(name = "shariah_screened_by", length = 100)
    private String shariahScreenedBy;

    @Column(name = "shariah_screened_at")
    private LocalDateTime shariahScreenedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "islamic_collateral_type", nullable = false, length = 40)
    private IslamicRiskDomainEnums.IslamicCollateralType islamicCollateralType;

    @Column(name = "issuer_name", length = 255)
    private String issuerName;

    @Column(name = "underlying_asset_screened", nullable = false)
    @Builder.Default
    private Boolean underlyingAssetScreened = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "underlying_screening_result", length = 20)
    private IslamicRiskDomainEnums.UnderlyingScreeningResult underlyingScreeningResult;

    @Column(name = "underlying_screening_date")
    private LocalDate underlyingScreeningDate;

    @Column(name = "last_valuation_date")
    private LocalDate lastValuationDate;

    @Column(name = "last_valuation_amount", precision = 18, scale = 2)
    private BigDecimal lastValuationAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "valuation_method", length = 30)
    private IslamicRiskDomainEnums.IslamicCollateralValuationMethod valuationMethod;

    @Column(name = "appraiser_name", length = 200)
    private String appraiserName;

    @Column(name = "shariah_compliant_appraiser", nullable = false)
    @Builder.Default
    private Boolean shariahCompliantAppraiser = false;

    @Column(name = "haircut_percentage", precision = 10, scale = 6)
    private BigDecimal haircutPercentage;

    @Column(name = "net_collateral_value", precision = 18, scale = 2)
    private BigDecimal netCollateralValue;

    @Column(name = "next_valuation_due_date")
    private LocalDate nextValuationDueDate;

    @Column(name = "lien_created_date")
    private LocalDate lienCreatedDate;

    @Column(name = "lien_registered_with", length = 120)
    private String lienRegisteredWith;

    @Column(name = "lien_registration_ref", length = 120)
    private String lienRegistrationRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "lien_priority", length = 20)
    private IslamicRiskDomainEnums.LienPriority lienPriority;

    @Column(name = "takaful_required", nullable = false)
    @Builder.Default
    private Boolean takafulRequired = false;

    @Column(name = "takaful_policy_ref", length = 120)
    private String takafulPolicyRef;

    @Column(name = "takaful_provider", length = 200)
    private String takafulProvider;

    @Column(name = "takaful_coverage_amount", precision = 18, scale = 2)
    private BigDecimal takafulCoverageAmount;

    @Column(name = "takaful_expiry_date")
    private LocalDate takafulExpiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IslamicRiskDomainEnums.IslamicCollateralStatus status;

    @Column(name = "tenant_id")
    private Long tenantId;
}
