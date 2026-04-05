package com.cbs.qard.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "qard_hasan_account", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QardHasanAccount extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false, unique = true)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "qard_type", nullable = false, length = 20)
    private QardDomainEnums.QardType qardType;

    @Column(name = "contract_reference", nullable = false, unique = true, length = 50)
    private String contractReference;

    @Column(name = "contract_signed_date")
    private LocalDate contractSignedDate;

    @Column(name = "islamic_product_template_id")
    private Long islamicProductTemplateId;

    @Builder.Default
    @Column(name = "contract_type_code", nullable = false, length = 30)
    private String contractTypeCode = "QARD";

    @Builder.Default
    @Column(name = "principal_guaranteed", nullable = false)
    private Boolean principalGuaranteed = true;

    @Builder.Default
    @Column(name = "no_return_disclosed", nullable = false)
    private Boolean noReturnDisclosed = true;

    @Column(name = "principal_amount", precision = 18, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "outstanding_principal", precision = 18, scale = 2)
    private BigDecimal outstandingPrincipal;

    @Column(name = "disbursement_date")
    private LocalDate disbursementDate;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "repayment_frequency", length = 20)
    private QardDomainEnums.RepaymentFrequency repaymentFrequency;

    @Column(name = "installment_amount", precision = 18, scale = 2)
    private BigDecimal installmentAmount;

    @Column(name = "total_installments")
    private Integer totalInstallments;

    @Builder.Default
    @Column(name = "completed_installments", nullable = false)
    private Integer completedInstallments = 0;

    @Builder.Default
    @Column(name = "missed_installments", nullable = false)
    private Integer missedInstallments = 0;

    @Builder.Default
    @Column(name = "admin_fee_charged", nullable = false)
    private Boolean adminFeeCharged = false;

    @Column(name = "admin_fee_amount", precision = 18, scale = 2)
    private BigDecimal adminFeeAmount;

    @Column(name = "admin_fee_justification", columnDefinition = "TEXT")
    private String adminFeeJustification;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", length = 30)
    private QardDomainEnums.Purpose purpose;

    @Column(name = "purpose_description", columnDefinition = "TEXT")
    private String purposeDescription;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "qard_status", nullable = false, length = 20)
    private QardDomainEnums.QardStatus qardStatus = QardDomainEnums.QardStatus.ACTIVE;

    @Column(name = "last_repayment_date")
    private LocalDate lastRepaymentDate;

    @Column(name = "last_repayment_amount", precision = 18, scale = 2)
    private BigDecimal lastRepaymentAmount;

    @Column(name = "settlement_account_id")
    private Long settlementAccountId;

    @Column(name = "tenant_id")
    private Long tenantId;
}
