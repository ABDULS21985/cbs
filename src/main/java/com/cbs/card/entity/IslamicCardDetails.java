package com.cbs.card.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.wadiah.entity.WadiahAccount;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "islamic_card", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicCardDetails extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false, unique = true)
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "islamic_card_product_id", nullable = false)
    private IslamicCardProduct product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restriction_profile_id")
    private IslamicCardProfile restrictionProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, length = 20)
    private IslamicCardContractType contractType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wadiah_account_id")
    private WadiahAccount wadiahAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mudarabah_account_id")
    private MudarabahAccount mudarabahAccount;

    @Column(name = "shariah_compliant", nullable = false)
    @Builder.Default
    private Boolean shariahCompliant = true;

    @Column(name = "last_screening_ref", length = 40)
    private String lastScreeningRef;

    @Column(name = "issued_fee_journal_ref", length = 50)
    private String issuedFeeJournalRef;

    @Column(name = "issued_fee_charge_log_id")
    private Long issuedFeeChargeLogId;

    @Column(name = "settlement_gl_code", nullable = false, length = 20)
    private String settlementGlCode;

    @Column(name = "fee_gl_code", length = 20)
    private String feeGlCode;

    @Column(name = "tenant_id")
    private Long tenantId;

    public IslamicCardProfile getEffectiveRestrictionProfile() {
        return restrictionProfile != null ? restrictionProfile
                : product != null ? product.getRestrictionProfile() : null;
    }

    public String getContractReference() {
        if (wadiahAccount != null) {
            return wadiahAccount.getContractReference();
        }
        return mudarabahAccount != null ? mudarabahAccount.getContractReference() : null;
    }

    public String getContractTypeCode() {
        if (wadiahAccount != null) {
            return wadiahAccount.getContractTypeCode();
        }
        return mudarabahAccount != null ? mudarabahAccount.getContractTypeCode() : contractType.name();
    }
}