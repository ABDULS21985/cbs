package com.cbs.card.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "islamic_card_product", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicCardProduct extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_code", nullable = false, unique = true, length = 40)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 120)
    private String productName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, length = 20)
    private IslamicCardContractType contractType;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_scheme", nullable = false, length = 20)
    private CardScheme cardScheme;

    @Column(name = "card_tier", nullable = false, length = 20)
    @Builder.Default
    private String cardTier = "CLASSIC";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restriction_profile_id")
    private IslamicCardProfile restrictionProfile;

    @Column(name = "settlement_gl_code", nullable = false, length = 20)
    private String settlementGlCode;

    @Column(name = "fee_gl_code", length = 20)
    private String feeGlCode;

    @Column(name = "issuance_fee_code", length = 30)
    private String issuanceFeeCode;

    @Column(name = "replacement_fee_code", length = 30)
    private String replacementFeeCode;

    @Column(name = "allow_atm", nullable = false)
    @Builder.Default
    private Boolean allowAtm = true;

    @Column(name = "allow_pos", nullable = false)
    @Builder.Default
    private Boolean allowPos = true;

    @Column(name = "allow_online", nullable = false)
    @Builder.Default
    private Boolean allowOnline = true;

    @Column(name = "allow_international", nullable = false)
    @Builder.Default
    private Boolean allowInternational = false;

    @Column(name = "allow_contactless", nullable = false)
    @Builder.Default
    private Boolean allowContactless = true;

    @Column(name = "require_verified_kyc", nullable = false)
    @Builder.Default
    private Boolean requireVerifiedKyc = true;

    @Column(name = "allow_overdraft", nullable = false)
    @Builder.Default
    private Boolean allowOverdraft = false;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "tenant_id")
    private Long tenantId;
}