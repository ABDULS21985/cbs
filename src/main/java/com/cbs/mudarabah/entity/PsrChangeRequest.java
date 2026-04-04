package com.cbs.mudarabah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "psr_change_request", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PsrChangeRequest extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mudarabah_account_id")
    private MudarabahAccount mudarabahAccount;

    @Column(name = "current_psr_customer", nullable = false, precision = 8, scale = 4)
    private BigDecimal currentPsrCustomer;

    @Column(name = "current_psr_bank", nullable = false, precision = 8, scale = 4)
    private BigDecimal currentPsrBank;

    @Column(name = "proposed_psr_customer", nullable = false, precision = 8, scale = 4)
    private BigDecimal proposedPsrCustomer;

    @Column(name = "proposed_psr_bank", nullable = false, precision = 8, scale = 4)
    private BigDecimal proposedPsrBank;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_reason", nullable = false)
    private PsrChangeReason changeReason;

    @Column(name = "reason_description", columnDefinition = "TEXT")
    private String reasonDescription;

    @Builder.Default
    @Column(name = "customer_consent_required")
    private boolean customerConsentRequired = true;

    @Builder.Default
    @Column(name = "customer_consent_given")
    private boolean customerConsentGiven = false;

    @Column(name = "customer_consent_date")
    private LocalDateTime customerConsentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_consent_method")
    private CustomerConsentMethod customerConsentMethod;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PsrChangeStatus status = PsrChangeStatus.DRAFT;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
